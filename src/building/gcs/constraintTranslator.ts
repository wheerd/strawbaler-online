import type { Constraint, SketchPoint } from '@salusoft89/planegcs'

import type { ConstraintInput, PerimeterCornerId, WallEntityId, WallId, WallNodeId } from '@/building/model'
import { isPerimeterCornerId, isPerimeterWallId, isWallNodeId } from '@/building/model'

// --- ID helpers ---

const BC_PREFIX = 'bc_'

export function nodeRefSidePointId(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_ref`
}

export function nodeNonRefSidePointForPrevWall(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_nonref_prev`
}

export function nodeNonRefSidePointForNextWall(cornerId: PerimeterCornerId): string {
  return `corner_${cornerId}_nonref_next`
}

export function wallNonRefSideProjectedPoint(wallId: WallId, side: 'start' | 'end'): string {
  return `${wallId}_${side}_proj`
}

export function wallRefLineId(wallId: WallId): string {
  return `wall_${wallId}_ref`
}

export function wallNonRefLineId(wallId: WallId): string {
  return `wall_${wallId}_nonref`
}

export function wallNodeRefPointId(nodeId: WallNodeId): string {
  return `wallnode_${nodeId}_ref`
}

export function wallEndpointPointId(wallId: WallId, endpoint: 'start' | 'end', side: 'ref' | 'nonref'): string {
  return `${wallId}_${endpoint}_${side}`
}

export function wallEntityPointId(entityId: WallEntityId, side: 'start' | 'center' | 'end'): string {
  return `${entityId}_${side}_ref`
}

export function wallEntityWidthConstraintId(entityId: WallEntityId): string {
  return `${entityId}_width`
}

export function wallEntityOnLineConstraintId(entityId: WallEntityId, side: 'start' | 'center' | 'end'): string {
  return `${entityId}_${side}_on_ref`
}

// --- Key derivation ---

function sortedPair(a: string, b: string): [string, string] {
  return a <= b ? [a, b] : [b, a]
}

/**
 * Derive a deterministic, deduplicated key for a building constraint.
 *
 * Symmetric pairs are sorted so that the same constraint expressed
 * with swapped arguments produces the same key. Certain constraint types
 * share a key prefix to prevent contradictory constraints (e.g. horizontal
 * and vertical on the same wall).
 */
export function buildingConstraintKey(constraint: ConstraintInput): string {
  switch (constraint.type) {
    case 'wallLength':
      return `wallLength_${constraint.wall}`
    case 'colinearCorner':
      return `colinearCorner_${constraint.corner}`
    case 'parallel': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `parallel_${a}_${b}`
    }
    case 'perpendicularCorner':
      return `perpendicularCorner_${constraint.corner}`
    case 'cornerAngle':
      return `cornerAngle_${constraint.corner}`
    case 'horizontalWall':
      return `hv_${constraint.wall}`
    case 'verticalWall':
      return `hv_${constraint.wall}`
    case 'wallEntityAbsolute':
      return `we_${constraint.entity}_${constraint.node}`
    case 'wallEntityRelative': {
      const [a, b] = sortedPair(constraint.entityA, constraint.entityB)
      return `we_${a}_${b}`
    }
    case 'lockedCorner':
      return `lockedCorner_${constraint.corner}`
    case 'wallNodePerpendicular': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wallNodePerpendicular_${constraint.node}_${a}_${b}`
    }
    case 'wallNodeColinear': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wallNodeColinear_${constraint.node}_${a}_${b}`
    }
    case 'wallNodeAngle': {
      const [a, b] = sortedPair(constraint.wallA, constraint.wallB)
      return `wallNodeAngle_${constraint.node}_${a}_${b}`
    }
    case 'wallNodePosition': {
      const [a, b] = sortedPair(constraint.node, constraint.reference)
      return `wallNodePosition_${constraint.perimeterWall}_${a}_${b}`
    }
  }
}

// --- Translation ---

export interface TranslationResult {
  constraints: Constraint[]
  points: SketchPoint[]
}

/**
 * Context needed to resolve entity relationships for constraint translation.
 */
export interface TranslationContext {
  /** Given a GCS line ID, return the ID of its first point (p1_id). */
  getLineStartPointId: (lineId: string) => string | undefined
  /** Given a wall ID, return the IDs of the start and end corners. */
  getWallCornerIds: (wallId: WallId) => { startCornerId: PerimeterCornerId; endCornerId: PerimeterCornerId } | undefined
  /** Given a corner ID, return the IDs of the adjacent walls. */
  getCornerAdjacentWallIds: (cornerId: PerimeterCornerId) => { previousWallId: WallId; nextWallId: WallId } | undefined
  /** Given a corner ID, return the reference side for the perimeter it belongs to. */
  getReferenceSide: (cornerId: PerimeterCornerId) => 'left' | 'right'
}

/**
 * Translate a building-model constraint into one or more planegcs constraints.
 *
 * Each planegcs constraint gets a deterministic ID based on the building
 * constraint key so they can be found and removed later.
 */
