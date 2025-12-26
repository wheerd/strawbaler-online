import { type Vec2, newVec2, normVec2, subVec2 } from '@/shared/geometry'

/**
 * Calculate the interior angle at a vertex in degrees (0-360).
 * Uses the vectors from vertex to previous and next points.
 */
export function calculateInteriorAngle(prevPoint: Vec2, vertex: Vec2, nextPoint: Vec2): number {
  // Vectors from vertex to neighbors
  const v1 = normVec2(subVec2(prevPoint, vertex))
  const v2 = normVec2(subVec2(nextPoint, vertex))

  // Calculate angle using atan2
  const angle1 = Math.atan2(v1[1], v1[0])
  const angle2 = Math.atan2(v2[1], v2[0])

  // Interior angle is the difference
  let angle = angle2 - angle1

  // Normalize to 0-360 range
  if (angle < 0) {
    angle += 2 * Math.PI
  }

  // Convert to degrees
  return (angle * 180) / Math.PI
}

/**
 * Determine if an angle is close to 90 degrees (within ±1 degree tolerance).
 */
export function isRightAngle(angle: number): boolean {
  const normalized = angle % 360
  return Math.abs(normalized - 90) < 1 || Math.abs(normalized - 270) < 1
}

/**
 * Get the smaller of interior/exterior angle and whether to use exterior side.
 * Returns the angle (0-180) and whether the exterior angle is smaller.
 */
export function getSmallerAngle(interiorAngle: number): {
  angle: number
  useExterior: boolean
} {
  const exteriorAngle = 360 - interiorAngle

  if (interiorAngle <= 180) {
    return { angle: interiorAngle, useExterior: false }
  } else {
    return { angle: exteriorAngle, useExterior: true }
  }
}

/**
 * Calculate the two edge direction vectors from a vertex.
 * Returns normalized vectors pointing away from the vertex.
 */
export function getEdgeDirections(
  prevPoint: Vec2,
  vertex: Vec2,
  nextPoint: Vec2
): {
  dir1: Vec2
  dir2: Vec2
} {
  const dir1 = normVec2(subVec2(prevPoint, vertex))
  const dir2 = normVec2(subVec2(nextPoint, vertex))

  return { dir1, dir2 }
}

export function getAngleBisector(prevPoint: Vec2, vertex: Vec2, nextPoint: Vec2): Vec2 {
  const v1 = normVec2(subVec2(prevPoint, vertex))
  const v2 = normVec2(subVec2(nextPoint, vertex))
  return normVec2(newVec2(v1[0] + v2[0], v1[1] + v2[1]))
}
