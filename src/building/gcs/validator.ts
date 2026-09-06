import type {
  Constraint,
  P2PDistance,
  PointOnLine_PL as PointOnLine,
  SketchLine,
  SketchPoint
} from '@salusoft89/planegcs'

import {
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  wallEntityOnLineConstraintId,
  wallEntityWidthConstraintId,
  wallNonRefLineId,
  wallNonRefSideProjectedPoint,
  wallRefLineId
} from '@/building/gcs/constraintTranslator'
import {
  type Perimeter,
  type PerimeterCornerId,
  type WallEntityId,
  type WallId,
  isPerimeterWallId,
  isWallPostId
} from '@/building/model'
import { getModelActions } from '@/building/store'
import {
  type Length,
  type Polygon2D,
  type Vec2,
  crossVec2,
  direction,
  distSqrVec2,
  distVec2,
  isPointInPolygon,
  lineFromSegment,
  lineIntersection,
  newVec2,
  offsetPolygon,
  perpendicular,
  polygonEdges,
  projectVec2,
  segmentsIntersect,
  wouldClosingPolygonSelfIntersect
} from '@/shared/geometry'

const MIN_WALL_LENGTH_SQ = 50 * 50
const COLLINEARITY_THRESHOLD = 1e-4
export const COLLINEARITY_NUDGE_DISTANCE = 1

export interface ColinearityNudge {
  pointId: string
  nudgeDirection: Vec2
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  nudges?: ColinearityNudge[]
}

interface WallEntityContext {
  startOffset: Length
  length: Length
  endOffset: Length
  entities: { entityId: WallEntityId; offset: Length; width: Length }[]
}

function checkEntityPositions(
  points: Record<string, SketchPoint>,
  constraints: Record<string, Constraint>,
  linesMap: Record<string, SketchLine>
): boolean {
  const wallEntities: Record<WallId, WallEntityContext> = {}

  // Extract wall entity information from GCS
  for (const point of Object.values(points)) {
    // Find entity center points, format "{id}_center_ref"
    if (!point.id.endsWith('_center_ref')) continue
    const entityId = point.id.substring(0, point.id.length - '_center_ref'.length) as WallEntityId

    const wallConstraint = constraints[wallEntityOnLineConstraintId(entityId, 'center')] as PointOnLine
    const wallLineId = wallConstraint.l_id
    const wallId = wallLineId.substring(5, wallLineId.length - 4) as WallId // Format: wall_{id}_ref
    const wallLine = linesMap[wallLineId]
    const isIntermediateWall = !isPerimeterWallId(wallId)

    const startPoint1Id = wallLine.p1_id
    const endPoint1Id = wallLine.p2_id

    const widthConstraint = constraints[wallEntityWidthConstraintId(entityId)] as P2PDistance
    const width = widthConstraint.distance as number

    const startPoint1 = points[startPoint1Id]
    const startPoint2 = points[wallNonRefSideProjectedPoint(wallId, 'start')]
    const startPos1 = newVec2(startPoint1.x, startPoint1.y)
    const startPos2 = newVec2(startPoint2.x, startPoint2.y)

    const endPoint1 = points[endPoint1Id]
    const endPoint2 = points[wallNonRefSideProjectedPoint(wallId, 'end')]
    const endPos1 = newVec2(endPoint1.x, endPoint1.y)
    const endPos2 = newVec2(endPoint2.x, endPoint2.y)

    const wallDir = direction(startPos1, endPos1)

    // Intermediate wall side lines can extend through a node overlap. The
    // valid entity span is their longitudinal overlap, not the full GCS line.
    const basePos = projectVec2(startPos1, startPos2, wallDir) > 0 ? startPos2 : startPos1
    const endPos = projectVec2(endPos1, endPos2, wallDir) > 0 ? endPos1 : endPos2

    const centerPos = newVec2(point.x, point.y)
    const offset = projectVec2(basePos, centerPos, wallDir)

    if (isIntermediateWall) {
      if (!(wallId in wallEntities)) {
        wallEntities[wallId] = {
          startOffset: 0,
          endOffset: 0,
          length: distVec2(basePos, endPos),
          entities: []
        }
      }
      wallEntities[wallId].entities.push({ offset, width, entityId })
      continue
    }

    if (!(wallId in wallEntities)) {
      // Format: corner_{id}_ref
      const startCornerId = wallLine.p1_id.substring(7, wallLine.p1_id.length - 4) as PerimeterCornerId
      const startCorner = getModelActions().getPerimeterCornerById(startCornerId)
      const startCornerOffset =
        startCorner.constructedByWall === 'next'
          ? Math.min(projectVec2(basePos, startPos1, wallDir), projectVec2(basePos, startPos2, wallDir))
          : 0

      // Format: corner_{id}_ref
      const endCornerId = wallLine.p2_id.substring(7, wallLine.p2_id.length - 4) as PerimeterCornerId
      const endCorner = getModelActions().getPerimeterCornerById(endCornerId)
      const endCornerOffset =
        endCorner.constructedByWall === 'previous'
          ? Math.max(projectVec2(endPos, endPos1, wallDir), projectVec2(endPos, endPos2, wallDir))
          : 0

      wallEntities[wallId] = {
        startOffset: startCornerOffset,
        endOffset: endCornerOffset,
        length: distVec2(basePos, endPos),
        entities: []
      }
    }
    wallEntities[wallId].entities.push({ offset, width, entityId })
  }

  for (const context of Object.values(wallEntities)) {
    const { startOffset, endOffset, length, entities } = context
    entities.sort((a, b) => a.offset - b.offset)

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i]
      const entityStartOffset = entity.offset - entity.width / 2
      const entityEndOffset = entity.offset + entity.width / 2

      const minOffset = isWallPostId(entity.entityId) ? startOffset : 0
      const maxOffset = length + (isWallPostId(entity.entityId) ? endOffset : 0)

      // Out of wall bounds?
      if (entityStartOffset < minOffset || entityEndOffset > maxOffset) return false

      // Check overlap with previous
      if (i > 0) {
        const prevEntity = entities[i - 1]
        if (prevEntity.offset + prevEntity.width / 2 > entityStartOffset) return false
      }
    }
  }

  return true
}

