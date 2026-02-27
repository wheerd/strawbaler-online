import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionResult, yieldElement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import type { Tag } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/material'
import type { InitialPartInfo } from '@/parts/types'
import {
  type Area,
  type Length,
  type Line2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Vec2,
  calculatePolygonArea,
  copyVec2,
  direction,
  distSqrVec2,
  distVec2,
  dotAbsVec2,
  dotVec2,
  ensurePolygonIsClockwise,
  intersectPolygon,
  lineIntersection,
  lineSegmentIntersect,
  offsetPolygon,
  perpendicular,
  perpendicularCW,
  scaleAddVec2,
  simplifyPolygon
} from '@/shared/geometry'

export function polygonFromLineIntersections(lines: Line2D[]): Polygon2D {
  const points: Vec2[] = []
  for (let i = 0; i < lines.length; i++) {
    const prev = lines[(i - 1 + lines.length) % lines.length]
    const current = lines[i]
    const intersection = lineIntersection(prev, current)
    if (intersection) {
      points.push(intersection)
    }
  }
  return { points }
}

export function infiniteBeamPolygon(
  line: Line2D,
  clipStart: Line2D,
  clipEnd: Line2D,
  thicknessLeft: Length,
  thicknessRight: Length
): Polygon2D | null {
  const leftDir = perpendicularCW(line.direction)
  const lineLeft: Line2D = {
    point: scaleAddVec2(line.point, leftDir, thicknessLeft),
    direction: line.direction
  }
  const lineRight: Line2D = {
    point: scaleAddVec2(line.point, leftDir, -thicknessRight),
    direction: line.direction
  }
  const p1 = lineIntersection(lineLeft, clipStart)
  const p2 = lineIntersection(lineRight, clipStart)
  const p3 = lineIntersection(lineRight, clipEnd)
  const p4 = lineIntersection(lineLeft, clipEnd)

  if (!p1 || !p2 || !p3 || !p4) return null

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  return ensurePolygonIsClockwise(beamPolygon)
}

export function* stripesPolygons(
  polygon: PolygonWithHoles2D,
  direction: Vec2,
  thickness: Length,
  spacing: Length,
  startOffset: Length = 0,
  endOffset: Length = 0,
  minimumArea: Area = 0
): Generator<PolygonWithHoles2D> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => dotVec2(p, perpDir))
  const stripeStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => dotVec2(p, direction))
  const stripeMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const stripeLength = Math.max(...dots2) - Math.min(...dots2)

  const stripeLine: Line2D = { point: stripeStart, direction }
  const perpLine: Line2D = { point: stripeMin, direction: perpDir }

  const intersection = lineIntersection(stripeLine, perpLine)

  if (!intersection) {
    return
  }

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing - endOffset
  for (let offset = startOffset; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness - endOffset)
    const p1 = scaleAddVec2(intersection, perpDir, clippedOffset)
    const p2 = scaleAddVec2(p1, perpDir, thickness)
    const p3 = scaleAddVec2(p2, direction, stripeLength)
    const p4 = scaleAddVec2(p1, direction, stripeLength)

    const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const stripeParts = intersectPolygon(polygon, { outer: stripePolygon, holes: [] })

    yield* stripeParts.filter(p => calculatePolygonArea(p.outer) > minimumArea)
  }
}

