import { describe, expect, it } from 'vitest'

import { IDENTITY, composeTransform, fromTrans, newVec3, rotateZ } from '@/shared/geometry'

import { createProjectionMatrix, projectPoint } from './geometry'

describe('createProjectionMatrix', () => {
  it('should create identity matrix for XY plane (top view)', () => {
    const projection = createProjectionMatrix('xy', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Y→-Y (inverted), Z→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(-20)
    expect(result[2]).toBeCloseTo(30)
  })

  it('should create correct matrix for XZ plane (front view)', () => {
    const projection = createProjectionMatrix('xz', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // X→X, Z→-Y, Y→depth
    expect(result[0]).toBeCloseTo(10)
    expect(result[1]).toBeCloseTo(-30)
    expect(result[2]).toBeCloseTo(20)
  })

  it('should create correct matrix for YZ plane (side view)', () => {
    const projection = createProjectionMatrix('yz', 1, 1)
    const point = newVec3(10, 20, 30)
    const result = projectPoint(point, projection)

    // Y→X, Z→Y, X→depth
    expect(result[0]).toBeCloseTo(20)
    expect(result[1]).toBeCloseTo(-30)
    expect(result[2]).toBeCloseTo(10)
  })
})

describe('projectPoint', () => {
  it('should project point with combined transform + projection', () => {
    // Create a transform: translate by (100, 0, 0)
    const transform = fromTrans(newVec3(100, 0, 0))

    // Create XZ projection (front view)
    const projection = createProjectionMatrix('xz', 1, 1)

    // Combine them
    const combined = composeTransform(projection, transform)

    // Project a point at origin
    const point = newVec3(0, 0, 0)
    const result = projectPoint(point, combined)

    // After translation, point is at (100, 0, 0)
    // After XZ projection: X→X, Z→Y, Y→depth
    // Result should be (100, 0, 0)
    expect(result[0]).toBeCloseTo(100)
    expect(result[1]).toBeCloseTo(0)
    expect(result[2]).toBeCloseTo(0)
  })

  it('should handle rotation correctly', () => {
    // Create a transform: rotate 90° around Z axis
    const transform = rotateZ(IDENTITY, Math.PI / 2)

    // XY projection (top view)
    const projection = createProjectionMatrix('xy', 1, 1)

    // Combine them
    const combined = composeTransform(projection, transform)

    // Project a point on the X axis
    const point = newVec3(10, 0, 0)
    const result = projectPoint(point, combined)

    // After 90° rotation around Z, point (10, 0, 0) becomes (0, 10, 0)
    // After Y-inversion in projection: (0, -10, 0)
    expect(result[0]).toBeCloseTo(0)
    expect(result[1]).toBeCloseTo(-10)
    expect(result[2]).toBeCloseTo(0)
  })
})