export function translateBuildingConstraint(
  constraint: ConstraintInput,
  key: string,
  context: TranslationContext
): TranslationResult {
  const prefix = `${BC_PREFIX}${key}`

  switch (constraint.type) {
    case 'wallLength': {
      const corners = context.getWallCornerIds(constraint.wall)
      if (!corners) return { constraints: [], points: [] }

      // Determine if constraint side matches perimeter's reference side
      const refConstraintSide = context.getReferenceSide(corners.startCornerId)
      const isRefSide = constraint.side === refConstraintSide

      return {
        constraints: [
          {
            id: prefix,
            type: 'p2p_distance',
            p1_id: isRefSide
              ? nodeRefSidePointId(corners.startCornerId)
              : nodeNonRefSidePointForNextWall(corners.startCornerId),
            p2_id: isRefSide
              ? nodeRefSidePointId(corners.endCornerId)
              : nodeNonRefSidePointForPrevWall(corners.endCornerId),
            distance: constraint.length,
            driving: true
          }
        ],
        points: []
      }
    }

    case 'colinearCorner': {
      // The middle point (the corner itself) must lie on the line defined by
      // the adjacent corners on the reference side.
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return { constraints: [], points: [] }
      const prevCorners = context.getWallCornerIds(adjWalls.previousWallId)
      const nextCorners = context.getWallCornerIds(adjWalls.nextWallId)
      if (!prevCorners || !nextCorners) return { constraints: [], points: [] }
      // Previous wall's start corner and next wall's end corner are the line endpoints.
      // The corner itself is the point that must be on the line.
      return {
        constraints: [
          {
            id: prefix,
            type: 'point_on_line_ppp',
            p_id: nodeRefSidePointId(constraint.corner),
            lp1_id: nodeRefSidePointId(prevCorners.startCornerId),
            lp2_id: nodeRefSidePointId(nextCorners.endCornerId),
            driving: true
          }
        ],
        points: []
      }
    }

    case 'parallel': {
      const constraints: Constraint[] = [
        {
          id: `${prefix}_par`,
          type: 'parallel',
          l1_id: wallRefLineId(constraint.wallA),
          l2_id: wallRefLineId(constraint.wallB),
          driving: true
        }
      ]

      if (constraint.distance != null) {
        const lineAId = wallRefLineId(constraint.wallA)
        const pointId = context.getLineStartPointId(lineAId)

        if (pointId) {
          constraints.push({
            id: `${prefix}_dist`,
            type: 'p2l_distance',
            p_id: pointId,
            l_id: wallRefLineId(constraint.wallB),
            distance: constraint.distance,
            driving: true
          })
        }
      }

      return { constraints, points: [] }
    }

    case 'perpendicularCorner': {
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return { constraints: [], points: [] }
      return {
        constraints: [
          {
            id: prefix,
            type: 'perpendicular_ll',
            l1_id: wallRefLineId(adjWalls.previousWallId),
            l2_id: wallRefLineId(adjWalls.nextWallId),
            driving: true
          }
        ],
        points: []
      }
    }

    case 'cornerAngle': {
      const adjWalls = context.getCornerAdjacentWallIds(constraint.corner)
      if (!adjWalls) return { constraints: [], points: [] }
      return {
        constraints: [
          {
            id: prefix,
            type: 'l2l_angle_ll',
            l1_id: wallRefLineId(adjWalls.previousWallId),
            l2_id: wallRefLineId(adjWalls.nextWallId),
            angle: constraint.angle,
            driving: true
          }
        ],
        points: []
      }
    }

    case 'horizontalWall': {
      return {
        constraints: [
          {
            id: prefix,
            type: 'horizontal_l',
            l_id: wallRefLineId(constraint.wall),
            driving: true
          }
        ],
        points: []
      }
    }

    case 'verticalWall': {
      return {
        constraints: [
          {
            id: prefix,
            type: 'vertical_l',
            l_id: wallRefLineId(constraint.wall),
            driving: true
          }
        ],
        points: []
      }
    }

    case 'wallEntityAbsolute': {
      const wall = context.getWallCornerIds(constraint.wall)
      if (!wall || !isPerimeterCornerId(constraint.node) || !isPerimeterWallId(constraint.wall))
        return { constraints: [], points: [] }

      const isRefSide = context.getReferenceSide(constraint.node) === constraint.side
      const entityPointId = wallEntityPointId(constraint.entity, constraint.entitySide)
      const nodePointId = isRefSide
        ? nodeRefSidePointId(constraint.node)
        : wallNonRefSideProjectedPoint(constraint.wall, constraint.node === wall.startCornerId ? 'start' : 'end')

      return {
        constraints: [
          {
            id: prefix,
            type: 'p2p_distance',
            p1_id: nodePointId,
            p2_id: entityPointId,
            distance: constraint.distance,
            driving: true
          }
        ],
        points: []
      }
    }

    case 'wallEntityRelative': {
      const wall = context.getWallCornerIds(constraint.wall)
      if (!wall) return { constraints: [], points: [] }

      const entityAPointId = wallEntityPointId(constraint.entityA, constraint.entityASide)
      const entityBPointId = wallEntityPointId(constraint.entityB, constraint.entityBSide)

      return {
        constraints: [
          {
            id: prefix,
            type: 'p2p_distance',
            p1_id: entityAPointId,
            p2_id: entityBPointId,
            distance: constraint.distance,
            driving: true
          }
        ],
        points: []
      }
    }

    case 'lockedCorner': {
      const cornerPointId = nodeRefSidePointId(constraint.corner)
      const lockPointId = `${prefix}_lockpoint`

      return {
        points: [
          {
            id: lockPointId,
            type: 'point',
            x: constraint.position[0],
            y: constraint.position[1],
            fixed: true
          }
        ],
        constraints: [
          {
            id: prefix,
            type: 'p2p_coincident',
            p1_id: cornerPointId,
            p2_id: lockPointId,
            driving: true
          }
        ]
      }
    }

    case 'wallNodePerpendicular':
    case 'wallNodeColinear':
    case 'wallNodeAngle':
    case 'wallNodePosition':
      // Intermediate wall/node primitives are registered by the intermediate
      // wall GCS geometry layer. Keep model constraints storable meanwhile.
      return { constraints: [], points: [] }
  }
}

