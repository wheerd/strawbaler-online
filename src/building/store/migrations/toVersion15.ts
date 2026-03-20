import type { Migration } from './shared'
import { isRecord } from './shared'

export const migrateToVersion15: Migration = state => {
  if (!isRecord(state)) return

  if (!isRecord(state.intermediateWalls)) {
    ;(state as { intermediateWalls: Record<string, unknown> }).intermediateWalls = {}
  }

  if (!isRecord(state._intermediateWallGeometry)) {
    ;(state as { _intermediateWallGeometry: Record<string, unknown> })._intermediateWallGeometry = {}
  }

  if (!isRecord(state.wallNodes)) {
    ;(state as { wallNodes: Record<string, unknown> }).wallNodes = {}
  }

  if (!isRecord(state._wallNodeGeometry)) {
    ;(state as { _wallNodeGeometry: Record<string, unknown> })._wallNodeGeometry = {}
  }
}
