import {
  type Vec2,
  direction,
  distSqrVec2,
  distVec2,
  dotVec2,
  eqVec2,
  scaleAddVec2,
  subVec2
} from '@/shared/geometry/2d'
import { type Line2D, type LineSegment2D, lineIntersection, lineSegmentIntersect } from '@/shared/geometry/line'

import { isPointInPolygon, isPointStrictlyInPolygon, polygonEdges, simplifyPolygon } from './basic'
import { createPathD, createPathsD, getClipperModule } from './clipperInstance'
import type { LinePolygonIntersection, Polygon2D } from './types'

export function arePolygonsIntersecting(polygon1: Polygon2D, polygon2: Polygon2D): boolean {
  if (polygon1.points.length < 3 || polygon2.points.length < 3) {
    return false
  }

  const module = getClipperModule()
  const pathA = createPathD(polygon1.points)
  const pathB = createPathD(polygon2.points)
  const pathsA = createPathsD([pathA])
  const pathsB = createPathsD([pathB])

  try {
    const intersections = module.IntersectD(pathsA, pathsB, module.FillRule.EvenOdd, 2)
    try {
      for (let i = 0; i < intersections.size(); i++) {
        const intersectionPath = intersections.get(i)
        if (intersectionPath.size() > 0) {
          return true
        }
      }
    } finally {
      intersections.delete()
    }

    return false
  } finally {
    pathsA.delete()
    pathsB.delete()
    pathA.delete()
    pathB.delete()
  }
}

/**
 * Find all segments where a line segment intersects with a polygon.
 * Returns normalized t values (0-1) along the line segment.
 */
export function intersectLineSegmentWithPolygon(
  line: LineSegment2D,
  polygon: Polygon2D
): LinePolygonIntersection | null {
  if (polygon.points.length < 3) {
    return null
  }

  polygon = simplifyPolygon(polygon)

  const lineDir = direction(line.start, line.end)
  const lineLength = distVec2(line.start, line.end)

  if (lineLength === 0) {
    // Degenerate line - just check if point is inside
    return isPointInPolygon(line.start, polygon) ? { segments: [{ tStart: 0, tEnd: 0 }] } : null
  }

  // Find all intersection points with polygon edges
  interface Intersection {
    t: number
  }
  const epsilon = 1e-9

  const intersections: Intersection[] = []

  // Check each edge of the polygon
  for (let i = 0; i < polygon.points.length; i++) {
    const p1 = polygon.points[i]
    const p2 = polygon.points[(i + 1) % polygon.points.length]

    // Solve for intersection: line.start + t * lineDir = p1 + s * (p2 - p1)
    const edgeDir = direction(p1, p2)
    const edgeLength = distVec2(p1, p2)

    if (edgeLength === 0) continue

    // Use lineIntersection to find intersection point
    const lineDef: Line2D = { point: line.start, direction: lineDir }
    const edgeDef: Line2D = { point: p1, direction: edgeDir }

    const intersection = lineIntersection(lineDef, edgeDef)

    if (intersection) {
      // Calculate t along the line segment
      const toIntersection = subVec2(intersection, line.start)
      const t = dotVec2(toIntersection, lineDir) / lineLength

      // Calculate s along the edge
      const toIntersectionFromEdge = subVec2(intersection, p1)
      const s = dotVec2(toIntersectionFromEdge, edgeDir) / edgeLength

      // Only count if intersection is on both segments (with small epsilon for endpoints)
      if (t >= -epsilon && t <= 1 + epsilon && s >= -epsilon && s <= 1 + epsilon) {
        // Clamp t to valid range
        const clampedT = Math.max(0, Math.min(1, t))

        // Check if this is a real crossing (not just tangent)
        const crossing = Math.abs(dotVec2(lineDir, edgeDir)) < 1 - epsilon

        if (crossing) {
          intersections.push({ t: clampedT })
        }
      }
    }
  }

  // Sort by t value
  intersections.sort((a, b) => a.t - b.t)

  // Build segments based on start/end inside status and crossings
  const segments: { tStart: number; tEnd: number }[] = []

  if (intersections.length === 0) {
    // No edge crossings
    if (isPointInPolygon(line.start, polygon) && isPointInPolygon(line.end, polygon)) {
      // Entire line is inside
      return { segments: [{ tStart: 0, tEnd: 1 }] }
    }
    // Entire line is outside
    return null
  }

  // Build segments by tracking inside/outside status
  const epsStart = scaleAddVec2(line.start, lineDir, -1e-3)
  let inside = isPointStrictlyInPolygon(epsStart, polygon)
  let segmentStart: number | null = inside ? 0 : null

  for (const intersection of intersections) {
    if (inside) {
      // We're inside, this intersection is an exit
      if (segmentStart !== null) {
        segments.push({ tStart: segmentStart, tEnd: intersection.t })
      }
      inside = false
      segmentStart = null
    } else {
      // We're outside, this intersection is an entry
      inside = true
      segmentStart = intersection.t
    }
  }

  // Close final segment if we end inside
  if (inside && segmentStart !== null) {
    segments.push({ tStart: segmentStart, tEnd: 1 })
  }

  return segments.length > 0 ? { segments } : null
}

