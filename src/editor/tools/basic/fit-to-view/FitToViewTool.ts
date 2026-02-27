import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { DummyToolInspector, type EditorEvent, type ToolImplementation } from '@/editor/tools/system/types'

export class FitToViewTool implements ToolImplementation {
  readonly id = 'basic.fit-to-view'
  readonly inspectorComponent = DummyToolInspector
  protected toolSystem: ToolSystem

  constructor(toolSystem: ToolSystem) {
    this.toolSystem = toolSystem
  }

  handlePointerDown(_event: EditorEvent): boolean {
    return false
  }

  onActivate(): void {
    try {
      const { getActiveStoreyId, getBounds } = getModelActions()

      const activeStoreyId = getActiveStoreyId()
      const bounds = getBounds(activeStoreyId)

      if (bounds.isEmpty) {
        console.log('No entities to fit - no bounds available')
        return
      }

      viewportActions().fitToView(bounds)
    } finally {
      this.toolSystem.popTool()
    }
  }

  onDeactivate(): void {
    // Nothing to do on deactivate
  }
}
