import { wood } from '@/construction/materials/material'

import type { MigrationState } from './shared'

/**
 * Migration to version 10: Extract opening configs into separate assemblies
 *
 * Changes:
 * - Create opening assembly configs from wall openings configs
 * - Remove openings property from wall configs
 * - Add openingAssemblyId to wall configs (only if non-default)
 * - Deduplicate identical configs
 */
export function migrateToVersion10(state: MigrationState): void {
  const DEFAULT_SIMPLE_CONFIG = {
    type: 'simple',
    padding: 15,
    sillThickness: 60,
    sillMaterial: wood.id,
    headerThickness: 60,
    headerMaterial: wood.id
  }

  const DEFAULT_EMPTY_CONFIG = {
    type: 'empty',
    padding: 15
  }

  // Helper to check if config matches default
  const matchesDefault = (config: Record<string, unknown>): boolean => {
    // If it has sill/header, compare to simple default
    if ('sillMaterial' in config) {
      return (
        config.padding === DEFAULT_SIMPLE_CONFIG.padding &&
        config.sillThickness === DEFAULT_SIMPLE_CONFIG.sillThickness &&
        config.sillMaterial === DEFAULT_SIMPLE_CONFIG.sillMaterial &&
        config.headerThickness === DEFAULT_SIMPLE_CONFIG.headerThickness &&
        config.headerMaterial === DEFAULT_SIMPLE_CONFIG.headerMaterial
      )
    }
    // Otherwise compare to empty default (just padding)
    return config.padding === DEFAULT_EMPTY_CONFIG.padding
  }

  // Helper to create config key for deduplication
  const getConfigKey = (config: Record<string, unknown>): string => {
    if ('sillMaterial' in config) {
      return `simple:${config.padding}:${config.sillThickness}:${config.sillMaterial}:${config.headerThickness}:${config.headerMaterial}`
    }
    return `empty:${config.padding}`
  }

  // Initialize opening assemblies with defaults
  state.openingAssemblyConfigs = {
    oa_simple_default: { ...DEFAULT_SIMPLE_CONFIG, id: 'oa_simple_default', name: 'Standard Opening' },
    oa_empty_default: { ...DEFAULT_EMPTY_CONFIG, id: 'oa_empty_default', name: 'Empty Opening' }
  }
  state.defaultOpeningAssemblyId = 'oa_simple_default'

  // Track created assemblies for deduplication
  const configToIdMap = new Map<string, string>()
  let assemblyCounter = 1

  // Process all wall assemblies
  const wallAssemblies = state.wallAssemblyConfigs
  if (!wallAssemblies || typeof wallAssemblies !== 'object') {
    return
  }

  for (const assembly of Object.values(wallAssemblies)) {
    const wallConfig = assembly as Record<string, unknown>

    if (!wallConfig.openings || typeof wallConfig.openings !== 'object') {
      continue
    }

    const openingConfig = wallConfig.openings as Record<string, unknown>

    // Check if matches default
    if (matchesDefault(openingConfig)) {
      // Don't set openingAssemblyId, will use default
      delete wallConfig.openings
      continue
    }

    // Check if we already created an assembly for this config
    const configKey = getConfigKey(openingConfig)
    let assemblyId = configToIdMap.get(configKey)

    if (!assemblyId) {
      // Create new assembly for this unique config
      assemblyId = `oa_migrated_${assemblyCounter++}`

      const isSimple = 'sillMaterial' in openingConfig
      const assemblyName = `Migrated ${isSimple ? 'Opening' : 'Empty Opening'} ${assemblyCounter - 1}`

      const newAssembly = {
        ...openingConfig,
        type: isSimple ? 'simple' : 'empty',
        id: assemblyId,
        name: assemblyName
      }

      // Add to state
      if (state.openingAssemblyConfigs && typeof state.openingAssemblyConfigs === 'object') {
        ;(state.openingAssemblyConfigs as Record<string, unknown>)[assemblyId] = newAssembly
      }

      configToIdMap.set(configKey, assemblyId)
    }

    // Set wall's opening assembly reference
    wallConfig.openingAssemblyId = assemblyId
    delete wallConfig.openings
  }
}