export function* simplePolygonFrame(
  polygon: Polygon2D,
  thickness: Length,
  height: Length,
  material: MaterialId,
  clipPolygon?: Polygon2D,
  partInfo?: InitialPartInfo,
  tags?: Tag[],
  inside = true
): Generator<ConstructionResult> {
  polygon = ensurePolygonIsClockwise(polygon)
  const outerPolygon = inside ? polygon : offsetPolygon(polygon, thickness)
  const innerPolygon = inside ? offsetPolygon(polygon, -thickness) : polygon

  if (outerPolygon.points.length === innerPolygon.points.length) {
    const l = outerPolygon.points.length
    for (let i0 = 0; i0 < l; i0++) {
      const i1 = (i0 + 1) % l
      const innerStart = innerPolygon.points[i0]
      const innerEnd = innerPolygon.points[i1]
      const outsideStart = closestPoint(innerStart, outerPolygon.points)
      const outsideEnd = closestPoint(innerEnd, outerPolygon.points)

      const elementPolygon: PolygonWithHoles2D = {
        outer: {
          // points: [outerPolygon.points[i0], outerPolygon.points[i1], innerPolygon.points[i1], innerPolygon.points[i0]]
          points: [innerStart, innerEnd, outsideEnd, outsideStart]
        },
        holes: []
      }
      const clipped = clipPolygon
        ? intersectPolygon(elementPolygon, { outer: clipPolygon, holes: [] })
        : [elementPolygon]

      for (const clip of clipped) {
        yield* yieldElement(
          createConstructionElement(material, createExtrudedPolygon(clip, 'xy', height), undefined, tags, partInfo)
        )
      }
    }
  }
}

export function closestPoint(reference: Vec2, points: Vec2[]): Vec2 {
  if (points.length === 0) {
    throw new Error("closestPoint: 'points' array must not be empty.")
  }

  let closest = points[0]
  let minDistSq = distSqrVec2(reference, closest)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distSq = distSqrVec2(reference, p)
    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = p
    }
  }

  return copyVec2(closest)
}

const EPSILON = 1e-5

export function splitPolygonAtIndices(
  polygon: Polygon2D,
  startIndex: number,
  endIndex: number,
  cutStart: Vec2,
  cutEnd: Vec2
): [Polygon2D, Polygon2D] {
  const points = polygon.points
  const n = points.length

  // cutStart lies on the edge from points[startIndex] to points[(startIndex+1)%n]
  // cutEnd lies on the edge from points[endIndex] to points[(endIndex+1)%n]

  // Build first polygon: cutStart -> points along polygon -> cutEnd
  const poly1Points: Vec2[] = []

  // Add cutStart (unless it coincides with the next point we'll add)
  const nextAfterStart = points[(startIndex + 1) % n]
  if (distVec2(cutStart, nextAfterStart) > EPSILON) {
    poly1Points.push(copyVec2(cutStart))
  }

  // Add all points from (startIndex+1) to endIndex (inclusive)
  let i = (startIndex + 1) % n
  while (true) {
    poly1Points.push(copyVec2(points[i]))
    if (i === endIndex) break
    i = (i + 1) % n
  }

  // Add cutEnd (unless it coincides with the last point we added)
  if (distVec2(cutEnd, poly1Points[poly1Points.length - 1]) > EPSILON) {
    poly1Points.push(copyVec2(cutEnd))
  }

  // Build second polygon: cutEnd -> points along polygon -> cutStart
  const poly2Points: Vec2[] = []

  // Add cutEnd (unless it coincides with the next point we'll add)
  const nextAfterEnd = points[(endIndex + 1) % n]
  if (distVec2(cutEnd, nextAfterEnd) > EPSILON) {
    poly2Points.push(copyVec2(cutEnd))
  }

  // Add all points from (endIndex+1) to startIndex (inclusive)
  i = (endIndex + 1) % n
  while (true) {
    poly2Points.push(copyVec2(points[i]))
    if (i === startIndex) break
    i = (i + 1) % n
  }

  // Add cutStart (unless it coincides with the last point we added)
  if (distVec2(cutStart, poly2Points[poly2Points.length - 1]) > EPSILON) {
    poly2Points.push(copyVec2(cutStart))
  }

  return [{ points: poly1Points }, { points: poly2Points }]
}

