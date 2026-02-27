import { type Polygon2D, type PolygonWithHoles2D, type Vec2, distVec2 } from '@/shared/geometry'

/**
 * Check if an edge is axis-aligned (horizontal or vertical).
 * Uses a small tolerance for floating point comparisons.
 */
export function isAxisAligned(p1: Vec2, p2: Vec2, tolerance = 0.1): boolean {
  const dx = Math.abs(p2[0] - p1[0])
  const dy = Math.abs(p2[1] - p1[1])

  // Vertical: dx ≈ 0
  // Horizontal: dy ≈ 0
  return dx < tolerance || dy < tolerance
}

/**
 * Extract all edges from a polygon.
 * Returns edges with their start/end points and length in virtual coordinates.
 */
export function getPolygonEdges(polygon: Polygon2D): {
  start: Vec2
  end: Vec2
  length: number
}[] {
  const edges: { start: Vec2; end: Vec2; length: number }[] = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    const length = distVec2(start, end)

    edges.push({ start, end, length })
  }

  return edges
}

/**
 * Extract all edges from a polygon with holes.
 * Returns edges from outer polygon and all holes.
 */
export function getAllPolygonEdges(polygon: PolygonWithHoles2D): {
  start: Vec2
  end: Vec2
  length: number
}[] {
  const edges = getPolygonEdges(polygon.outer)

  for (const hole of polygon.holes) {
    edges.push(...getPolygonEdges(hole))
  }

  return edges
}
