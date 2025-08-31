import type { Point2D } from '@/types/geometry'
import { createPoint2D } from '@/types/geometry'
import type { Wall, Corner } from '@/types/model'

export interface CornerPolygon {
  points: Point2D[]
  mainColor: string
}

/**
 * Calculates a simple miter joint polygon for a corner where multiple walls meet.
 * For now, this creates a circular approximation based on the maximum wall thickness.
 */
export function calculateCornerMiterPolygon(
  corner: Corner,
  walls: Map<string, Wall>,
  points: Map<string, { position: Point2D }>
): CornerPolygon | null {
  // Get all walls connected to this corner
  const connectedWallIds = [corner.wall1Id, corner.wall2Id, ...(corner.otherWallIds || [])]

  if (connectedWallIds.length < 2) {
    return null // Need at least 2 walls for a corner
  }

  // Get the corner point position
  const cornerPointData = points.get(corner.pointId)
  if (!cornerPointData) return null
  const cornerPoint = cornerPointData.position

  // Find the maximum thickness among connected walls
  let maxThickness = 0
  for (const wallId of connectedWallIds) {
    const wall = walls.get(wallId)
    if (wall) {
      maxThickness = Math.max(maxThickness, wall.thickness)
    }
  }

  // Create a circular polygon approximation
  // The radius is slightly smaller than half the max thickness to create proper miter joints
  const radius = (maxThickness || 200) * 0.4
  const numPoints = Math.max(8, connectedWallIds.length * 2) // More points for more complex corners

  const polygonPoints: Point2D[] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    polygonPoints.push(
      createPoint2D(Number(cornerPoint.x) + Math.cos(angle) * radius, Number(cornerPoint.y) + Math.sin(angle) * radius)
    )
  }

  // Determine the main color (use strawbale color as default)
  const mainColor = '#DAA520' // WALL_COLORS.strawbale

  return {
    points: polygonPoints,
    mainColor
  }
}

/**
 * Enhanced version that will calculate proper miter joints in the future.
 * For now, falls back to the simple circular approximation.
 */
export function calculateProperMiterPolygon(
  corner: Corner,
  walls: Map<string, Wall>,
  points: Map<string, { position: Point2D }>
): CornerPolygon | null {
  // TODO: Implement proper miter joint calculation
  // This would involve:
  // 1. Calculate wall boundary lines at the corner
  // 2. Find intersections between adjacent wall boundaries
  // 3. Create a convex polygon from the intersection points
  // 4. Handle edge cases for various wall configurations

  // For now, use the simple approach
  return calculateCornerMiterPolygon(corner, walls, points)
}
