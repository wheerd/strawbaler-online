import { type Vec2, distVec2 } from '@/shared/geometry/2d'
import { eqVec3 } from '@/shared/geometry/3d'
import { type Area } from '@/shared/geometry/basic'
import { type LineSegment2D } from '@/shared/geometry/line'

import { createPathD, createPathsD, createPointD, getClipperModule, pathDToPoints } from './clipperInstance'
import type { Polygon2D, Polygon3D, PolygonWithHoles2D } from './types'

export function calculatePolygonArea(polygon: Polygon2D): Area {
  const path = createPathD(polygon.points)
  try {
    return Math.abs(getClipperModule().AreaPathD(path))
  } finally {
    path.delete()
  }
}

export const calculatePolygonWithHolesArea = (polygon: PolygonWithHoles2D): Area => {
  const outerArea = calculatePolygonArea(polygon.outer)
  const holesArea = polygon.holes.reduce((sum, hole) => sum + calculatePolygonArea(hole), 0)
  return outerArea - holesArea
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const path = createPathD(polygon.points)
  try {
    return !getClipperModule().IsPositiveD(path)
  } finally {
    path.delete()
  }
}

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
  const testPoint = createPointD(point)
  const path = createPathD(polygon.points)
  try {
    const module = getClipperModule()
    const result = module.PointInPolygonD(testPoint, path)
    return result.value !== module.PointInPolygonResult.IsOutside.value
  } finally {
    testPoint.delete()
    path.delete()
  }
}

export function isPointStrictlyInPolygon(point: Vec2, polygon: Polygon2D): boolean {
  const testPoint = createPointD(point)
  const path = createPathD(polygon.points)
  try {
    const module = getClipperModule()
    const result = module.PointInPolygonD(testPoint, path)
    return result.value === module.PointInPolygonResult.IsInside.value
  } finally {
    testPoint.delete()
    path.delete()
  }
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
