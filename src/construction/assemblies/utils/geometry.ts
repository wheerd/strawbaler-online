import type { GroupOrElement } from '@/construction/model/elements'
import {
  type Axis3D,
  Bounds2D,
  Bounds3D,
  IDENTITY,
  type Plane3D,
  type Transform,
  type Vec2,
  type Vec3,
  composeTransform,
  newVec2,
  newVec3,
  transform,
  transformFromValues
} from '@/shared/geometry'

export function transformBounds(bounds: Bounds3D, t: Transform): Bounds3D {
  // Transform all 8 corner points of the bounding box
  const corners = [
    newVec3(bounds.min[0], bounds.min[1], bounds.min[2]), // min corner
    newVec3(bounds.max[0], bounds.min[1], bounds.min[2]),
    newVec3(bounds.min[0], bounds.max[1], bounds.min[2]),
    newVec3(bounds.min[0], bounds.min[1], bounds.max[2]),
    newVec3(bounds.max[0], bounds.max[1], bounds.min[2]),
    newVec3(bounds.max[0], bounds.min[1], bounds.max[2]),
    newVec3(bounds.min[0], bounds.max[1], bounds.max[2]),
    newVec3(bounds.max[0], bounds.max[1], bounds.max[2]) // max corner
  ]

  const transformedCorners = corners.map(corner => transform(corner, t))

  return Bounds3D.fromPoints(transformedCorners)
}

export type ZOrder = (
  a: { bounds: Bounds3D; transform?: Transform },
  b: { bounds: Bounds3D; transform?: Transform }
) => number

export const createZOrder = (axis: Axis3D, viewOrder: 'ascending' | 'descending'): ZOrder => {
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2

  if (viewOrder === 'descending') {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For front view: sort by front face (max), farthest front face first
      return aBounds.max[axisIndex] - bBounds.max[axisIndex]
    }
  } else {
    return (a, b) => {
      const aBounds = a.transform ? transformBounds(a.bounds, a.transform) : a.bounds
      const bBounds = b.transform ? transformBounds(b.bounds, b.transform) : b.bounds
      // For back view: sort by back face (min), farthest back face first
      return bBounds.min[axisIndex] - aBounds.min[axisIndex]
    }
  }
}

export const bounds3Dto2D = (bounds: Bounds3D, projection: Projection): Bounds2D => {
  // Project all 8 corners and find 2D bounds
  const corners: Vec3[] = [
    [bounds.min[0], bounds.min[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.min[2]],
    [bounds.min[0], bounds.max[1], bounds.min[2]],
    [bounds.min[0], bounds.min[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.min[2]],
    [bounds.max[0], bounds.min[1], bounds.max[2]],
    [bounds.min[0], bounds.max[1], bounds.max[2]],
    [bounds.max[0], bounds.max[1], bounds.max[2]]
  ].map(corner => newVec3(corner[0], corner[1], corner[2]))

  // Project all corners to 2D
  const projectedCorners = corners.map(corner => {
    const projected = projectPoint(corner, projection)
    return newVec2(projected[0], projected[1])
  })

  // Find 2D bounds from projected points
  return Bounds2D.fromPoints(projectedCorners)
}

/**
 * Projection is now a transformation matrix that converts 3D world coordinates
 * to 2D view coordinates. The z-component of the result is used for depth ordering.
 */
export type Projection = Transform

export type CutFunction = (element: { bounds: Bounds3D; transform?: Transform }) => boolean

/**
 * Create a projection matrix that transforms 3D world coordinates to 2D view coordinates
 * based on the viewing plane. The resulting coordinates are [x, y, depth] where depth is
 * used for z-ordering.
 *
 * @param plane - The viewing plane (xy = top view, xz = front view, yz = side view)
 * @returns A 4x4 projection matrix
 */
export const createProjectionMatrix = (plane: Plane3D, z: -1 | 1, x: -1 | 1): Projection => {
  switch (plane) {
    case 'xy':
      // Top view: X→X, Y→Y (inverted), Z→depth
      // prettier-ignore
      return transformFromValues(
        x,  0,  0,  0,
        0, -1,  0,  0,
        0,  0,  z,  0,
        0,  0,  0,  1 
      )

    case 'xz':
      // Front view: X→X, Z→Y, Y→depth
      // prettier-ignore
      return transformFromValues(
        x,  0,  0,  0,
        0,  0,  z,  0,
        0, -1,  0,  0,
        0,  0,  0,  1 
      )

    case 'yz':
      // Side view: Y→X, Z→Y, X→depth
      // prettier-ignore
      return transformFromValues(
        0,  0,  z,  0,
        x,  0,  0,  0,
        0, -1,  0,  0, 
        0,  0,  0,  1  
      )

    default:
      throw new Error(`Unknown plane: ${plane}`)
  }
}

/**
 * Project a 3D point using a projection matrix.
 * Returns [x, y, depth] where depth is used for z-ordering.
 *
 * @param point - The 3D point to project
 * @param matrix - The projection matrix (or combined projection + transform matrix)
 * @returns Projected point with depth component
 */
export const projectPoint = (point: Vec3, matrix: Projection): Vec3 => {
  return transform(point, matrix)
}

/**
 * Generate all corner points of an element's bounds, projected to 2D.
 * Accumulates transforms through the hierarchy.
 *
 * @param element - The element or group to get points from
 * @param projectionMatrix - The projection matrix for the current view
 * @param parentTransform - Accumulated parent transform (identity for top-level elements)
 */
export function* allPoints(
  element: GroupOrElement,
  projectionMatrix: Projection,
  parentTransform: Transform = IDENTITY
): Generator<Vec2> {
  // Accumulate transform: parent * element
  const accumulatedTransform = composeTransform(parentTransform, element.transform)

  if ('shape' in element) {
    // Combine projection with accumulated transform
    const finalTransform = composeTransform(projectionMatrix, accumulatedTransform)

    // Get all 4 corners of the shape bounds (fixing bug: was using element.bounds instead of element.shape.bounds)
    const corners: Vec3[] = [
      element.shape.bounds.min,
      newVec3(element.shape.bounds.min[0], element.shape.bounds.max[1], element.shape.bounds.min[2]),
      element.shape.bounds.max,
      newVec3(element.shape.bounds.max[0], element.shape.bounds.min[1], element.shape.bounds.max[2])
    ]

    // Project all corners
    for (const corner of corners) {
      const projected = projectPoint(corner, finalTransform)
      yield newVec2(projected[0], projected[1])
    }
  } else if ('children' in element) {
    // Recursively get points from children, passing accumulated transform
    for (const child of element.children) {
      yield* allPoints(child, projectionMatrix, accumulatedTransform)
    }
  }
}
