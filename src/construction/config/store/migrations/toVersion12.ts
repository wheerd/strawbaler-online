import type { MigrationState } from './shared'

/**
 * Migration to version 12: Min and max module width
 *
 * Changes:
 * - ModuleConfig:
 *   - Split and rename `width` → `maxWidth` / `minWidth`
 */
export function migrateToVersion12(state: MigrationState): void {
  const wallAssemblies = state.wallAssemblyConfigs
  if (!wallAssemblies || typeof wallAssemblies !== 'object') {
    return
  }

  for (const assembly of Object.values(wallAssemblies)) {
    const wallConfig = assembly as Record<string, unknown>

    if ('module' in wallConfig && typeof wallConfig.module === 'object') {
      const moduleConfig = wallConfig.module as Record<string, unknown>

      if ('width' in moduleConfig && typeof moduleConfig.width === 'number') {
        moduleConfig.minWidth = moduleConfig.width
        moduleConfig.maxWidth = moduleConfig.width
        delete moduleConfig.width
      }
    }
  }
}
