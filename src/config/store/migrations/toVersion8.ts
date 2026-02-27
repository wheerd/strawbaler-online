import type { MigrationState } from './shared'

// Migrate wall configs to have desiredPostSpacing equal to maxPostSpacing if not present
export function migrateToVersion8(state: MigrationState): void {
  const assemblies = state.wallAssemblyConfigs
  if (!assemblies || typeof assemblies !== 'object') {
    return
  }

  for (const assembly of Object.values(assemblies as Record<string, unknown>)) {
    if (!assembly || typeof assembly !== 'object') {
      continue
    }

    const assemblyConfig = assembly as Record<string, unknown>
    if ('maxPostSpacing' in assemblyConfig && !('desiredPostSpacing' in assemblyConfig)) {
      assemblyConfig.desiredPostSpacing = assemblyConfig.maxPostSpacing
    }

    if ('infill' in assemblyConfig) {
      const infillConfig = assemblyConfig.infill as Record<string, unknown>
      if ('maxPostSpacing' in infillConfig && !('desiredPostSpacing' in infillConfig)) {
        infillConfig.desiredPostSpacing = infillConfig.maxPostSpacing
      }
    }
  }
}
