import { type Vec2, distVec2, newVec2 } from '@/shared/geometry/2d'
import { eqVec3 } from '@/shared/geometry/3d'
import { type Area } from '@/shared/geometry/basic'
import { type LineSegment2D } from '@/shared/geometry/line'

import { createPathD, createPathsD, getClipperModule, pathDToPoints } from './clipperInstance'
import type { Polygon2D, Polygon3D, PolygonWithHoles2D } from './types'

function signedArea(polygon: Polygon2D): number {
  if (polygon.points.length < 3) return 0
  let area = 0
  for (let i = 0; i < polygon.points.length; i++) {
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % polygon.points.length]
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area * 0.5
}

export function calculatePolygonArea(polygon: Polygon2D): Area {
  return Math.abs(signedArea(polygon))
}

export const calculatePolygonWithHolesArea = (polygon: PolygonWithHoles2D): Area => {
  const outerArea = calculatePolygonArea(polygon.outer)
  const holesArea = polygon.holes.reduce((sum, hole) => sum + calculatePolygonArea(hole), 0)
  return outerArea - holesArea
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  return signedArea(polygon) < 0
}

export { signedArea as signedPolygonArea }

export function ensurePolygonIsClockwise(polygon: Polygon2D): Polygon2D {
  if (!polygonIsClockwise(polygon)) {
    return { points: [...polygon.points].reverse() }
  }
  return polygon
}

export function ensurePolygonIsCounterClockwise(polygon: Polygon2D): Polygon2D {
  if (polygonIsClockwise(polygon)) {
    return { points: [...polygon.points].reverse() }
  }
  return polygon
}

export function polygonPerimeter(polygon: Polygon2D): number {
  if (polygon.points.length < 2) return 0
  let total = 0
  for (let i = 0; i < polygon.points.length; i++) {
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % polygon.points.length]
    total += distVec2(current, next)
  }
  return total
}

export function isPointInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const { points } = polygon
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0]
    const yi = points[i][1]
    const xj = points[j][0]
    const yj = points[j][1]

    const intersect = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

const BOUNDARY_EPSILON = 1e-6

function pointToSegmentDistance(point: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy

  if (lengthSq === 0) return distVec2(point, a)

  let t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))

  const projX = a[0] + t * dx
  const projY = a[1] + t * dy

  return distVec2(point, newVec2(projX, projY))
}

export function isPointStrictlyInPolygon(point: Vec2, polygon: Polygon2D, epsilon = BOUNDARY_EPSILON): boolean {
  const { points } = polygon
  const n = points.length

  for (let i = 0; i < n; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % n]

    if (pointToSegmentDistance(point, p1, p2) < epsilon) {
      return false
    }
  }

  return isPointInPolygon(point, polygon)
}

const SIMPLIFY_TOLERANCE = 0.01

export function simplifyPolygon(polygon: Polygon2D, epsilon = SIMPLIFY_TOLERANCE): Polygon2D {
  const path = createPathD(polygon.points)
  const paths = createPathsD([path])
  try {
    const simplified = getClipperModule().SimplifyPathD(path, epsilon, true)
    try {
      const points = pathDToPoints(simplified)
      return { points }
    } finally {
      simplified.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function simplifyPolygonWithHoles(polygon: PolygonWithHoles2D, epsilon = SIMPLIFY_TOLERANCE) {
  const outer = simplifyPolygon(polygon.outer, epsilon)
  if (outer.points.length < 3 || calculatePolygonArea(outer) < 10) return null
  return {
    outer,
    holes: polygon.holes
      .map(h => simplifyPolygon(h, epsilon))
      .filter(p => p.points.length > 2 && calculatePolygonArea(p) >= 10)
  }
}

export function polygonEdgeCount(polygon: Polygon3D) {
  return eqVec3(polygon.points[0], polygon.points[polygon.points.length - 1])
    ? polygon.points.length - 1
    : polygon.points.length
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
