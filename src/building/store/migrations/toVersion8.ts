import type { Opening, PerimeterWall } from '@/building/model'
import type { OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { OpeningAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'

import type { Migration } from './shared'
import { getPersistedConfigStoreState, isRecord } from './shared'

/**
 * Migration to version 8: Convert opening dimensions from finished to fitted
 *
 * Changes:
 * - Opening width/height now include padding (fitted dimensions)
 * - Opening sillHeight now EXCLUDES padding (fitted dimension - starts lower)
 * - Center position UNCHANGED (geometrically invariant to padding)
 *
 * Conversion formulas:
 * - fitted width = finished width + 2 × padding
 * - fitted height = finished height + 2 × padding
 * - fitted sillHeight = max(0, finished sillHeight - padding)
 *
 * Fallback: If padding cannot be determined, uses 0mm (no conversion)
 */
export const migrateToVersion8: Migration = state => {
  if (!isRecord(state)) return

  // Get config store state for padding resolution
  const configState = getPersistedConfigStoreState()
  const wallAssemblyConfigs = configState?.wallAssemblyConfigs
  const openingAssemblyConfigs = configState?.openingAssemblyConfigs

  if (isRecord(state.perimeters)) {
    for (const perimeter of Object.values(state.perimeters)) {
      if (isRecord(perimeter) && Array.isArray(perimeter.walls)) {
        for (const wall of perimeter.walls) {
          if (isRecord(wall) && Array.isArray(wall.openings)) {
            for (const opening of wall.openings) {
              if (isRecord(opening) && typeof opening.width === 'number' && typeof opening.height === 'number') {
                // Resolve padding for this opening
                const padding = resolvePaddingForOpening(opening, wall, wallAssemblyConfigs, openingAssemblyConfigs)

                // IMPORTANT: centerOffsetFromWallStart UNCHANGED!
                // It's geometrically invariant to padding

                // Convert dimensions: add padding to width/height
                opening.width = opening.width + 2 * padding
                opening.height = opening.height + 2 * padding

                // Convert sill: subtract padding and clamp to 0
                if (typeof opening.sillHeight === 'number') {
                  opening.sillHeight = Math.max(0, opening.sillHeight - padding)
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Resolve padding for an opening using inheritance chain:
 * 1. Opening's openingAssemblyId
 * 2. Wall's wallAssemblyId → openingAssemblyId
 * 3. Fallback: 0mm (no conversion)
 */
function resolvePaddingForOpening(
  opening: Opening,
  wall: PerimeterWall,
  wallAssemblyConfigs: Record<WallAssemblyId, WallAssemblyConfig> | undefined,
  openingAssemblyConfigs: Record<OpeningAssemblyId, OpeningAssemblyConfig> | undefined
): number {
  // Try opening-specific assembly
  if (opening.openingAssemblyId && openingAssemblyConfigs) {
    const assembly = openingAssemblyConfigs[opening.openingAssemblyId as OpeningAssemblyId]
    if (assembly && typeof assembly.padding === 'number') {
      return assembly.padding
    }
  }

  // Try wall's assembly → opening assembly
  if (wall.wallAssemblyId && wallAssemblyConfigs && openingAssemblyConfigs) {
    const wallAssembly = wallAssemblyConfigs[wall.wallAssemblyId as WallAssemblyId]
    if (wallAssembly && wallAssembly.openingAssemblyId) {
      const assembly = openingAssemblyConfigs[wallAssembly.openingAssemblyId]
      if (assembly && typeof assembly.padding === 'number') {
        return assembly.padding
      }
    }
  }

  // Fallback: 0mm padding (no conversion)
  // This makes missing configs obvious - dimensions stay as-is
  return 0
}
