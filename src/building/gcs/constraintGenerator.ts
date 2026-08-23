import { type WallNodeIncident, getAdjacentWallNodePairs } from '@/building/gcs/wallNodePairs'
import type {
  ConstraintInput,
  IntermediateWallWithGeometry,
  PerimeterCornerWithGeometry,
  PerimeterReferenceSide,
  PerimeterWallWithGeometry,
  WallNodeWithGeometry
} from '@/building/model'
import type { IntermediateWallId, WallId } from '@/building/model/ids'
import type { Length, Vec2 } from '@/shared/geometry'
import { ZERO_VEC2, dotVec2, normVec2, scaleVec2, subVec2 } from '@/shared/geometry'

/**
 * Map a perimeter reference side to the constraint side used by building constraints.
 *
 * For clockwise perimeters: 'inside' → 'right', 'outside' → 'left'.
 */
export function referenceSideToConstraintSide(referenceSide: PerimeterReferenceSide): 'left' | 'right' {
  return referenceSide === 'inside' ? 'right' : 'left'
}

/**
 * Get the reference-side point for a corner.
 */
function getReferenceSidePoint(corner: PerimeterCornerWithGeometry, referenceSide: PerimeterReferenceSide): Vec2 {
  return referenceSide === 'inside' ? corner.insidePoint : corner.outsidePoint
}

/**
 * Get the reference-side length for a wall.
 */
function getReferenceSideLength(wall: PerimeterWallWithGeometry, referenceSide: PerimeterReferenceSide): Length {
  return referenceSide === 'inside' ? wall.insideLength : wall.outsideLength
}

/**
 * Generate building constraints for a preset (axis-aligned) perimeter.
 *
 * Produces:
 * - A lockedCorner constraint for the first corner (at origin)
 * - A wallLength constraint for every wall (using the reference-side length)
 * - Horizontal/vertical constraints for consecutive corner pairs where the
 *   reference-side points are exactly aligned on one axis
 *
 * No perpendicular constraints are generated because H/V constraints already
 * fully determine the angles for axis-aligned geometry.
 */
export function generatePresetConstraints(
  corners: PerimeterCornerWithGeometry[],
  walls: PerimeterWallWithGeometry[],
  referenceSide: PerimeterReferenceSide
): ConstraintInput[] {
  const side = referenceSideToConstraintSide(referenceSide)
  const constraints: ConstraintInput[] = []
  const n = corners.length

  // If there are no corners, we cannot generate any meaningful constraints
  if (n === 0) {
    return constraints
  }

  // Lock the corner whose reference-side point is closest to the origin
  let originCornerIndex = 0
  let minDistSq = Infinity
  for (let i = 0; i < n; i++) {
    const p = getReferenceSidePoint(corners[i], referenceSide)
    const distSq = p[0] * p[0] + p[1] * p[1]
    if (distSq < minDistSq) {
      minDistSq = distSq
      originCornerIndex = i
    }
  }

  constraints.push({
    type: 'lockedCorner',
    corner: corners[originCornerIndex].id,
    position: ZERO_VEC2
  })

  // Wall length constraint for each wall
  for (const wall of walls) {
    const length = getReferenceSideLength(wall, referenceSide)
    constraints.push({
      type: 'wallLength',
      side,
      wall: wall.id,
      length
    })
  }

  // Horizontal/vertical constraints for walls
  for (let i = 0; i < n; i++) {
    const cornerA = corners[i]
    const cornerB = corners[(i + 1) % n]
    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)

    // Exact equality check — preset geometry is precise
    if (pA[1] === pB[1]) {
      constraints.push({
        type: 'horizontalWall',
        wall: walls[i].id
      })
    } else if (pA[0] === pB[0]) {
      constraints.push({
        type: 'verticalWall',
        wall: walls[i].id
      })
    }
  }

  return constraints
}

/** Tolerance for "close enough" alignment checks in freeform mode (1mm). */
const ALIGNMENT_TOLERANCE = 1

/** Tolerance for perpendicularity check (dot product of directions). */
const PERPENDICULAR_DOT_TOLERANCE = 0.001

/** Threshold for colinearity check (dot product of consecutive normalized directions ≈ 1.0). */
const COLINEAR_DOT_THRESHOLD = 0.9999

/**
 * Generate building constraints for a freeform (user-drawn) perimeter.
 *
 * Produces:
 * - LockedCorner constraints for corners that were snapped to origin during drawing
 * - WallLength constraints for walls where the user typed a length override
 * - Horizontal/vertical constraints for walls whose reference-side endpoint
 *   points are aligned within a small tolerance
 * - Perpendicular constraints for corners where adjacent walls meet at ~90°,
 *   but only when both walls don't already have H/V constraints
 * - Colinear constraints for corners where the interior angle is ~180°
 *   (i.e. the corner is on the line between its neighbors)
 */
