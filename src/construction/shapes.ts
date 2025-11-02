import { vec2, vec3 } from 'gl-matrix'

import { Bounds2D, Bounds3D, type Length, type Plane3D, type PolygonWithHoles2D } from '@/shared/geometry'

export type Shape = Cuboid | ExtrudedPolygon

interface ShapeBase {
  readonly bounds: Bounds3D
}

export interface Cuboid extends ShapeBase {
  type: 'cuboid'
  offset: vec3 // Local coordinate system
  size: vec3 // Non-negative with axis same as offset
}

export interface ExtrudedPolygon extends ShapeBase {
  type: 'polygon'
  polygon: PolygonWithHoles2D
  plane: Plane3D
  thickness: Length
}

export const createCuboidShape = (offset: vec3, size: vec3): Cuboid => ({
  type: 'cuboid',
  offset,
  size,
  bounds: Bounds3D.fromCuboid(offset, size)
})

export const createExtrudedPolygon = (
  polygon: PolygonWithHoles2D,
  plane: Plane3D,
  thickness: Length
): ExtrudedPolygon => {
  const bounds2D = Bounds2D.fromPoints(polygon.outer.points)
  const minT = Math.min(thickness, 0)
  const maxT = Math.max(thickness, 0)
  const bounds3D = bounds2D.toBounds3D(plane, minT, maxT)
  return {
    type: 'polygon',
    polygon,
    plane,
    thickness,
    bounds: bounds3D
  }
}

export interface Face3D {
  outer: vec3[]
  holes: vec3[][]
}

function point2DTo3D(p: vec2, plane: Plane3D, z: number) {
  switch (plane) {
    case 'xy':
      return vec3.fromValues(p[0], p[1], z)
    case 'xz':
      return vec3.fromValues(p[0], z, p[1])
    case 'yz':
      return vec3.fromValues(z, p[0], p[1])
  }
}

export function* extrudedPolygonFaces(polygon: ExtrudedPolygon): Generator<Face3D> {
  yield {
    outer: polygon.polygon.outer.points.map(p => point2DTo3D(p, polygon.plane, 0)),
    holes: polygon.polygon.holes.map(h => h.points.map(p => point2DTo3D(p, polygon.plane, 0)))
  }
  yield {
    outer: polygon.polygon.outer.points.map(p => point2DTo3D(p, polygon.plane, polygon.thickness)),
    holes: polygon.polygon.holes.map(h => h.points.map(p => point2DTo3D(p, polygon.plane, polygon.thickness)))
  }
  const op = polygon.polygon.outer.points
  for (let i = 0; i < op.length; i++) {
    yield {
      outer: [
        point2DTo3D(op[i], polygon.plane, 0),
        point2DTo3D(op[(i + 1) % op.length], polygon.plane, 0),
        point2DTo3D(op[(i + 1) % op.length], polygon.plane, polygon.thickness),
        point2DTo3D(op[i], polygon.plane, polygon.thickness)
      ],
      holes: []
    }
  }
  for (const hole of polygon.polygon.holes) {
    const op = hole.points
    for (let i = 0; i < op.length; i++) {
      yield {
        outer: [
          point2DTo3D(op[i], polygon.plane, 0),
          point2DTo3D(op[(i + 1) % op.length], polygon.plane, 0),
          point2DTo3D(op[(i + 1) % op.length], polygon.plane, polygon.thickness),
          point2DTo3D(op[i], polygon.plane, polygon.thickness)
        ],
        holes: []
      }
    }
  }
}
