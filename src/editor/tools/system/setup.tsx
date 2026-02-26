import { useEffect, useRef } from 'react'

import { getCanRedo, getCanUndo, getRedoFunction, getUndoFunction } from '@/building/store'
import { deleteEntity } from '@/building/store/helpers'
import { getCurrentSelection, popSelection } from '@/editor/hooks/useSelectionStore'
import { SelectTool } from '@/editor/tools/basic/SelectTool'
import { FitToViewTool } from '@/editor/tools/basic/fit-to-view/FitToViewTool'
import { MoveTool } from '@/editor/tools/basic/movement/MoveTool'
import { FloorAreaTool } from '@/editor/tools/floors/add-area/FloorAreaTool'
import { FloorOpeningTool } from '@/editor/tools/floors/add-opening/FloorOpeningTool'
import { AddOpeningTool, PerimeterPresetTool, PerimeterTool } from '@/editor/tools/perimeter'
import { AddPostTool } from '@/editor/tools/perimeter/add-post/AddPostTool'
import { SplitWallTool } from '@/editor/tools/perimeter/split'
import { RoofTool } from '@/editor/tools/roofs/RoofTool'
import { TestDataTool } from '@/editor/tools/test-data'

import { ToolSystem } from './ToolSystem'
import { ToolSystemContext } from './ToolSystemContext'

export function createAndInitializeToolSystem(): ToolSystem {
  const system = new ToolSystem()

  system.registerTool(SelectTool)
  system.registerTool(MoveTool)
  system.registerTool(FitToViewTool)
  system.registerTool(FloorAreaTool)
  system.registerTool(FloorOpeningTool)
  system.registerTool(PerimeterTool)
  system.registerTool(PerimeterPresetTool)
  system.registerTool(AddOpeningTool)
  system.registerTool(AddPostTool)
  system.registerTool(SplitWallTool)
  system.registerTool(RoofTool)
  system.registerTool(TestDataTool)

  const handleDelete = () => {
    const selectedId = getCurrentSelection()
    if (selectedId) {
      const success = deleteEntity(selectedId)
      if (success) {
        popSelection()
      }
      return success
    }
    return false
  }
  system.registerShortcut('Delete', handleDelete)
  system.registerShortcut('Backspace', handleDelete)

  system.registerShortcut('Escape', () => {
    if (system.canPop()) {
      system.popTool()
      return true
    }
    return false
  })

  system.registerShortcut('Ctrl+Z', () => {
    if (getCanUndo()) {
      getUndoFunction()()
      return true
    }
    return false
  })

  system.registerShortcut('Ctrl+Y', () => {
    if (getCanRedo()) {
      getRedoFunction()()
      return true
    }
    return false
  })

  return system
}

export function ToolSystemProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const toolSystemRef = useRef<ToolSystem>(createAndInitializeToolSystem())

  useEffect(() => {
    const cleanup = toolSystemRef.current.initialize()
    return cleanup
  }, [])

  return <ToolSystemContext.Provider value={toolSystemRef.current}>{children}</ToolSystemContext.Provider>
}
