import type { OpeningAssemblyId, WallAssemblyId } from '@/building/model/ids'
import type { OpeningAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'
import type { Length } from '@/shared/geometry'

import type { Migration } from './shared'
import { getPersistedConfigStoreState, isRecord } from './shared'

const toNumber = (value: Length | undefined): number => Number(value ?? 0)

const clampLength = (value: number): Length => (value > 0 ? value : 0) as Length

const constructionOffsetToFinished = (offset: Length, padding: Length): Length =>
  clampLength(toNumber(offset) + toNumber(padding))

const constructionSillToFinished = (sillHeight: Length | undefined, padding: Length): Length | undefined => {
  if (sillHeight == null) return undefined
  return clampLength(toNumber(sillHeight) + toNumber(padding))
}

const constructionWidthToFinished = (width: Length, padding: Length): Length =>
  clampLength(toNumber(width) - 2 * toNumber(padding))

const constructionHeightToFinished = (height: Length, padding: Length): Length =>
  clampLength(toNumber(height) - 2 * toNumber(padding))

const getPadding = (
  assemblyId: WallAssemblyId | undefined,
  configs: Record<WallAssemblyId, WallAssemblyConfig> | undefined,
  openingAssemblies: Record<OpeningAssemblyId, OpeningAssemblyConfig> | undefined,
  defaultOpeningAssemblyId: OpeningAssemblyId | undefined
): number => {
  if (!assemblyId || !configs || !openingAssemblies) return 0
  const wallConfig = configs[assemblyId]
  const openingAssemblyId = wallConfig?.openingAssemblyId || defaultOpeningAssemblyId
  if (!openingAssemblyId) return 0
  return Number(openingAssemblies[openingAssemblyId]?.padding ?? 0)
}

export const migrateToVersion5: Migration = state => {
  if (!isRecord(state)) return

  const perimeters = state.perimeters
  if (!isRecord(perimeters)) return

  const configState = getPersistedConfigStoreState()
  const wallAssemblyConfigs = configState?.wallAssemblyConfigs
  const openingAssemblyConfigs = configState?.openingAssemblyConfigs
  const defaultOpeningAssemblyId = configState?.defaultOpeningAssemblyId as OpeningAssemblyId | undefined

  for (const perimeter of Object.values(perimeters)) {
    if (!isRecord(perimeter)) continue
    const walls = perimeter.walls
    if (!Array.isArray(walls)) continue

    for (const wall of walls) {
      if (!isRecord(wall)) continue
      const openings = wall.openings
      if (!Array.isArray(openings) || openings.length === 0) continue

      const padding = getPadding(
        wall.wallAssemblyId as WallAssemblyId | undefined,
        wallAssemblyConfigs,
        openingAssemblyConfigs,
        defaultOpeningAssemblyId
      )

      for (const opening of openings) {
        if (!isRecord(opening)) continue
        const offset = Number(opening.offsetFromStart)
        if (Number.isFinite(offset)) {
          opening.offsetFromStart = constructionOffsetToFinished(offset, padding)
        }

        const width = Number(opening.width)
        if (Number.isFinite(width)) {
          opening.width = constructionWidthToFinished(width, padding)
        }

        const height = Number(opening.height)
        if (Number.isFinite(height)) {
          opening.height = constructionHeightToFinished(height, padding)
        }

        if ('sillHeight' in opening) {
          const sillHeight = opening.sillHeight as number | undefined
          opening.sillHeight = constructionSillToFinished(sillHeight, padding)
        }
      }
    }
  }
}
