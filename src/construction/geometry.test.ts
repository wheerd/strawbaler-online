import { mat4, vec2, vec3 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import {
  IDENTITY,
  type Projection,
  type RotationProjection,
  WallConstructionArea,
  createSvgTransform
} from './geometry'

describe('createSvgTransform', () => {
  it('should create correct SVG transform string', () => {
    const transform = mat4.create()
    mat4.identity(transform)
    mat4.translate(transform, transform, vec3.fromValues(100, 200, 0))
    mat4.rotateZ(transform, transform, Math.PI / 4) // 45 degrees in radians

    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = rot => (rot[2] / Math.PI) * 180 // Convert Z rotation to degrees

    const result = createSvgTransform(transform, mockProjection, mockRotationProjection)

    expect(result).toMatch(/^translate\(100 200\) rotate\(45(\.\d+)?\)$/)
  })

  it('should handle IDENTITY transform', () => {
    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = _rot => 0

    const result = createSvgTransform(IDENTITY, mockProjection, mockRotationProjection)

    expect(result).toBe(undefined)
  })

  it('should handle negative coordinates and rotation', () => {
    const transform = mat4.create()
    mat4.identity(transform)
    mat4.translate(transform, transform, vec3.fromValues(-50, -75, 10))
    mat4.rotateZ(transform, transform, -Math.PI / 2) // -90 degrees

    const mockProjection: Projection = pos => vec3.fromValues(pos[0], pos[1], pos[2])
    const mockRotationProjection: RotationProjection = rot => (rot[2] / Math.PI) * 180

    const result = createSvgTransform(transform, mockProjection, mockRotationProjection)

    expect(result).toMatch(/^translate\(-50 -75\) rotate\(-90(\.\d+)?\)$/)
  })
})

describe('WallConstructionArea.withZAdjustment', () => {
  it('should adjust area without roof offsets', () => {
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000))

    const adjusted = area.withZAdjustment(100, 1000)

    expect(adjusted.position).toEqual(vec3.fromValues(0, 0, 100))
    expect(adjusted.size).toEqual(vec3.fromValues(3000, 300, 1000))
    expect(adjusted.topOffsets).toBeUndefined()
  })

  it('should add intersection points when roof is partially clipped', () => {
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000), [
      vec2.fromValues(0, -200), // Roof at Z=2800
      vec2.fromValues(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 2700)

    // At X=0: roof at 2800, above 2700 -> clipped to 0
    // At X=3000: roof at 2500, below 2700 -> offset -200
    // Should have intersection point where roof crosses 2700
    expect(adjusted.topOffsets!.length).toBeGreaterThan(2)

    // First point should be clipped
    expect(adjusted.topOffsets![0][0]).toBe(0)
    expect(adjusted.topOffsets![0][1]).toBe(0)

    // Should have an intersection point
    const intersectionPoint = adjusted.topOffsets![1]
    expect(intersectionPoint[1]).toBe(0) // At the boundary
    expect(intersectionPoint[0]).toBeGreaterThan(0)
    expect(intersectionPoint[0]).toBeLessThan(3000)

    // Last point should be unclipped
    const lastPoint = adjusted.topOffsets![adjusted.topOffsets!.length - 1]
    expect(lastPoint[0]).toBe(3000)
    expect(lastPoint[1]).toBe(-200)
  })

  it('should handle fully clipped roof', () => {
    const area = new WallConstructionArea(vec3.fromValues(0, 0, 0), vec3.fromValues(3000, 300, 3000), [
      vec2.fromValues(0, -200), // Roof at Z=2800
      vec2.fromValues(3000, -500) // Roof at Z=2500
    ])

    const adjusted = area.withZAdjustment(0, 1100)

    // Both points above new top (1100), should be clipped to 0
    expect(adjusted.topOffsets).toHaveLength(2)
    expect(adjusted.topOffsets![0][1]).toBe(0)
    expect(adjusted.topOffsets![1][1]).toBe(0)
  })
})
