import type { Migration, MigrationState } from './shared'
import { migrateToVersion1 } from './toVersion1'
import { migrateToVersion2 } from './toVersion2'

export const CURRENT_VERSION = 2

const migrations: Migration[] = [migrateToVersion1, migrateToVersion2]

export function applyMigrations(state: unknown): unknown {
  if (!state || typeof state !== 'object') {
    return state
  }

  const mutableState: MigrationState = { ...(state as MigrationState) }

  for (const migrate of migrations) {
    migrate(mutableState)
  }

  return mutableState
}

export type { Migration, MigrationState } from './shared'