export function validateSolution(
  perimeters: Perimeter[],
  points: Record<string, SketchPoint>,
  constraints: Record<string, Constraint>,
  linesMap: Record<string, SketchLine>
): ValidationResult {
  for (const perimeter of perimeters) {
    if (!checkMinWallLength(points, perimeter)) {
      return { valid: false, reason: 'Minimum wall length violation' }
    }

    if (!checkSelfIntersection(points, perimeter)) {
      return { valid: false, reason: 'Self-intersection detected' }
    }

    if (!checkWallConsistency(points, perimeter)) {
      return { valid: false, reason: 'Wall side consistency violation' }
    }

    if (!checkWallGeometry(perimeter, points, linesMap)) {
      return { valid: false, reason: 'Intermediate wall geometry violation' }
    }

    const colinearityResult = checkColinearity(points, perimeter, constraints)
    if (!colinearityResult.valid) {
      return { valid: false, reason: 'Colinear corner detected', nudges: colinearityResult.nudges }
    }
  }

  if (!checkEntityPositions(points, constraints, linesMap)) {
    return { valid: false, reason: 'Wall entity position violation' }
  }

  return { valid: true }
}

function getSolvedLine(points: Record<string, SketchPoint>, line: SketchLine): { start: Vec2; end: Vec2 } {
  const start = points[line.p1_id]
  const end = points[line.p2_id]
  return {
    start: newVec2(start.x, start.y),
    end: newVec2(end.x, end.y)
  }
}

function getInsidePolygon(points: Record<string, SketchPoint>, perimeter: Perimeter): Polygon2D {
  const pointIds =
    perimeter.referenceSide === 'inside'
      ? perimeter.cornerIds.map(nodeRefSidePointId)
      : perimeter.cornerIds.map(nodeNonRefSidePointForNextWall)

  return {
    points: pointIds.map(pointId => {
      const point = points[pointId]
      return newVec2(point.x, point.y)
    })
  }
}

const INSIDE_TOLERANCE = 5 // mm
const LINE_END_TOLERANCE = 3 // mm
const EPSILON = 1e-5

function checkWallGeometry(
  perimeter: Perimeter,
  points: Record<string, SketchPoint>,
  linesMap: Record<string, SketchLine>
): boolean {
  const polygon = getInsidePolygon(points, perimeter)
  const validationPolygon = offsetPolygon(polygon, INSIDE_TOLERANCE)

  const perimeterLines = perimeter.wallIds.map(wallId => {
    const lineId = perimeter.referenceSide === 'inside' ? wallRefLineId(wallId) : wallNonRefLineId(wallId)
    const line = linesMap[lineId]
    return getSolvedLine(points, line)
  })

  const intermediateLines = perimeter.intermediateWallIds.flatMap(wallId => {
    const ref = linesMap[wallRefLineId(wallId)]
    const nonRef = linesMap[wallNonRefLineId(wallId)]
    return [getSolvedLine(points, ref), getSolvedLine(points, nonRef)]
  })

  for (let i = 0; i < intermediateLines.length; i++) {
    const segment = intermediateLines[i]

    if (distSqrVec2(segment.start, segment.end) < MIN_WALL_LENGTH_SQ) return false

    if (!isPointInPolygon(segment.start, validationPolygon) || !isPointInPolygon(segment.end, validationPolygon)) {
      return false
    }

    const line = lineFromSegment(segment)
    const remainingIntermediate = intermediateLines.slice(i + 1)

    for (const otherSegment of remainingIntermediate.concat(perimeterLines)) {
      const otherLine = lineFromSegment(otherSegment)
      const intersection = lineIntersection(line, otherLine)
      if (intersection) {
        const segmentLength1 = distVec2(segment.start, segment.end)
        const distFromStart1 = distVec2(segment.start, intersection)
        const distFromEnd1 = distVec2(segment.end, intersection)
        if (Math.abs(distFromStart1 + distFromEnd1 - segmentLength1) > EPSILON) continue

        const segmentLength2 = distVec2(otherSegment.start, otherSegment.end)
        const distFromStart2 = distVec2(otherSegment.start, intersection)
        const distFromEnd2 = distVec2(otherSegment.end, intersection)
        if (Math.abs(distFromStart2 + distFromEnd2 - segmentLength2) > EPSILON) continue

        if (Math.min(distFromEnd1, distFromStart1) < LINE_END_TOLERANCE) continue
        if (Math.min(distFromEnd2, distFromStart2) < LINE_END_TOLERANCE) continue

        return false
      }
    }
  }

  return true
}

