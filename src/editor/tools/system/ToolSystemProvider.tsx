import { useEffect, useRef } from 'react'

import { getCanRedo, getCanUndo, getRedoFunction, getUndoFunction } from '@/building/store'
import { deleteEntity } from '@/building/store/helpers'
import { fitActiveStoreyToView } from '@/editor/canvas/helpers/fitActiveStoreyToView'
import { getCurrentSelection } from '@/editor/canvas/state/selectionStore'
import { SelectTool } from '@/editor/tools/basic/SelectTool'
import { MoveTool } from '@/editor/tools/basic/movement/MoveTool'
import { FloorAreaTool } from '@/editor/tools/floors/add-area/FloorAreaTool'
import { FloorOpeningTool } from '@/editor/tools/floors/add-opening/FloorOpeningTool'
import { IntermediateWallTool } from '@/editor/tools/intermediate-wall/add/IntermediateWallTool'
import { AddOpeningTool } from '@/editor/tools/perimeter/add-opening/AddOpeningTool'
import { AddPostTool } from '@/editor/tools/perimeter/add-post/AddPostTool'
import { PerimeterTool } from '@/editor/tools/perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from '@/editor/tools/perimeter/preset/PerimeterPresetTool'
import { SplitWallTool } from '@/editor/tools/perimeter/split/SplitWallTool'
import { RoofTool } from '@/editor/tools/roofs/RoofTool'
import { TestDataTool } from '@/editor/tools/test-data/TestDataTool'

import { ToolSystem } from './ToolSystem'
import { ToolSystemContext } from './ToolSystemContext'

function createAndInitializeToolSystem(): ToolSystem {
  const system = new ToolSystem()

  system.registerTool(SelectTool)
  system.registerTool(MoveTool)
  system.registerTool(FloorAreaTool)
  system.registerTool(FloorOpeningTool)
  system.registerTool(PerimeterTool)
  system.registerTool(PerimeterPresetTool)
  system.registerTool(AddOpeningTool)
  system.registerTool(AddPostTool)
  system.registerTool(SplitWallTool)
  system.registerTool(RoofTool)
  system.registerTool(TestDataTool)
  system.registerTool(IntermediateWallTool)

  const handleDelete = () => {
    const selectedId = getCurrentSelection()
    if (selectedId) {
      return deleteEntity(selectedId)
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

  system.registerShortcut('F', () => {
    fitActiveStoreyToView()
    return true
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