export function generateFreeformConstraints(
  corners: PerimeterCornerWithGeometry[],
  walls: PerimeterWallWithGeometry[],
  referenceSide: PerimeterReferenceSide,
  segmentLengthOverrides: (Length | null)[],
  originSnappedCornerIndices: number[] = []
): ConstraintInput[] {
  const side = referenceSideToConstraintSide(referenceSide)
  const constraints: ConstraintInput[] = []
  const n = corners.length

  // Track which wall indices have H/V constraints
  // (wall i goes from corners[i] to corners[(i+1)%n])
  const wallHasHV = new Set<number>()

  // --- LockedCorner constraints for origin-snapped corners ---
  for (const idx of originSnappedCornerIndices) {
    if (idx >= 0 && idx < n) {
      constraints.push({
        type: 'lockedCorner',
        corner: corners[idx].id,
        position: ZERO_VEC2
      })
    }
  }

  // --- WallLength constraints for overridden segments ---
  for (let i = 0; i < walls.length; i++) {
    const override = segmentLengthOverrides[i]
    if (override != null) {
      constraints.push({
        type: 'wallLength',
        side,
        wall: walls[i].id,
        length: override
      })
    }
  }

  // --- Horizontal/vertical constraints for aligned walls ---
  for (let i = 0; i < n; i++) {
    const cornerA = corners[i]
    const cornerB = corners[(i + 1) % n]
    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)

    const dy = Math.abs(pA[1] - pB[1])
    const dx = Math.abs(pA[0] - pB[0])

    if (dy < ALIGNMENT_TOLERANCE) {
      constraints.push({
        type: 'horizontalWall',
        wall: walls[i].id
      })
      wallHasHV.add(i)
    } else if (dx < ALIGNMENT_TOLERANCE) {
      constraints.push({
        type: 'verticalWall',
        wall: walls[i].id
      })
      wallHasHV.add(i)
    }
  }

  // --- Perpendicular constraints for corners between adjacent ~90° walls ---
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n
    const wallA = walls[i]
    const wallB = walls[nextIdx]

    // Skip if both walls already have H/V constraints
    if (wallHasHV.has(i) && wallHasHV.has(nextIdx)) {
      continue
    }

    const dot = Math.abs(dotVec2(wallA.direction, wallB.direction))
    if (dot < PERPENDICULAR_DOT_TOLERANCE) {
      // The corner between wallA and wallB is corners[(i+1)%n]
      constraints.push({
        type: 'perpendicularCorner',
        corner: corners[nextIdx].id
      })
    }
  }

  // --- Colinear constraints for ~180° interior angles ---
  for (let i = 0; i < n; i++) {
    const prevIdx = (i - 1 + n) % n
    const nextIdx = (i + 1) % n

    const cornerA = corners[prevIdx]
    const cornerB = corners[i]
    const cornerC = corners[nextIdx]

    const pA = getReferenceSidePoint(cornerA, referenceSide)
    const pB = getReferenceSidePoint(cornerB, referenceSide)
    const pC = getReferenceSidePoint(cornerC, referenceSide)

    const abDir = normVec2(subVec2(pB, pA))
    const bcDir = normVec2(subVec2(pC, pB))
    const dot = dotVec2(abDir, bcDir)

    if (dot >= COLINEAR_DOT_THRESHOLD) {
      // The middle corner (cornerB) is the one that should be colinear
      constraints.push({
        type: 'colinearCorner',
        corner: cornerB.id
      })
    }
  }

  return constraints
}

export function generateIntermediateWallConstraints(
  createdWalls: IntermediateWallWithGeometry[],
  allIntermediateWalls: IntermediateWallWithGeometry[],
  perimeterWalls: PerimeterWallWithGeometry[],
  nodes: WallNodeWithGeometry[],
  alignment: 'left' | 'right',
  lengthOverrides: ReadonlyMap<IntermediateWallId, Length | null>
): ConstraintInput[] {
  const constraints: ConstraintInput[] = []
  const createdWallIds = new Set<WallId>(createdWalls.map(wall => wall.id))
  const intermediateWallById = new Map(allIntermediateWalls.map(wall => [wall.id, wall]))
  const perimeterWallById = new Map(perimeterWalls.map(wall => [wall.id, wall]))

  for (const wall of createdWalls) {
    const length = lengthOverrides.get(wall.id)
    if (length != null) {
      constraints.push({ type: 'wallLength', wall: wall.id, side: alignment, length })
    }

    const dx = Math.abs(wall.direction[0])
    const dy = Math.abs(wall.direction[1])
    if (dy < ALIGNMENT_TOLERANCE) {
      constraints.push({ type: 'horizontalWall', wall: wall.id })
    } else if (dx < ALIGNMENT_TOLERANCE) {
      constraints.push({ type: 'verticalWall', wall: wall.id })
    }
  }

  for (const node of nodes) {
    const incidentWalls = node.connectedWallIds
      .map(wallId => intermediateWallById.get(wallId))
      .filter((wall): wall is IntermediateWallWithGeometry => wall != null)
      .map(wall => getIntermediateIncident(wall, node.id))

    if (node.type === 'perimeter') {
      const perimeterWall = perimeterWallById.get(node.wallId)
      if (perimeterWall) {
        incidentWalls.push(
          {
            id: perimeterWall.id,
            direction: perimeterWall.direction,
            isPerimeterRay: true
          },
          {
            id: perimeterWall.id,
            direction: scaleVec2(perimeterWall.direction, -1),
            isPerimeterRay: true
          }
        )
      }
    }

    for (const [wallA, wallB] of getAdjacentWallNodePairs(incidentWalls)) {
      if (!createdWallIds.has(wallA.id) && !createdWallIds.has(wallB.id)) continue

      const dot = Math.abs(dotVec2(wallA.direction, wallB.direction))
      if (dot < PERPENDICULAR_DOT_TOLERANCE) {
        constraints.push({ type: 'wallNodePerpendicular', node: node.id, wallA: wallA.id, wallB: wallB.id })
      } else if (dot > COLINEAR_DOT_THRESHOLD) {
        constraints.push({ type: 'wallNodeColinear', node: node.id, wallA: wallA.id, wallB: wallB.id })
      }
    }
  }

  return constraints
}

function getIntermediateIncident(
  wall: IntermediateWallWithGeometry,
  nodeId: WallNodeWithGeometry['id']
): WallNodeIncident {
  return {
    id: wall.id,
    direction: wall.start.nodeId === nodeId ? wall.direction : scaleVec2(wall.direction, -1)
  }
}
