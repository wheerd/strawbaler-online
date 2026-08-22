import type { LineSegment2D, Polygon2D, Vec2 } from '@/shared/geometry'
import { eqVec2 } from '@/shared/geometry'
import { isPointInPolygon, segmentsIntersect } from '@/shared/geometry/polygon'

export interface WallValidationLine {
  wallId: string
  line: LineSegment2D
}

export interface WallValidationContext {
  polygon: Polygon2D
  lines: WallValidationLine[]
  allowedIntersections?: WallAllowedIntersection[]
}

export interface WallAllowedIntersection {
  candidateWallId: string
  existingWallId: string
}

export interface WallValidationInput {
  points: Vec2[]
  segments: LineSegment2D[]
  candidateLines?: WallValidationLine[]
  excludedWallIds?: string[]
}

export function isWallGeometryValid(
  { points, segments, candidateLines = [], excludedWallIds = [] }: WallValidationInput,
  { polygon, lines, allowedIntersections = [] }: WallValidationContext
): boolean {
  if (points.some(point => !isPointInPolygon(point, polygon))) return false

  const candidateSegments: { wallId?: string; line: LineSegment2D }[] = candidateLines.length
    ? candidateLines.map(({ wallId, line }) => ({ wallId, line }))
    : segments.map(line => ({ line }))

  for (const { wallId: candidateWallId, line: segment } of candidateSegments) {
    for (const existing of lines) {
      if (excludedWallIds.includes(existing.wallId)) continue
      if (
        segmentsIntersect(segment.start, segment.end, existing.line.start, existing.line.end) &&
        !allowedIntersections.some(
          allowed => allowed.candidateWallId === candidateWallId && allowed.existingWallId === existing.wallId
        )
      ) {
        return false
      }
    }
  }

  for (let index = 0; index < candidateLines.length; index++) {
    const current = candidateLines[index]
    for (const other of candidateLines.slice(index + 1)) {
      if (current.wallId === other.wallId) continue
      const sharesEndpoint =
        eqVec2(current.line.start, other.line.start) ||
        eqVec2(current.line.start, other.line.end) ||
        eqVec2(current.line.end, other.line.start) ||
        eqVec2(current.line.end, other.line.end)
      if (
        !sharesEndpoint &&
        segmentsIntersect(current.line.start, current.line.end, other.line.start, other.line.end)
      ) {
        return false
      }
    }
  }

  return true
}
