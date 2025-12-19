import { vec3 } from 'gl-matrix'

import { type Vec2 } from './2d'

export type Length = number
export type Area = number
export type Volume = number

// Helper functions to create branded types
export const millimeters = (value: number): Length => value
export const meters = (value: number): Length => value * 1000
export const centimeters = (value: number): Length => value * 100
export const squareMeters = (value: number): Area => value * 1000 * 1000
export const cubicMeters = (value: number): Volume => value * 1000 * 1000 * 1000

export type Plane3D = 'xy' | 'xz' | 'yz'
export type Axis3D = 'x' | 'y' | 'z'

export const complementaryAxis = (plane: Plane3D): Axis3D => (plane === 'xy' ? 'z' : plane === 'xz' ? 'y' : 'x')

export const point2DTo3D = (point: Vec2, plane: Plane3D, offset: Length): vec3 =>
  plane === 'xy'
    ? vec3.fromValues(point[0], point[1], offset)
    : plane === 'xz'
      ? vec3.fromValues(point[0], offset, point[1])
      : vec3.fromValues(offset, point[0], point[1])

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
