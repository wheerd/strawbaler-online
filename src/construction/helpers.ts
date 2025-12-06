import { vec2 } from 'gl-matrix'

import {
  type Area,
  type Length,
  type Line2D,
  type LineSegment2D,
  type Polygon2D,
  type PolygonWithHoles2D,
  calculatePolygonArea,
  direction,
  ensurePolygonIsClockwise,
  intersectPolygon,
  lineIntersection,
  offsetPolygon,
  perpendicular,
  perpendicularCW
} from '@/shared/geometry'

import { createConstructionElement } from './elements'
import type { MaterialId } from './materials/material'
import { polygonPartInfo } from './parts'
import { type ConstructionResult, yieldElement, yieldWarning } from './results'
import { createExtrudedPolygon } from './shapes'
import type { Tag } from './tags'

export function polygonFromLineIntersections(lines: Line2D[]): Polygon2D {
  const points: vec2[] = []
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
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, thicknessLeft),
    direction: line.direction
  }
  const lineRight: Line2D = {
    point: vec2.scaleAndAdd(vec2.create(), line.point, leftDir, -thicknessRight),
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

export function* infiniteBeam(
  line: Line2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(line.direction)
  const lineStart = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, 1e6)
  const lineEnd = vec2.scaleAndAdd(vec2.create(), line.point, line.direction, -1e6)
  const p1 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), lineStart, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), lineEnd, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* beam(
  line: LineSegment2D,
  clipPolygon: PolygonWithHoles2D,
  thicknessLeft: Length,
  thicknessRight: Length,
  height: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const leftDir = perpendicularCW(direction(line.start, line.end))
  const p1 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, thicknessLeft)
  const p2 = vec2.scaleAndAdd(vec2.create(), line.start, leftDir, -thicknessRight)
  const p3 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, -thicknessRight)
  const p4 = vec2.scaleAndAdd(vec2.create(), line.end, leftDir, thicknessLeft)

  const beamPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
  const beamParts = intersectPolygon(clipPolygon, { outer: beamPolygon, holes: [] })

  for (const part of beamParts) {
    const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
    yield* yieldElement(
      createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
    )
  }
}

export function* stripesPolygons(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  spacing: Length,
  startOffset: Length = 0,
  endOffset: Length = 0,
  minimumArea: Area = 0
): Generator<PolygonWithHoles2D> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const joistLength = Math.max(...dots2) - Math.min(...dots2)

  const joistLine: Line2D = { point: joistStart, direction: direction }
  const perpLine: Line2D = { point: joistMin, direction: perpDir }

  const intersection = lineIntersection(joistLine, perpLine)

  if (!intersection) {
    return
  }

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing - endOffset
  for (let offset = startOffset; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, joistLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, joistLength)

    const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

    yield* joistParts.filter(p => calculatePolygonArea(p.outer) > minimumArea)
  }
}

export function* simpleStripes(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  thickness: Length,
  height: Length,
  spacing: Length,
  material: MaterialId,
  partType?: string,
  tags?: Tag[]
): Generator<ConstructionResult> {
  const perpDir = perpendicular(direction)

  const dots = polygon.outer.points.map(p => vec2.dot(p, perpDir))
  const joistStart = polygon.outer.points[dots.indexOf(Math.min(...dots))]
  const totalSpan = Math.max(...dots) - Math.min(...dots)

  const dots2 = polygon.outer.points.map(p => vec2.dot(p, direction))
  const joistMin = polygon.outer.points[dots2.indexOf(Math.min(...dots2))]
  const joistLength = Math.max(...dots2) - Math.min(...dots2)

  const joistLine: Line2D = { point: joistStart, direction: direction }
  const perpLine: Line2D = { point: joistMin, direction: perpDir }

  const intersection = lineIntersection(joistLine, perpLine)

  if (!intersection) {
    yield yieldWarning('Could not determine stripe positions due to parallel lines.', [])
    return
  }

  // Used to filter out tiny joist pieces (which are probably not needed)
  const minRelevantArea = (thickness * thickness) / 2

  const stepWidth = thickness + spacing
  const end = totalSpan + spacing
  for (let offset = 0; offset <= end; offset += stepWidth) {
    const clippedOffset = Math.min(offset, totalSpan - thickness)
    const p1 = vec2.scaleAndAdd(vec2.create(), intersection, perpDir, clippedOffset)
    const p2 = vec2.scaleAndAdd(vec2.create(), p1, perpDir, thickness)
    const p3 = vec2.scaleAndAdd(vec2.create(), p2, direction, joistLength)
    const p4 = vec2.scaleAndAdd(vec2.create(), p1, direction, joistLength)

    const joistPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
    const joistParts = intersectPolygon(polygon, { outer: joistPolygon, holes: [] })

    for (const part of joistParts) {
      if (calculatePolygonArea(part.outer) < minRelevantArea) continue
      const partInfo = partType ? polygonPartInfo(partType, part.outer, 'xy', height) : undefined
      yield* yieldElement(
        createConstructionElement(material, createExtrudedPolygon(part, 'xy', height), undefined, tags, partInfo)
      )
    }
  }
}

export function* simplePolygonFrame(
  polygon: Polygon2D,
  thickness: Length,
  height: Length,
  material: MaterialId,
  clipPolygon?: Polygon2D,
  partType?: string,
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
        const partInfo = partType ? polygonPartInfo(partType, clip.outer, 'xy', height) : undefined
        yield* yieldElement(
          createConstructionElement(material, createExtrudedPolygon(clip, 'xy', height), undefined, tags, partInfo)
        )
      }
    }
  }
}

export function closestPoint(reference: vec2, points: vec2[]): vec2 {
  if (points.length === 0) {
    throw new Error("closestPoint: 'points' array must not be empty.")
  }

  let closest = points[0]
  let minDistSq = vec2.sqrDist(reference, closest)

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const distSq = vec2.sqrDist(reference, p)
    if (distSq < minDistSq) {
      minDistSq = distSq
      closest = p
    }
  }

  return vec2.clone(closest)
}

export function* polygonEdges(polygon: Polygon2D): Generator<LineSegment2D> {
  for (let i0 = 0; i0 < polygon.points.length; i0++) {
    const i1 = (i0 + 1) % polygon.points.length
    yield {
      start: polygon.points[i0],
      end: polygon.points[i1]
    }
  }
}