/**
 * Get the IDs of all planegcs constraints that were translated from a
 * building constraint with the given key.
 */
export function translatedConstraintIds(key: string): string[] {
  return [`${BC_PREFIX}${key}`, `${BC_PREFIX}${key}_par`, `${BC_PREFIX}${key}_dist`]
}

/**
 * Get the IDs of all planegcs points that were created for a
 * building constraint with the given key.
 */
export function translatedPointIds(key: string): string[] {
  return [`${BC_PREFIX}${key}_lockpoint`]
}

// --- Validation helpers ---

/**
 * Extract all PerimeterCornerIds referenced by a building constraint.
 */
export function getReferencedCornerIds(constraint: ConstraintInput): PerimeterCornerId[] {
  switch (constraint.type) {
    case 'colinearCorner':
    case 'perpendicularCorner':
    case 'cornerAngle':
    case 'lockedCorner':
      return isPerimeterCornerId(constraint.corner) ? [constraint.corner] : []
    case 'wallEntityAbsolute':
      return isPerimeterCornerId(constraint.node) ? [constraint.node] : []
    case 'wallNodePosition':
      return isPerimeterCornerId(constraint.reference) ? [constraint.reference] : []
    default:
      return []
  }
}

/** Extract all intermediate wall-node IDs referenced by a building constraint. */
export function getReferencedWallNodeIds(constraint: ConstraintInput): WallNodeId[] {
  switch (constraint.type) {
    case 'wallNodePerpendicular':
    case 'wallNodeColinear':
    case 'wallNodeAngle':
      return [constraint.node]
    case 'wallNodePosition':
      return [constraint.node, ...(isWallNodeId(constraint.reference) ? [constraint.reference] : [])]
    default:
      return []
  }
}

/**
 * Extract all PerimeterWallIds referenced by a building constraint.
 */
export function getReferencedWallIds(constraint: ConstraintInput): WallId[] {
  switch (constraint.type) {
    case 'wallLength':
    case 'horizontalWall':
    case 'verticalWall':
    case 'wallEntityRelative':
    case 'wallEntityAbsolute':
      return [constraint.wall]
    case 'parallel':
    case 'wallNodePerpendicular':
    case 'wallNodeColinear':
    case 'wallNodeAngle': {
      return [constraint.wallA, constraint.wallB]
    }
    case 'wallNodePosition':
      return [constraint.perimeterWall]
    default:
      return []
  }
}

/**
 * Extract all WallEntityIds referenced by a building constraint.
 */
export function getReferencedWallEntityIds(constraint: ConstraintInput): WallEntityId[] {
  switch (constraint.type) {
    case 'wallEntityAbsolute':
      return [constraint.entity]
    case 'wallEntityRelative':
      return [constraint.entityA, constraint.entityB]
    default:
      return []
  }
}

export function getPointIds(constraint: Constraint) {
  const pids = []
  if ('p_id' in constraint) {
    pids.push(constraint.p_id)
  }
  if ('p1_id' in constraint) {
    pids.push(constraint.p1_id)
  }
  if ('p2_id' in constraint) {
    pids.push(constraint.p2_id)
  }
  if ('l1p1_id' in constraint) {
    pids.push(constraint.l1p1_id)
  }
  if ('l1p2_id' in constraint) {
    pids.push(constraint.l1p2_id)
  }
  if ('l2p1_id' in constraint) {
    pids.push(constraint.l2p1_id)
  }
  if ('l2p2_id' in constraint) {
    pids.push(constraint.l2p2_id)
  }
  if ('lp1_id' in constraint) {
    pids.push(constraint.lp1_id)
  }
  if ('lp2_id' in constraint) {
    pids.push(constraint.lp2_id)
  }
  return pids
}

export function getLineIds(constraint: Constraint) {
  const lineIds = []
  if ('l_id' in constraint) {
    lineIds.push(constraint.l_id)
  }
  if ('l1_id' in constraint) {
    lineIds.push(constraint.l1_id)
  }
  if ('l2_id' in constraint) {
    lineIds.push(constraint.l2_id)
  }
  return lineIds
}
