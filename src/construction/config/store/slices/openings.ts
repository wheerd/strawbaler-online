import { type StateCreator } from 'zustand'

import { type OpeningAssemblyId, createOpeningAssemblyId } from '@/building/model/ids'
import type {
  EmptyOpeningAssemblyConfig,
  OpeningAssemblyConfig,
  SimpleOpeningAssemblyConfig
} from '@/construction/config/types'
import { wood } from '@/construction/materials/material'
import type { OpeningConfig } from '@/construction/openings/types'
import { validateOpeningConfig } from '@/construction/openings/types'

export interface OpeningAssembliesState {
  openingAssemblyConfigs: Record<OpeningAssemblyId, OpeningAssemblyConfig>
  defaultOpeningAssemblyId: OpeningAssemblyId
}

export interface OpeningAssembliesActions {
  // CRUD operations for opening assemblies
  addOpeningAssembly: (name: string, config: OpeningConfig) => OpeningAssemblyConfig
  removeOpeningAssembly: (id: OpeningAssemblyId) => void
  updateOpeningAssemblyName: (id: OpeningAssemblyId, name: string) => void
  updateOpeningAssemblyConfig: (id: OpeningAssemblyId, config: Partial<Omit<OpeningConfig, 'type'>>) => void
  duplicateOpeningAssembly: (id: OpeningAssemblyId, name: string) => OpeningAssemblyConfig

  // Opening assembly queries
  getOpeningAssemblyById: (id: OpeningAssemblyId) => OpeningAssemblyConfig | null
  getAllOpeningAssemblies: () => OpeningAssemblyConfig[]

  // Default opening assembly management
  setDefaultOpeningAssembly: (assemblyId: OpeningAssemblyId) => void
  getDefaultOpeningAssemblyId: () => OpeningAssemblyId
}

export type OpeningAssembliesSlice = OpeningAssembliesState & { actions: OpeningAssembliesActions }

// Validation functions
const validateOpeningAssemblyName = (name: string): void => {
  if (name.trim().length === 0) {
    throw new Error('Opening assembly name cannot be empty')
  }
}

// Default opening assemblies
const createDefaultOpeningAssemblies = (): OpeningAssemblyConfig[] => [
  {
    id: 'oa_simple_default' as OpeningAssemblyId,
    name: 'Standard Opening',
    type: 'simple',
    padding: 15,
    sillThickness: 60,
    sillMaterial: wood.id,
    headerThickness: 60,
    headerMaterial: wood.id
  } as SimpleOpeningAssemblyConfig,
  {
    id: 'oa_empty_default' as OpeningAssemblyId,
    name: 'Empty Opening',
    type: 'empty',
    padding: 15
  } as EmptyOpeningAssemblyConfig
]

export const createOpeningAssembliesSlice: StateCreator<
  OpeningAssembliesSlice,
  [['zustand/immer', never]],
  [],
  OpeningAssembliesSlice
> = (set, get) => {
  // Initialize with default assemblies
  const defaultOpeningAssemblies = createDefaultOpeningAssemblies()

  return {
    openingAssemblyConfigs: Object.fromEntries(defaultOpeningAssemblies.map(assembly => [assembly.id, assembly])),
    defaultOpeningAssemblyId: defaultOpeningAssemblies[0].id,

    actions: {
      // CRUD operations
      addOpeningAssembly: (name: string, config: OpeningConfig) => {
        validateOpeningAssemblyName(name)
        validateOpeningConfig(config)

        const id = createOpeningAssemblyId()
        const assembly = {
          ...config,
          id,
          name
        } as OpeningAssemblyConfig

        set(state => ({
          ...state,
          openingAssemblyConfigs: { ...state.openingAssemblyConfigs, [id]: assembly }
        }))

        return assembly
      },

      duplicateOpeningAssembly: (id: OpeningAssemblyId, name: string) => {
        const state = get()
        const original = state.openingAssemblyConfigs[id]
        if (original == null) {
          throw new Error(`Opening assembly with id ${id} not found`)
        }

        validateOpeningAssemblyName(name)

        const newId = createOpeningAssemblyId()
        const duplicated = {
          ...original,
          id: newId,
          name: name.trim()
        } as OpeningAssemblyConfig

        set(state => ({
          ...state,
          openingAssemblyConfigs: { ...state.openingAssemblyConfigs, [newId]: duplicated }
        }))

        return duplicated
      },

      removeOpeningAssembly: (id: OpeningAssemblyId) => {
        set(state => {
          const { [id]: _removed, ...remainingAssemblies } = state.openingAssemblyConfigs
          return {
            ...state,
            openingAssemblyConfigs: remainingAssemblies,
            defaultOpeningAssemblyId: state.defaultOpeningAssemblyId === id ? undefined : state.defaultOpeningAssemblyId
          }
        })
      },

      updateOpeningAssemblyName: (id: OpeningAssemblyId, name: string) => {
        set(state => {
          const assembly = state.openingAssemblyConfigs[id]
          if (assembly == null) return state

          validateOpeningAssemblyName(name)

          const updatedAssembly: OpeningAssemblyConfig = {
            ...assembly,
            name: name.trim()
          }

          return {
            ...state,
            openingAssemblyConfigs: { ...state.openingAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      updateOpeningAssemblyConfig: (id: OpeningAssemblyId, config: Partial<Omit<OpeningConfig, 'type'>>) => {
        set(state => {
          const assembly = state.openingAssemblyConfigs[id]
          if (assembly == null) return state

          const updatedAssembly: OpeningAssemblyConfig = {
            ...assembly,
            ...config,
            id: assembly.id
          }

          const { id: _id, name: _name, ...openingConfig } = updatedAssembly
          validateOpeningConfig(openingConfig as OpeningConfig)

          return {
            ...state,
            openingAssemblyConfigs: { ...state.openingAssemblyConfigs, [id]: updatedAssembly }
          }
        })
      },

      // Queries
      getOpeningAssemblyById: (id: OpeningAssemblyId) => {
        const state = get()
        return state.openingAssemblyConfigs[id] ?? null
      },

      getAllOpeningAssemblies: () => {
        const state = get()
        return Object.values(state.openingAssemblyConfigs)
      },

      // Default management
      setDefaultOpeningAssembly: (assemblyId: OpeningAssemblyId | undefined) => {
        set(state => ({
          ...state,
          defaultOpeningAssemblyId: assemblyId
        }))
      },

      getDefaultOpeningAssemblyId: () => {
        const state = get()
        return state.defaultOpeningAssemblyId
      }
    } satisfies OpeningAssembliesActions
  }
}
