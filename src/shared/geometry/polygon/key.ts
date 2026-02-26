import { type Vec2, lenVec2, subVec2 } from '@/shared/geometry/2d'
import { radiansToDegrees } from '@/shared/geometry/basic'

/**
 * Compute a canonical (rotation/translation/start-index/mirror) invariant key
 * for a simple polygon whose vertices are given in boundary order.
 *
 * @param points Boundary-ordered polygon vertices; last vertex is NOT repeated.
 * @throws Error if polygon has <3 unique points or an edge is (near-)degenerate.
 */
export function canonicalPolygonKey(points: Vec2[]): string {
  const minEdge = 1e-12
  const n = points.length

  if (n < 3) throw new Error('Need at least 3 vertices.')
  // Build edge vectors and lengths
  const e = new Array<Vec2>(n)
  const L = new Array<number>(n)

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const ev = subVec2(points[j], points[i])
    const len = lenVec2(ev)
    if (!(len > minEdge)) {
      throw new Error(`Degenerate or near-zero length edge at index ${i}.`)
    }
    e[i] = ev
    L[i] = len
  }

  // Turn angles alpha_i between e_i and e_{i+1}
  const A = new Array<number>(n)
  for (let i = 0; i < n; i++) {
    const a = e[i]
    const b = e[(i + 1) % n]
    const cross = a[0] * b[1] - a[1] * b[0]
    const dot = a[0] * b[0] + a[1] * b[1]
    const angle = Math.atan2(cross, dot) // in (-pi, pi]
    A[i] = radiansToDegrees(angle)
  }

  // Build paired sequence S = [(L0, A0), ..., (L_{n-1}, A_{n-1})]
  const S = new Array<Pair>(n)
  for (let i = 0; i < n; i++) {
    S[i] = {
      l: Math.round(L[i]),
      a: Math.round(A[i])
    }
  }

  // Reversed-orientation sequence: rev(S) = [(L_{n-1}, -A_{n-1}), ..., (L_0, -A_0)]
  const R = new Array<Pair>(n)
  for (let i = 0; i < n; i++) {
    const k = n - 1 - i
    R[i] = {
      l: Math.round(L[k]),
      a: Math.round(-A[k])
    }
  }

  // Mirrored sequence M = [(L0, -A0), ..., (L_{n-1}, -A_{n-1})]
  const M = new Array<Pair>(n)
  for (let i = 0; i < n; i++) {
    M[i] = {
      l: Math.round(L[i]),
      a: Math.round(-A[i])
    }
  }

  // Canonicalize each by minimal cyclic rotation (Booth)
  const Sstar = minimalRotationPairs(S)
  const Rstar = minimalRotationPairs(R)
  const Mstar = minimalRotationPairs(M)

  // Serialize all; choose lexicographically smallest
  const s1 = Sstar.map(p => `${p.l},${p.a}`).join(';')
  const s2 = Rstar.map(p => `${p.l},${p.a}`).join(';')
  const s3 = Mstar.map(p => `${p.l},${p.a}`).join(';')
  return [s1, s2, s3].sort()[0]
}

/** Pair of (edge length, turn angle). */
interface Pair {
  l: number
  a: number
}

/** Lexicographic comparator for Pair. */
function cmpPair(x: Pair, y: Pair): number {
  if (x.l < y.l) return -1
  if (x.l > y.l) return 1
  if (x.a < y.a) return -1
  if (x.a > y.a) return 1
  return 0
}

/**
 * Booth's algorithm for minimal rotation over an array of Pair.
 * Returns a rotated copy that is lexicographically minimal among all rotations.
 * Runs in O(n).
 */
function minimalRotationPairs(arr: Pair[]): Pair[] {
  const n = arr.length
  if (n === 0) return []
  // Compare arr[i+k] vs arr[j+k] cyclically
  let i = 0
  let j = 1
  let k = 0
  while (i < n && j < n && k < n) {
    const ai = arr[(i + k) % n]
    const aj = arr[(j + k) % n]
    const c = cmpPair(ai, aj)
    if (c === 0) {
      k++
    } else if (c < 0) {
      // rotation at i is better; skip conflicting block after j
      j = j + k + 1
      if (j === i) j++
      k = 0
    } else {
      // rotation at j is better
      i = i + k + 1
      if (i === j) i++
      k = 0
    }
  }
  const start = Math.min(i, j)
  return rotatePairs(arr, start)
}

function rotatePairs(arr: Pair[], start: number): Pair[] {
  const n = arr.length
  const out = new Array<Pair>(n)
  for (let t = 0; t < n; t++) {
    out[t] = arr[(start + t) % n]
  }
  return out
}
