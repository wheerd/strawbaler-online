import { direction, perpendicular, scaleAddVec2 } from '@/shared/geometry/2d'
import { type Length } from '@/shared/geometry/basic'
import { lineIntersection } from '@/shared/geometry/line'

import { createPathD, createPathsD, getClipperModule, pathDToPoints } from './clipperInstance'
import type { Polygon2D } from './types'

export function offsetPolygon(polygon: Polygon2D, distanceValue: number): Polygon2D {
  if (distanceValue === 0) {
    return polygon
  }

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const inflated = module.InflatePathsD(
      paths,
      distanceValue,
      module.JoinType.Miter,
      module.EndType.Polygon,
      1000,
      2,
      0
    )
    try {
      const inflatedPath = inflated.get(0)
      return { points: pathDToPoints(inflatedPath) }
    } finally {
      inflated.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function polygonEdgeOffset(polygon: Polygon2D, offsets: Length[]): Polygon2D {
  const offsetLines = polygon.points.map((point, index) => {
    const dir = direction(point, polygon.points[(index + 1) % polygon.points.length])
    const outside = perpendicular(dir)
    const offsetDistance = offsets[index]
    const offsetPoint = scaleAddVec2(point, outside, offsetDistance)
    return { point: offsetPoint, direction: dir }
  })

  const points = offsetLines.map((line, index) => {
    const prevIndex = (index - 1 + offsetLines.length) % offsetLines.length
    const prevLine = offsetLines[prevIndex]
    const intersection = lineIntersection(prevLine, line)
    if (intersection) {
      return intersection
    }

    const fallbackDistance = (offsets[prevIndex] + offsets[index]) / 2
    // For colinear fall back to moving the point along the outward normal
    return scaleAddVec2(polygon.points[index], perpendicular(line.direction), fallbackDistance)
  })

  return { points }
}
