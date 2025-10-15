import { vec2, vec3 } from 'gl-matrix'

// Branded numeric types for type safety
export type Length = number
export type Area = number

// Helper functions to create branded types
export const millimeters = (value: number): Length => value
export const meters = (value: number): Length => value / 1000
export const centimeters = (value: number): Length => value / 100
export const squareMeters = (value: number): Area => (value / (1000 * 1000)) as Area

// Bounds interface
export interface Bounds2D {
  min: vec2
  max: vec2
}

export function midpoint(p1: vec2, p2: vec2): vec2 {
  return vec2.lerp(vec2.create(), p1, p2, 0.5)
}

export function angle(from: vec2, to: vec2): number {
  const direction = vec2.create()
  vec2.subtract(direction, to, from)
  return Math.atan2(direction[1], direction[0])
}

export function direction(source: vec2, target: vec2): vec2 {
  return vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), target, source))
}

export function perpendicular(vector: vec2): vec2 {
  return perpendicularCCW(vector) // Default to counter-clockwise
}

export function perpendicularCCW(vector: vec2): vec2 {
  return vec2.fromValues(-vector[1], vector[0]) // Rotate 90° counterclockwise
}

export function perpendicularCW(vector: vec2): vec2 {
  return vec2.fromValues(vector[1], -vector[0]) // Rotate 90° clockwise
}

export function boundsFromPoints(points: vec2[]): Bounds2D {
  if (points.length === 0) {
    throw new Error('No points for boundary')
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  }

  return {
    min: vec2.fromValues(minX, minY),
    max: vec2.fromValues(maxX, maxY)
  }
}

export type Plane3D = 'xy' | 'xz' | 'yz'
export type Axis3D = 'x' | 'y' | 'z'

export const complementaryAxis = (plane: Plane3D): Axis3D => (plane === 'xy' ? 'z' : plane === 'xz' ? 'y' : 'x')

export interface Bounds3D {
  min: vec3
  max: vec3
}

export function boundsFromCuboid(position: vec3, size: vec3): Bounds3D {
  return {
    min: position,
    max: vec3.add(vec3.create(), position, size)
  }
}

export function boundsFromPoints3D(points: vec3[]): Bounds3D | null {
  if (points.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const point of points) {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    minZ = Math.min(minZ, point[2])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
    maxZ = Math.max(maxZ, point[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}

export function mergeBounds(...bounds: Bounds3D[]): Bounds3D {
  if (bounds.length === 0) throw new Error('No bounds to merge')

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity

  for (const bound of bounds) {
    minX = Math.min(minX, bound.min[0])
    minY = Math.min(minY, bound.min[1])
    minZ = Math.min(minZ, bound.min[2])
    maxX = Math.max(maxX, bound.max[0])
    maxY = Math.max(maxY, bound.max[1])
    maxZ = Math.max(maxZ, bound.max[2])
  }

  return {
    min: vec3.fromValues(minX, minY, minZ),
    max: vec3.fromValues(maxX, maxY, maxZ)
  }
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
