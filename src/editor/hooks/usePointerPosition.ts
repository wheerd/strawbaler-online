import { vec2 } from 'gl-matrix'
import { create } from 'zustand'

interface PointerPosition {
  stage: { x: number; y: number } | null
  world: vec2 | null
}

interface PointerPositionActions {
  setPosition: (stage: { x: number; y: number }, world: vec2) => void
  clear: () => void
}

type PointerPositionStore = PointerPosition & { actions: PointerPositionActions }

const INITIAL_STATE: PointerPosition = {
  stage: null,
  world: null
}

const pointerPositionStore = create<PointerPositionStore>()(set => ({
  ...INITIAL_STATE,

  actions: {
    setPosition: (stage, world) => {
      const stageCopy = { x: stage.x, y: stage.y }
      // clone vec2 to avoid external mutation before storing
      const worldCopy = vec2.fromValues(world[0], world[1])
      set({ stage: stageCopy, world: worldCopy })
    },
    clear: () => {
      set(INITIAL_STATE)
    }
  }
}))

export const usePointerWorldPosition = (): vec2 | null => pointerPositionStore(state => state.world)

export const usePointerStagePosition = (): { x: number; y: number } | null => pointerPositionStore(state => state.stage)

export const usePointerPositionActions = (): PointerPositionActions => pointerPositionStore(state => state.actions)

export const pointerPositionActions = (): PointerPositionActions => pointerPositionStore.getState().actions
