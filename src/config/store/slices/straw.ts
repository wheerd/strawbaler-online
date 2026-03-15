import { type StateCreator } from 'zustand'

import { strawbale } from '@/materials/defaults'
import { type MaterialId } from '@/materials/types'

export interface StrawState {
  defaultStrawMaterial: MaterialId
}

export interface StrawActions {
  getDefaultStrawMaterial: () => MaterialId
  updateDefaultStrawMaterial: (materialId: MaterialId) => void
}

export type StrawSlice = StrawState & { actions: StrawActions }

export const createStrawSlice: StateCreator<StrawSlice, [['zustand/immer', never]], [], StrawSlice> = (set, get) => ({
  defaultStrawMaterial: strawbale.id,
  actions: {
    getDefaultStrawMaterial: () => {
      const state = get()
      return state.defaultStrawMaterial
    },

    updateDefaultStrawMaterial: (materialId: MaterialId) => {
      set(state => ({
        ...state,
        defaultStrawMaterial: materialId
      }))
    }
  } satisfies StrawActions
})