export function intersectLineWithPolygon(line: Line2D, polygon: Polygon2D): LineSegment2D[] {
  if (polygon.points.length < 3) {
    return []
  }

  const intersections: {
    t: number
    p: Vec2
  }[] = []

  // Test each polygon edge
  for (const edge of polygonEdges(polygon)) {
    const edgeLength = distVec2(edge.start, edge.end)
    if (edgeLength < 1e-5) continue

    const intersection = lineSegmentIntersect(line, edge)

    if (!intersection) continue

    // Compute t on infinite line
    const toIntersection = subVec2(intersection, line.point)
    const t = dotVec2(toIntersection, line.direction)
    intersections.push({ t, p: intersection })
  }

  if (intersections.length === 0) {
    return []
  }

  intersections.sort((a, b) => a.t - b.t)

  const lines: LineSegment2D[] = []

  for (let i = 1; i < intersections.length; i += 2) {
    const start = intersections[i - 1].p
    const end = intersections[i].p
    if (distSqrVec2(start, end) > 1) {
      lines.push({ start, end })
    }
  }

  return lines
}

export function wouldPolygonSelfIntersect(existingPoints: Vec2[], newPoint: Vec2): boolean {
  if (existingPoints.some(p => eqVec2(p, newPoint))) {
    return true
  }

  if (existingPoints.length < 2) return false

  const newSegment: LineSegment2D = {
    start: existingPoints[existingPoints.length - 1],
    end: newPoint
  }

  for (let i = 0; i < existingPoints.length - 2; i++) {
    const existingSegment: LineSegment2D = {
      start: existingPoints[i],
      end: existingPoints[i + 1]
    }

    if (segmentsIntersect(newSegment.start, newSegment.end, existingSegment.start, existingSegment.end)) {
      return true
    }
  }

  return false
}

export function wouldClosingPolygonSelfIntersect(polygon: Polygon2D): boolean {
  if (polygon.points.length < 3) return false

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const unionPaths = module.UnionSelfD(paths, module.FillRule.EvenOdd, 2)
    try {
      return unionPaths.size() !== 1
    } finally {
      unionPaths.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function segmentsIntersect(p1: Vec2, q1: Vec2, p2: Vec2, q2: Vec2): boolean {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) return true

  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true

  return false
}

const COLINEAR_EPSILON = 1e-9

function orientation(p: Vec2, q: Vec2, r: Vec2): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (Math.abs(val) < COLINEAR_EPSILON) return 0
  return val > 0 ? 1 : 2
}

function onSegment(p: Vec2, q: Vec2, r: Vec2): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) + COLINEAR_EPSILON &&
    q[0] + COLINEAR_EPSILON >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) + COLINEAR_EPSILON &&
    q[1] + COLINEAR_EPSILON >= Math.min(p[1], r[1])
  )
}
