import { mat3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import {
  type Transform3,
  type Vec3,
  ZERO_VEC3,
  copyVec3,
  crossVec3,
  dotVec3,
  lenSqrVec3,
  lenVec3,
  newVec3,
  normVec3,
  scaleAddVec3,
  scaleVec3,
  subVec3
} from '@/shared/geometry'

export interface OBB {
  center: Vec3
  axes: [Vec3, Vec3, Vec3]
  halfSizes: Vec3
  volume: number
  /** 8 corners in world coordinates (useful for visualization) */
  corners: Vec3[]
  /** rotation matrix (columns are axes): mat3.fromValues(x.x, y.x, z.x, x.y, y.y, z.y, x.z, y.z, z.z) */
  rotation: Transform3
}

export function computeMinimumVolumeOBB(manifold: Manifold): OBB {
  const hull = manifold.hull()
  const mesh = hull.getMesh()

  // Expect mesh.vertProperties as flat array [x0,y0,z0, x1,y1,z1, ...]
  const verts: Vec3[] = []
  const vprops = mesh.vertProperties
  for (let i = 0; i + 2 < vprops.length; i += 3) {
    verts.push(newVec3(vprops[i], vprops[i + 1], vprops[i + 2]))
  }

  const triVerts = mesh.triVerts

  // helper: compute triangle normal
  const triNormal = (i0: number, i1: number, i2: number): Vec3 => {
    const a = verts[i0]
    const b = verts[i1]
    const c = verts[i2]
    const ab = subVec3(b, a)
    const ac = subVec3(c, a)
    const n = crossVec3(ab, ac)
    const len = lenVec3(n)
    if (len > 0) return scaleVec3(n, 1 / len)
    else return ZERO_VEC3
  }

  // iterate every triangle as candidate orientation
  let best: OBB | null = null
  const triCount = Math.floor(triVerts.length / 3)

  for (let ti = 0; ti < triCount; ti++) {
    const i0 = triVerts[3 * ti]
    const i1 = triVerts[3 * ti + 1]
    const i2 = triVerts[3 * ti + 2]

    // compute normal (Z axis)
    const z = triNormal(i0, i1, i2)
    if (lenSqrVec3(z) < 1e-12) continue // degenerate face

    // choose an edge direction as initial X (try edge i1-i0)
    const edge = subVec3(verts[i1], verts[i0])
    // orthogonalize edge to z: x = normalize(edge - (edge·z) z)
    const proj = scaleVec3(z, dotVec3(edge, z))
    let x = subVec3(edge, proj)
    if (lenSqrVec3(x) < 1e-12) {
      // if that edge is parallel to normal, try another edge i2-i0
      const edge2 = subVec3(verts[i2], verts[i0])
      const proj2 = scaleVec3(z, dotVec3(edge2, z))
      x = subVec3(edge2, proj2)
      if (lenSqrVec3(x) < 1e-12) continue // can't form basis here
    }
    x = normVec3(x)

    // y = z cross x (ensures right-handed orthonormal frame)
    const y = normVec3(crossVec3(z, x))

    // build rotation axes (columns)
    // We will compute coordinates by dot(p, axis) for each axis
    // For numerical stability, prefer storing axes as normalized vec3s
    // axes: x, y, z
    // project all vertices into this local frame and compute bounding box
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let minZ = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let maxZ = Number.NEGATIVE_INFINITY

    for (const p of verts) {
      const px = dotVec3(p, x)
      const py = dotVec3(p, y)
      const pz = dotVec3(p, z)

      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      if (pz < minZ) minZ = pz
      if (pz > maxZ) maxZ = pz
    }

    const sizeX = maxX - minX
    const sizeY = maxY - minY
    const sizeZ = maxZ - minZ

    // if any dimension degenerate, skip
    if (sizeX <= 0 || sizeY <= 0 || sizeZ <= 0) continue

    const volume = sizeX * sizeY * sizeZ

    if (best === null || volume < best.volume) {
      // build center in local coords and convert to world
      const cx = (minX + maxX) * 0.5
      const cy = (minY + maxY) * 0.5
      const cz = (minZ + maxZ) * 0.5

      // worldCenter = x*cx + y*cy + z*cz
      const center = scaleAddVec3(scaleAddVec3(scaleVec3(x, cx), y, cy), z, cz)

      const halfSizes = newVec3(sizeX * 0.5, sizeY * 0.5, sizeZ * 0.5)

      // rotation matrix: columns are axes x,y,z
      const rotation = mat3.fromValues(x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]) as Transform3

      // compute 8 corners in world coords: ±halfSizes along axes added to center
      const corners: Vec3[] = []
      for (let sx = -1; sx <= 1; sx += 2) {
        for (let sy = -1; sy <= 1; sy += 2) {
          for (let sz = -1; sz <= 1; sz += 2) {
            const corner = scaleAddVec3(
              scaleAddVec3(scaleAddVec3(center, x, sx * halfSizes[0]), y, sy * halfSizes[1]),
              z,
              sz * halfSizes[2]
            )
            corners.push(corner)
          }
        }
      }

      best = {
        center,
        axes: [copyVec3(x), copyVec3(y), copyVec3(z)],
        halfSizes,
        volume,
        corners,
        rotation
      }
    }
  } // end tri loop

  if (!best) {
    throw new Error('Failed to compute OBB: degenerate mesh or no valid candidate orientations')
  }

  return best
}
