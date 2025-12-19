import type { Manifold } from 'manifold-3d'

import { asManifoldTransform } from '@/construction/manifoldUtils'
import { Bounds3D, type Transform, arrayToVec3 } from '@/shared/geometry'

export function transformManifold(manifold: Manifold, transform: Transform): Manifold {
  return manifold.transform(asManifoldTransform(transform))
}

export function getBoundsFromManifold(manifold: Manifold): Bounds3D {
  const bbox = manifold.boundingBox()
  return Bounds3D.fromMinMax(arrayToVec3(bbox.min), arrayToVec3(bbox.max))
}
