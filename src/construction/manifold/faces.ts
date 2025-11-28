import { vec3 } from 'gl-matrix'
import type { Manifold } from 'manifold-3d'

import type { PolygonWithHoles3D } from '@/shared/geometry'

/**
 * Get merged coplanar polygon faces of a manifold mesh.
 */
export function getPolygonFacesFromManifold(m: Manifold): PolygonWithHoles3D[] {
  const mesh = m.getMesh()
  const positions: vec3[] = []
  for (let i = 0; i < mesh.vertProperties.length; i += 3) {
    positions.push(vec3.fromValues(mesh.vertProperties[i], mesh.vertProperties[i + 1], mesh.vertProperties[i + 2]))
  }

  const triangles: [number, number, number][] = []
  for (let i = 0; i < mesh.triVerts.length; i += 3) {
    triangles.push([mesh.triVerts[i], mesh.triVerts[i + 1], mesh.triVerts[i + 2]])
  }

  const triangleNormals = triangles.map(t => computeTriangleNormal(positions[t[0]], positions[t[1]], positions[t[2]]))

  // Step 1: Build edge → triangle adjacency
  const edgeMap = new Map<string, number[]>()
  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  triangles.forEach((tri, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      const tris = edgeMap.get(key)
      if (tris) {
        tris.push(ti)
      } else {
        edgeMap.set(key, [ti])
      }
    }
  })

  // Step 2: Build adjacency graph of coplanar triangles
  const adj: number[][] = triangles.map(() => [])
  for (const [, tris] of edgeMap) {
    if (tris.length === 2) {
      const [t1, t2] = tris
      if (areCoplanar(triangleNormals[t1], triangleNormals[t2], positions, triangles[t1], triangles[t2])) {
        adj[t1].push(t2)
        adj[t2].push(t1)
      }
    }
  }

  // Step 3: BFS to find connected components of coplanar triangles
  const visited = new Array(triangles.length).fill(false)
  const components: number[][] = []

  for (let i = 0; i < triangles.length; i++) {
    if (visited[i]) continue
    const comp: number[] = []
    const queue = [i]
    visited[i] = true

    while (queue.length > 0) {
      const t = queue.pop()
      if (t === undefined) break
      comp.push(t)
      for (const nb of adj[t]) {
        if (!visited[nb]) {
          visited[nb] = true
          queue.push(nb)
        }
      }
    }
    components.push(comp)
  }

  // Step 4: For each coplanar component, extract boundary loops and build polygon(s)
  return components.map(comp => trianglesToPolygon(comp, triangles, positions))
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function computeTriangleNormal(a: vec3, b: vec3, c: vec3): vec3 {
  const ab = vec3.sub(vec3.create(), b, a)
  const ac = vec3.sub(vec3.create(), c, a)
  const n = vec3.cross(vec3.create(), ab, ac)
  vec3.normalize(n, n)
  return n
}

function areCoplanar(
  n1: vec3,
  n2: vec3,
  positions: vec3[],
  t1: [number, number, number],
  t2: [number, number, number],
  eps = 1e-5
): boolean {
  // Normals must match
  if (vec3.squaredDistance(n1, n2) > eps) return false

  // Check plane equation consistency
  const p1 = positions[t1[0]]
  const p2 = positions[t2[0]]

  const d1 = vec3.dot(n1, p1)
  const d2 = vec3.dot(n1, p2)
  return Math.abs(d1 - d2) < eps
}

// ---------------------------------------------------------------
// Convert a cluster of coplanar triangles into PolygonWithHoles3D
// ---------------------------------------------------------------

function trianglesToPolygon(
  comp: number[],
  triangles: [number, number, number][],
  positions: vec3[]
): PolygonWithHoles3D {
  // Find boundary edges (those belonging to exactly one triangle in component)
  const countMap = new Map<string, number>()
  const edgeToVerts = new Map<string, [number, number]>()

  const norm = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const ti of comp) {
    const tri = triangles[ti]
    for (let k = 0; k < 3; k++) {
      const a = tri[k]
      const b = tri[(k + 1) % 3]
      const key = norm(a, b)
      countMap.set(key, (countMap.get(key) || 0) + 1)
      if (!edgeToVerts.has(key)) edgeToVerts.set(key, [a, b])
    }
  }

  const boundaryEdges = [...countMap.entries()]
    .filter(([, count]) => count === 1)
    .map(([key]) => edgeToVerts.get(key))
    .filter((edge): edge is [number, number] => edge !== undefined)

  // Build adjacency so we can follow boundary loops
  const vertAdj = new Map<number, number[]>()
  for (const [a, b] of boundaryEdges) {
    const adjA = vertAdj.get(a)
    const adjB = vertAdj.get(b)
    if (adjA) {
      adjA.push(b)
    } else {
      vertAdj.set(a, [b])
    }
    if (adjB) {
      adjB.push(a)
    } else {
      vertAdj.set(b, [a])
    }
  }

  // Extract loops
  const loops: number[][] = []
  const usedEdges = new Set<string>()

  const edgeKey = (i: number, j: number) => (i < j ? `${i}_${j}` : `${j}_${i}`)

  for (const [startA, startB] of boundaryEdges) {
    const key = edgeKey(startA, startB)
    if (usedEdges.has(key)) continue

    const loop = [startA, startB]
    usedEdges.add(key)

    let current = startB
    let prev = startA

    while (true) {
      const nexts = vertAdj.get(current)
      if (!nexts) break
      const next = nexts.find(v => v !== prev)
      if (next === undefined) break

      const k2 = edgeKey(current, next)
      if (usedEdges.has(k2)) break
      usedEdges.add(k2)

      loop.push(next)

      if (next === startA) break // closed loop

      prev = current
      current = next
    }

    loops.push(loop)
  }

  // Determine outer loop by area (largest area magnitude)
  const polys = loops.map(loop => loop.map(i => positions[i]))

  const areas = polys.map(p => polygonArea3D(p))
  const outerIndex = areas.findIndex(a => Math.max(...areas) === a)

  const outer = polys[outerIndex]
  const holes = polys.filter((_, i) => i !== outerIndex)

  return {
    outer: { points: outer },
    holes: holes.map(h => ({ points: h }))
  }
}

// ---------------------------------------------------------------
// Compute area of 3D polygon via projecting to plane
// ---------------------------------------------------------------

function polygonArea3D(points: vec3[]): number {
  if (points.length < 3) return 0

  // Compute normal direction
  const p0 = points[0]
  const n = vec3.create()
  for (let i = 1; i < points.length - 1; i++) {
    const v1 = vec3.sub(vec3.create(), points[i], p0)
    const v2 = vec3.sub(vec3.create(), points[i + 1], p0)
    const cross = vec3.cross(vec3.create(), v1, v2)
    vec3.add(n, n, cross)
  }

  return vec3.length(n) * 0.5
}
