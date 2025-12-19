import type { Transform } from '@/shared/geometry'

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
