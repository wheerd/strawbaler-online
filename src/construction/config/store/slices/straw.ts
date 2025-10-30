import { type StateCreator } from 'zustand'

import { strawbale } from '@/construction/materials/material'
import { type StrawConfig, validateStrawConfig } from '@/construction/materials/straw'
import '@/shared/geometry'

export interface StrawState {
  straw: StrawConfig
}

export interface StrawActions {
  getStrawConfig: () => StrawConfig
  updateStrawConfig: (updates: Partial<StrawConfig>) => void
}

export type StrawSlice = StrawState & { actions: StrawActions }

// Default straw config
const createDefaultStrawConfig = (): StrawConfig => ({
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  material: strawbale.id,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70
})

export const createStrawSlice: StateCreator<StrawSlice, [['zustand/immer', never]], [], StrawSlice> = (set, get) => ({
  straw: createDefaultStrawConfig(),
  actions: {
    getStrawConfig: () => {
      const state = get()
      return state.straw
    },

    updateStrawConfig: (updates: Partial<StrawConfig>) => {
      set(state => {
        const next = { ...state.straw, ...updates }
        validateStrawConfig(next)
        return { ...state, straw: next }
      })
    }
  } satisfies StrawActions
})
