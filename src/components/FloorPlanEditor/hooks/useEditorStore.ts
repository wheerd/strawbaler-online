import { create } from 'zustand'
import type { FloorId } from '@/types/ids'

export interface EditorState {
  activeFloorId: FloorId
  showGrid: boolean
  gridSize: number // in mm
}

export interface EditorActions {
  setActiveFloor: (floorId: FloorId) => void
  setShowGrid: (show: boolean) => void
  setGridSize: (size: number) => void
  reset: () => void
}

type EditorStore = EditorState & EditorActions

function createInitialState(defaultFloorId: FloorId): EditorState {
  return {
    activeFloorId: defaultFloorId,
    showGrid: true,
    gridSize: 1000 // 1m grid by default
  }
}

export const useEditorStore = create<EditorStore>()(set => ({
  // Initialize with temporary floor ID - will be reset when model loads
  ...createInitialState('ground-floor' as FloorId),

  setActiveFloor: (floorId: FloorId) => {
    set({
      activeFloorId: floorId
    })
  },

  setShowGrid: (show: boolean) => {
    set({ showGrid: show })
  },

  setGridSize: (size: number) => {
    set({ gridSize: size })
  },

  reset: (defaultFloorId?: FloorId) => {
    const floorId = defaultFloorId ?? ('ground-floor' as FloorId)
    set(createInitialState(floorId))
  }
}))

// Selector hooks for optimized re-renders
export const useActiveFloorId = (): FloorId => useEditorStore(state => state.activeFloorId)
export const useShowGrid = (): boolean => useEditorStore(state => state.showGrid)
export const useGridSize = (): number => useEditorStore(state => state.gridSize)