export function* partitionByAlignedEdges(polygon: Polygon2D, dir: Vec2): Generator<Polygon2D> {
  // Optimization: polygons with less than 4 points cannot be split
  if (polygon.points.length < 4) {
    yield polygon
    return
  }

  const queue = [ensurePolygonIsClockwise(polygon)]
  let toSplit
  while ((toSplit = queue.pop())) {
    const pointCount = toSplit.points.length

    const area = calculatePolygonArea(toSplit)
    if (area < EPSILON) continue

    if (pointCount < 4) {
      yield toSplit
      continue
    }

    let splitFound = false

    for (let i = 0; i < pointCount; i++) {
      const start = toSplit.points[i]
      const end = toSplit.points[(i + 1) % pointCount]
      const prev = toSplit.points[(i - 1 + pointCount) % pointCount]
      const next = toSplit.points[(i + 2) % pointCount]
      const edgeDir = direction(start, end)

      // Check if edge is aligned with the direction (handles both dir and -dir)
      if (1 - dotAbsVec2(edgeDir, dir) > EPSILON) continue

      const edgeLine: Line2D = { point: start, direction: dir }
      const perpDir = perpendicularCW(edgeDir)

      // Check if we can extend this edge in either direction
      const nextDir = direction(end, next)
      const nextPerpComponent = dotVec2(nextDir, perpDir)
      const canExtendForward = nextPerpComponent < -EPSILON

      const prevDir = direction(prev, start)
      const prevPerpComponent = dotVec2(prevDir, perpDir)
      const canExtendBackward = prevPerpComponent > EPSILON

      if (!canExtendForward && !canExtendBackward) continue

      let bestForwardIndex = -1
      let bestForwardPoint: Vec2 | null = null
      let smallestForwardDistance = Infinity

      let bestBackwardIndex = -1
      let bestBackwardPoint: Vec2 | null = null
      let smallestBackwardDistance = Infinity

      // Search for intersections (excluding current, next, and previous edges)
      for (let j = 2; j < pointCount - 1; j++) {
        // Forward search
        if (canExtendForward) {
          const candidateIndex = (i + j) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = distVec2(end, intersection)
            if (distance > EPSILON && distance < smallestForwardDistance) {
              bestForwardIndex = candidateIndex
              bestForwardPoint = intersection
              smallestForwardDistance = distance
            }
          }
        }

        // Backward search
        if (canExtendBackward) {
          const candidateIndex = (i - j + pointCount) % pointCount
          const candidateStart = toSplit.points[candidateIndex]
          const candidateEnd = toSplit.points[(candidateIndex + 1) % pointCount]
          const intersection = lineSegmentIntersect(edgeLine, { start: candidateStart, end: candidateEnd })

          if (intersection) {
            const distance = distVec2(start, intersection)
            if (distance > EPSILON && distance < smallestBackwardDistance) {
              bestBackwardIndex = candidateIndex
              bestBackwardPoint = intersection
              smallestBackwardDistance = distance
            }
          }
        }
      }

      // If we found a valid split, perform it
      if (bestBackwardPoint || bestForwardPoint) {
        let cutStart = start
        let cutEnd = end
        let splitStartIndex = i
        let splitEndIndex = (i + 1) % pointCount

        if (bestBackwardPoint && bestForwardPoint) {
          if (bestBackwardIndex === bestForwardIndex) {
            // Same edge - choose the split with smaller distance
            if (smallestBackwardDistance < smallestForwardDistance) {
              cutEnd = bestBackwardPoint
              splitEndIndex = bestBackwardIndex
            } else {
              cutStart = bestForwardPoint
              splitStartIndex = bestForwardIndex
            }
          } else {
            // Different edges - only perform backward cut (arbitrary choice)
            // The forward ear will be discovered and cut in a subsequent iteration
            cutEnd = bestBackwardPoint
            splitEndIndex = bestBackwardIndex
          }
        } else if (bestBackwardPoint) {
          // Only backward cut found
          cutEnd = bestBackwardPoint
          splitEndIndex = bestBackwardIndex
        } else if (bestForwardPoint) {
          // Only forward cut found
          cutStart = bestForwardPoint
          splitStartIndex = bestForwardIndex
        }

        const [poly1, poly2] = splitPolygonAtIndices(toSplit, splitStartIndex, splitEndIndex, cutStart, cutEnd)

        queue.push(simplifyPolygon(poly1), simplifyPolygon(poly2))
        splitFound = true
        break // Move to next polygon in queue
      }
    }

    if (!splitFound) {
      // No valid splits found - this polygon is fully partitioned
      yield toSplit
    }
  }
}
