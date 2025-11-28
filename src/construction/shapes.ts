import { vec3 } from 'gl-matrix'

import { Bounds2D, Bounds3D, type Length, type Plane3D, type PolygonWithHoles2D } from '@/shared/geometry'

/**
 * Construction parameters define HOW to build a manifold
 * Used as cache key to reuse identical geometry
 */
export type ConstructionParams = CuboidParams | ExtrusionParams | BooleanParams

export interface CuboidParams {
  type: 'cuboid'
  size: vec3 // Width, height, depth
}

export interface ExtrusionParams {
  type: 'extrusion'
  polygon: PolygonWithHoles2D
  plane: Plane3D
  thickness: Length
}

export interface BooleanParams {
  type: 'boolean'
  operation: 'union' | 'subtract' | 'intersect'
  operands: ConstructionParams[]
}

export interface ManifoldShape {
  params: ConstructionParams
  bounds: Bounds3D
}

export type Shape = ManifoldShape

/**
 * Create a cuboid shape (centered at origin)
 * Use element transform to position it
 */
export function createCuboid(size: vec3): ManifoldShape {
  return {
    params: {
      type: 'cuboid',
      size: vec3.clone(size)
    },
    bounds: Bounds3D.fromCuboid(vec3.fromValues(-size[0] / 2, -size[1] / 2, -size[2] / 2), size)
  }
}

/**
 * Create an extruded polygon shape
 */
export function createExtrudedPolygon(polygon: PolygonWithHoles2D, plane: Plane3D, thickness: Length): ManifoldShape {
  const bounds2D = Bounds2D.fromPoints(polygon.outer.points)
  const minT = Math.min(thickness, 0)
  const maxT = Math.max(thickness, 0)
  const bounds3D = bounds2D.toBounds3D(plane, minT, maxT)

  return {
    params: {
      type: 'extrusion',
      polygon,
      plane,
      thickness
    },
    bounds: bounds3D
  }
}

/**
 * Create a shape from boolean operations
 */
export function createBoolean(operation: 'union' | 'subtract' | 'intersect', shapes: ManifoldShape[]): ManifoldShape {
  const operands = shapes.map(s => s.params)
  const bounds = Bounds3D.merge(...shapes.map(s => s.bounds))

  return {
    params: {
      type: 'boolean',
      operation,
      operands
    },
    bounds
  }
}
