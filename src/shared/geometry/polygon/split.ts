import { perpendicularCCW, perpendicularCW, scaleAddVec2 } from '@/shared/geometry/2d'
import { Bounds2D } from '@/shared/geometry/bounds'
import { type Line2D, projectPointOntoLine } from '@/shared/geometry/line'

import { ensurePolygonIsClockwise } from './basic'
import { intersectPolygon } from './boolean'
import type { Polygon2D, PolygonSide } from './types'

/**
 * Split a simple polygon by an infinite line defined by a segment.
 * Left side is perpendicular CCW from line direction, right side is perpendicular CW.
 * @param polygon - Simple polygon (no holes)
 * @param line - Line defining the split
 * @returns Array of polygon pieces with side tags
 */
export function splitPolygonByLine(polygon: Polygon2D, line: Line2D): PolygonSide[] {
  if (polygon.points.length < 3) {
    return []
  }

  const polygonCW = ensurePolygonIsClockwise(polygon)

  // Get line direction and perpendiculars
  const perpLeft = perpendicularCCW(line.direction)
  const perpRight = perpendicularCW(line.direction)

  // Create a large bounding size
  const bounds = Bounds2D.fromPoints(polygon.points)
  const basePoint = projectPointOntoLine(bounds.min, line)
  const largeSize = Math.max(bounds.width, bounds.height) * 3

  // Create two half-plane rectangles on either side of the line
  // Left half-plane (CCW perpendicular from line)
  const leftP1 = scaleAddVec2(basePoint, line.direction, -largeSize)
  const leftP2 = scaleAddVec2(basePoint, line.direction, largeSize)
  const leftP3 = scaleAddVec2(leftP2, perpLeft, largeSize)
  const leftP4 = scaleAddVec2(leftP1, perpLeft, largeSize)

  // Right half-plane (CW perpendicular from line)
  const rightP1 = scaleAddVec2(basePoint, line.direction, -largeSize)
  const rightP2 = scaleAddVec2(basePoint, line.direction, largeSize)
  const rightP3 = scaleAddVec2(rightP2, perpRight, largeSize)
  const rightP4 = scaleAddVec2(rightP1, perpRight, largeSize)

  const leftHalfPlane: Polygon2D = ensurePolygonIsClockwise({ points: [leftP1, leftP2, leftP3, leftP4] })
  const rightHalfPlane: Polygon2D = ensurePolygonIsClockwise({ points: [rightP1, rightP2, rightP3, rightP4] })

  // Use subtract to get the right side (polygon - left half-plane)
  const rightResults = intersectPolygon({ outer: polygonCW, holes: [] }, { outer: rightHalfPlane, holes: [] })

  // Use subtract to get the left side (polygon - right half-plane)
  const leftResults = intersectPolygon({ outer: polygonCW, holes: [] }, { outer: leftHalfPlane, holes: [] })

  // Collect all pieces with side tags
  const result: PolygonSide[] = []

  for (const poly of leftResults) {
    result.push({ polygon: poly.outer, side: 'left' })
  }

  for (const poly of rightResults) {
    result.push({ polygon: poly.outer, side: 'right' })
  }

  return result
}
