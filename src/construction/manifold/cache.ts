import type { Manifold } from 'manifold-3d'

import type { BaseShape } from '@/construction/shapes'
import { type Vec3 } from '@/shared/geometry'

/**
 * Global cache: ConstructionParams -> Manifold
 * Shared across all shapes with identical geometry
 */
const manifoldCache = new Map<string, Manifold>()

/**
 * Generate cache key from construction parameters
 */
export function getParamsCacheKey(params: BaseShape): string {
  switch (params.type) {
    case 'cuboid':
      return `cuboid|${formatVec3(params.size)}`

    case 'extrusion': {
      const outerKey = params.polygon.outer.points.map(p => `${formatNumber(p[0])}:${formatNumber(p[1])}`).join(';')
      const holesKey =
        params.polygon.holes.length === 0
          ? 'none'
          : params.polygon.holes
              .map(h => h.points.map(p => `${formatNumber(p[0])}:${formatNumber(p[1])}`).join(';'))
              .join('|')
      return `extrusion|${params.plane}|${formatNumber(params.thickness)}|${outerKey}|${holesKey}`
    }
  }
}

/**
 * Get or create manifold from construction parameters
 */
export function getOrCreateManifold(params: BaseShape): Manifold {
  const cacheKey = getParamsCacheKey(params)

  const manifold = manifoldCache.get(cacheKey)
  if (manifold) {
    return manifold
  }

  // Will be built by builders.ts
  throw new Error(`Manifold not in cache for key: ${cacheKey}. Use buildAndCacheManifold() first.`)
}

/**
 * Store a manifold in the cache
 */
export function cacheManifold(params: BaseShape, manifold: Manifold): void {
  const cacheKey = getParamsCacheKey(params)
  manifoldCache.set(cacheKey, manifold)
}

/**
 * Check if manifold is cached
 */
export function hasManifold(params: BaseShape): boolean {
  const cacheKey = getParamsCacheKey(params)
  return manifoldCache.has(cacheKey)
}

/**
 * Clear cache (useful for memory management)
 */
export function clearManifoldCache(): void {
  manifoldCache.clear()
}

function formatNumber(n: number): string {
  return Number.parseFloat(n.toFixed(6)).toString()
}

function formatVec3(v: Vec3): string {
  return `${formatNumber(v[0])},${formatNumber(v[1])},${formatNumber(v[2])}`
}
