import type { Manifold } from 'manifold-3d'

import type { Projection } from '@/construction/assemblies/utils/geometry'
import { type Polygon2D, type Transform, newVec2 } from '@/shared/geometry'

// 4x4 -> 16
export type ManifoldMat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]

export function asManifoldTransform(m: Transform): ManifoldMat4 {
  // gl-matrix mat4 is already a Float32Array/Array of 16 elements
  // gl-matrix stores matrices in column-major order (WebGL standard) same as Manifold
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15] = m
  return [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15]
}

export interface ProjectedOutline {
  polygons: Polygon2D[]
}

/**
 * Projects a world-space manifold to 2D using the view projection matrix.
 *
 * The projection matrix transforms 3D world coordinates to view coordinates where:
 * - X and Y are the 2D screen coordinates
 * - Z is the depth (used for z-ordering)
 *
 * Manifold's project() method projects along the Z axis onto the XY plane,
 * so we first apply the view transformation to align the viewing plane with XY,
 * then call project() to get the 2D outline.
 *
 * @param worldManifold - Manifold in world coordinates (already transformed by element transforms)
 * @param projectionMatrix - View projection matrix that maps world coords to view coords
 * @returns Projected 2D outline polygons, or null if projection fails
 */
export function projectManifoldToView(worldManifold: Manifold, projectionMatrix: Projection): ProjectedOutline | null {
  try {
    // Apply projection to bring manifold into view space
    // where the view plane is aligned with XY
    const viewManifold = worldManifold.transform(asManifoldTransform(projectionMatrix))

    // Project onto XY plane to get 2D outline
    const crossSection = viewManifold.project()

    // Extract polygons from the cross section
    const simplePolygons = crossSection.toPolygons()

    // Convert to our Polygon2D format
    const polygons: Polygon2D[] = simplePolygons.map(sp => ({
      points: sp.map(([x, y]) => newVec2(x, y))
    }))

    return { polygons }
  } catch (error) {
    console.error('Failed to project manifold to view:', error)
    return null
  }
}
