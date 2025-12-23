import { type Polygon2D, type PolygonWithHoles2D, type Vec2, newVec2 } from '@/shared/geometry'

import { type CoordinateMapper } from './coordinateMapper'

/**
 * Clips a polygon to a vertical range [xMin, xMax].
 * Interpolates new points where edges cross the boundaries.
 */
export function clipPolygonToXRange(polygon: PolygonWithHoles2D, xMin: number, xMax: number): PolygonWithHoles2D {
  return {
    outer: clipSimplePolygonToXRange(polygon.outer, xMin, xMax),
    holes: polygon.holes.map(hole => clipSimplePolygonToXRange(hole, xMin, xMax)).filter(hole => hole.points.length > 0)
  }
}

function clipSimplePolygonToXRange(polygon: Polygon2D, xMin: number, xMax: number): Polygon2D {
  const clippedPoints: Vec2[] = []
  const points = polygon.points

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]

    const p1Inside = p1[0] >= xMin && p1[0] <= xMax
    const p2Inside = p2[0] >= xMin && p2[0] <= xMax

    if (p1Inside && p2Inside) {
      // Both inside, add p1
      clippedPoints.push(p1)
    } else if (p1Inside && !p2Inside) {
      // Leaving the region, add p1 and intersection
      clippedPoints.push(p1)

      // Find intersection with boundary
      if (p2[0] < xMin) {
        const intersection = interpolateAtX(p1, p2, xMin)
        if (intersection) clippedPoints.push(intersection)
      } else if (p2[0] > xMax) {
        const intersection = interpolateAtX(p1, p2, xMax)
        if (intersection) clippedPoints.push(intersection)
      }
    } else if (!p1Inside && p2Inside) {
      // Entering the region, add intersection
      if (p1[0] < xMin) {
        const intersection = interpolateAtX(p1, p2, xMin)
        if (intersection) clippedPoints.push(intersection)
      } else if (p1[0] > xMax) {
        const intersection = interpolateAtX(p1, p2, xMax)
        if (intersection) clippedPoints.push(intersection)
      }
      // p2 will be added in next iteration
    } else {
      // Both outside, check if edge crosses the region
      const edgeCrossesRegion =
        (p1[0] < xMin && p2[0] > xMax) ||
        (p1[0] > xMax && p2[0] < xMin) ||
        (p1[0] < xMin && p2[0] > xMin) ||
        (p1[0] > xMax && p2[0] < xMax)

      if (edgeCrossesRegion) {
        // Add both intersections
        const intersections: Vec2[] = []

        const intersectMin = interpolateAtX(p1, p2, xMin)
        const intersectMax = interpolateAtX(p1, p2, xMax)

        if (intersectMin) intersections.push(intersectMin)
        if (intersectMax) intersections.push(intersectMax)

        // Sort by distance from p1
        intersections.sort((a, b) => {
          const distA = Math.abs(a[0] - p1[0])
          const distB = Math.abs(b[0] - p1[0])
          return distA - distB
        })

        clippedPoints.push(...intersections)
      }
    }
  }

  return { points: clippedPoints }
}

/**
 * Interpolates a point on the line segment p1-p2 at the given x coordinate.
 */
function interpolateAtX(p1: Vec2, p2: Vec2, x: number): Vec2 | null {
  const dx = p2[0] - p1[0]

  if (Math.abs(dx) < 0.0001) {
    // Vertical line
    return null
  }

  const t = (x - p1[0]) / dx

  // Only interpolate if t is between 0 and 1 (point is on the segment)
  if (t < 0 || t > 1) {
    return null
  }

  const y = p1[1] + t * (p2[1] - p1[1])
  return newVec2(x, y)
}

/**
 * Transforms the X coordinates of a polygon using a coordinate mapper.
 * Y coordinates remain unchanged.
 */
export function transformPolygonX(polygon: PolygonWithHoles2D, mapper: CoordinateMapper): PolygonWithHoles2D {
  return {
    outer: transformSimplePolygonX(polygon.outer, mapper),
    holes: polygon.holes.map(hole => transformSimplePolygonX(hole, mapper))
  }
}

function transformSimplePolygonX(polygon: Polygon2D, mapper: CoordinateMapper): Polygon2D {
  const transformedPoints = polygon.points
    .map(p => {
      const displayX = mapper.toDisplay(p[0])
      if (displayX === null) {
        return null // Point is in a gap, skip it
      }
      return newVec2(displayX, p[1])
    })
    .filter((p): p is Vec2 => p !== null)

  return { points: transformedPoints }
}
