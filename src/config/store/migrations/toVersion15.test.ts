import { describe, expect, it } from 'vitest'

import v14Data from './__tests__/v14.json'
import { migrateToVersion15 } from './toVersion15'

type State = Record<string, unknown>

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function cloneV14Data(): State {
  const state = deepClone(v14Data) as State
  delete state.layerSetConfigs
  return state
}

describe('migrateToVersion15', () => {
  it('does not throw on full v14 data', () => {
    const state = cloneV14Data()
    expect(() => {
      migrateToVersion15(state)
    }).not.toThrow()
  })

  it('is idempotent - running migration twice produces the same result', () => {
    const state1 = cloneV14Data()
    const state2 = cloneV14Data()

    migrateToVersion15(state1)
    migrateToVersion15(state1)

    migrateToVersion15(state2)

    expect(JSON.stringify(state1)).toBe(JSON.stringify(state2))
  })

  it('migrates wall assemblies - creates layer set IDs and removes layers property', () => {
    const state = cloneV14Data()
    const beforeCount = Object.keys(state.wallAssemblyConfigs as State).length

    migrateToVersion15(state)

    const wallConfigs = state.wallAssemblyConfigs as Record<string, State>
    expect(Object.keys(wallConfigs).length).toBe(beforeCount)
    for (const [id, assembly] of Object.entries(wallConfigs)) {
      expect(assembly.insideLayerSetId, `wall ${id} should have insideLayerSetId`).toBeDefined()
      expect(assembly.outsideLayerSetId, `wall ${id} should have outsideLayerSetId`).toBeDefined()
      expect(assembly.layers, `wall ${id} should not have layers property`).toBeUndefined()
    }
  })

  it('migrates floor assemblies - creates layer set IDs and removes layers property', () => {
    const state = cloneV14Data()
    const beforeCount = Object.keys(state.floorAssemblyConfigs as State).length

    migrateToVersion15(state)

    const floorConfigs = state.floorAssemblyConfigs as Record<string, State>
    expect(Object.keys(floorConfigs).length).toBe(beforeCount)
    for (const [id, assembly] of Object.entries(floorConfigs)) {
      expect(assembly.topLayerSetId, `floor ${id} should have topLayerSetId`).toBeDefined()
      expect(assembly.layers, `floor ${id} should not have layers property`).toBeUndefined()
    }
  })

  it('migrates roof assemblies - creates layer set IDs and removes layers property', () => {
    const state = cloneV14Data()
    const beforeCount = Object.keys(state.roofAssemblyConfigs as State).length

    migrateToVersion15(state)

    const roofConfigs = state.roofAssemblyConfigs as Record<string, State>
    expect(Object.keys(roofConfigs).length).toBe(beforeCount)
    for (const [id, assembly] of Object.entries(roofConfigs)) {
      expect(assembly.insideLayerSetId, `roof ${id} should have insideLayerSetId`).toBeDefined()
      expect(assembly.topLayerSetId, `roof ${id} should have topLayerSetId`).toBeDefined()
      expect(assembly.layers, `roof ${id} should not have layers property`).toBeUndefined()
    }
  })
})