function checkMinWallLength(points: Record<string, SketchPoint>, perimeter: Perimeter): boolean {
  const cornerIds = perimeter.cornerIds
  for (let i = 0; i < cornerIds.length; i++) {
    const currentId = cornerIds[i]
    const nextId = cornerIds[(i + 1) % cornerIds.length]

    const refCurrentPt = points[nodeRefSidePointId(currentId)]
    const refNextPt = points[nodeRefSidePointId(nextId)]

    const refDistance = Math.pow(refCurrentPt.x - refNextPt.x, 2) + Math.pow(refCurrentPt.y - refNextPt.y, 2)

    if (refDistance < MIN_WALL_LENGTH_SQ) {
      return false
    }

    const nonrefCurrentPt = points[nodeNonRefSidePointForNextWall(currentId)]
    const nonrefNextPt = points[nodeNonRefSidePointForPrevWall(nextId)]

    const nonrefDistance =
      Math.pow(nonrefCurrentPt.x - nonrefNextPt.x, 2) + Math.pow(nonrefCurrentPt.y - nonrefNextPt.y, 2)

    if (nonrefDistance < MIN_WALL_LENGTH_SQ) {
      return false
    }
  }

  return true
}

function checkSelfIntersection(points: Record<string, SketchPoint>, perimeter: Perimeter): boolean {
  const innerPoints = perimeter.cornerIds.map(id => points[nodeRefSidePointId(id)])

  if (innerPoints.length < 3) return true

  const polygon = {
    points: innerPoints.map(pt => newVec2(pt.x, pt.y))
  }

  if (wouldClosingPolygonSelfIntersect(polygon)) return false

  return true
}

function checkWallConsistency(points: Record<string, SketchPoint>, perimeter: Perimeter): boolean {
  const refPoints = perimeter.cornerIds.map(id => points[nodeRefSidePointId(id)])
  const nonRefPoints = perimeter.cornerIds.map(id => points[nodeNonRefSidePointForNextWall(id)])

  if (refPoints.length < 3 || nonRefPoints.length < 3) return true

  const innerPolygon = {
    points: refPoints.map(pt => newVec2(pt.x, pt.y))
  }
  const outerPolygon = {
    points: nonRefPoints.map(pt => newVec2(pt.x, pt.y))
  }

  const innerLines = [...polygonEdges(innerPolygon)]
  const outerLines = [...polygonEdges(outerPolygon)]

  if (innerLines.some(i => outerLines.some(o => segmentsIntersect(i.start, i.end, o.start, o.end)))) return false

  return true
}

function checkColinearity(
  points: Record<string, SketchPoint>,
  perimeter: Perimeter,
  constraints: Record<string, Constraint>
): { valid: boolean; nudges: ColinearityNudge[] } {
  const nudges: ColinearityNudge[] = []

  for (let i = 0; i < perimeter.cornerIds.length; i++) {
    const currentId = perimeter.cornerIds[i]

    const constraintId = `bc_constraint_colinearCorner_${currentId}`
    if (constraintId in constraints) {
      continue
    }

    const prevId = perimeter.cornerIds[(i - 1 + perimeter.cornerIds.length) % perimeter.cornerIds.length]
    const nextId = perimeter.cornerIds[(i + 1) % perimeter.cornerIds.length]

    const prevPt = points[nodeRefSidePointId(prevId)]
    const currPt = points[nodeRefSidePointId(currentId)]
    const nextPt = points[nodeRefSidePointId(nextId)]

    const vecToNext = direction(newVec2(currPt.x, currPt.y), newVec2(nextPt.x, nextPt.y))
    const vecFromPrev = direction(newVec2(currPt.x, currPt.y), newVec2(prevPt.x, prevPt.y))

    const cross = crossVec2(vecToNext, vecFromPrev)

    if (Math.abs(cross) < COLLINEARITY_THRESHOLD) {
      const nudgeDir = perpendicular(vecToNext)
      nudges.push({
        pointId: nodeRefSidePointId(currentId),
        nudgeDirection: nudgeDir
      })
    }
  }

  return { valid: nudges.length === 0, nudges }
}
