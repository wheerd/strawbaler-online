import { mat4 } from 'gl-matrix'
import { describe, expect, it } from 'vitest'

import { createProjectionMatrix } from '@/construction/geometry'
import { getManifoldModule } from '@/shared/geometry/manifoldInstance'

import { getVisibleFacesInViewSpace } from './faces'

describe('getVisibleFacesInViewSpace', () => {
  it('should apply backface culling for a cube in top view (XY)', () => {
    const module = getManifoldModule()

    // Create a simple 100x100x100 cube at origin
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Top view projection (looking down -Z)
    const projection = createProjectionMatrix('xy')

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // In top view of a cube, we should only see the top face (and possibly side faces if perpendicular)
    // With backface culling and excluding perpendicular faces, we should see fewer than all 6 faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6) // Should not see all faces
  })

  it('should apply backface culling for a cube in front view (XZ)', () => {
    const module = getManifoldModule()

    // Create a simple cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Front view projection (looking along -Y)
    const projection = createProjectionMatrix('xz')

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // Should only see front-facing faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6)
  })

  it('should apply backface culling for a cube in side view (YZ)', () => {
    const module = getManifoldModule()

    // Create a simple cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Side view projection (looking along -X)
    const projection = createProjectionMatrix('yz')

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, projection)

    // Should only see front-facing faces
    expect(faces.length).toBeGreaterThan(0)
    expect(faces.length).toBeLessThan(6)
  })

  it('should return empty array when all faces are back-facing', () => {
    const module = getManifoldModule()

    // Create a simple square (thin plane in XY)
    const square = module.CrossSection.square([100, 100], false).extrude(1)

    // Create a transform that rotates 180° around X axis (flips to face away)
    const transform = mat4.create()
    mat4.rotateX(transform, transform, Math.PI)

    // Top view projection
    const projection = createProjectionMatrix('xy')

    // Combine transforms
    const finalTransform = mat4.multiply(mat4.create(), projection, transform)

    // Get visible faces - should be empty since the square is facing down
    const faces = getVisibleFacesInViewSpace(square, finalTransform)

    expect(faces.length).toBe(0)
  })

  it('should handle rotated geometry correctly', () => {
    const module = getManifoldModule()

    // Create a cube
    const cube = module.Manifold.cube([100, 100, 100], false)

    // Rotate 45° around Z axis
    const rotateTransform = mat4.create()
    mat4.rotateZ(rotateTransform, rotateTransform, Math.PI / 4)

    // Top view projection
    const projection = createProjectionMatrix('xy')

    // Combine transforms
    const finalTransform = mat4.multiply(mat4.create(), projection, rotateTransform)

    // Get visible faces
    const faces = getVisibleFacesInViewSpace(cube, finalTransform)

    // Should still see only front-facing faces
    expect(faces.length).toBeGreaterThan(0)
  })
})
