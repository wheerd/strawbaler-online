import type { Opening } from '@/building/model'
import { getConfigActions } from '@/construction/config/store'
import type { WallAssemblyConfig } from '@/construction/config/types'

import type { OpeningConfig } from './types'

/**
 * Resolves the opening assembly config using the inheritance hierarchy:
 * Opening.openingAssemblyId → WallAssembly.openingAssemblyId → Global Default
 */
export function resolveOpeningConfig(opening: Opening, wallAssembly: WallAssemblyConfig): OpeningConfig {
  const configActions = getConfigActions()

  // 1. Try opening-specific override
  if (opening.openingAssemblyId) {
    const config = configActions.getOpeningAssemblyById(opening.openingAssemblyId)
    if (config) return config
  }

  // 2. Try wall assembly's default
  if (wallAssembly.openingAssemblyId) {
    const config = configActions.getOpeningAssemblyById(wallAssembly.openingAssemblyId)
    if (config) return config
  }

  // 3. Use global default
  const defaultId = configActions.getDefaultOpeningAssemblyId()
  const config = configActions.getOpeningAssemblyById(defaultId)

  if (!config) {
    throw new Error('Default opening assembly not found')
  }

  return config
}
