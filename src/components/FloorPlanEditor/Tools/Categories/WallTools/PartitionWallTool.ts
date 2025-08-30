import type { Tool, ToolContext, ContextAction, CanvasEvent } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared, createLength } from '@/types/geometry'

export interface PartitionWallToolState {
  isDrawing: boolean
  startPoint?: Point2D
  thickness: number // mm
  height: number // mm
  material: string
}

export class PartitionWallTool implements Tool {
  id = 'wall.partition'
  name = 'Partition Wall'
  icon = '▬'
  hotkey = 'Shift+w'
  cursor = 'crosshair'
  category = 'walls'
  hasInspector = true

  public state: PartitionWallToolState = {
    isDrawing: false,
    thickness: 100, // 100mm default for partition walls (thinner than structural)
    height: 2700, // 2.7m default ceiling height
    material: 'drywall'
  }

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.isDrawing) {
      // Start drawing wall
      this.state.isDrawing = true
      this.state.startPoint = snapCoords
      event.context.updateSnapReference(snapCoords, snapResult?.pointId ?? null)
      return true
    } else if (this.state.startPoint) {
      // Finish drawing wall
      const wallLength = distanceSquared(this.state.startPoint, snapCoords)

      if (wallLength >= 50 ** 2) {
        // Create partition wall using model store directly
        const modelStore = event.context.getModelStore()
        const activeFloorId = event.context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Add wall
        modelStore.addPartitionWall(
          activeFloorId,
          startPointEntity.id,
          endPointEntity.id,
          createLength(this.state.thickness)
        )
      } else {
        // TODO: Handle minimum wall length validation
      }

      // Reset state
      this.state.isDrawing = false
      this.state.startPoint = undefined
      event.context.clearSnapState()
      return true
    }

    return false
  }

  handleMouseMove(event: CanvasEvent): boolean {
    if (!this.state.isDrawing || !this.state.startPoint) return false

    const stageCoords = event.stageCoordinates
    event.context.findSnapPoint(stageCoords)

    // Tool handles its own wall preview
    // TODO: Implement preview rendering within the tool
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    if (keyEvent.key === 'Escape' && this.state.isDrawing) {
      this.cancelDrawing(event.context)
      return true
    }

    // Quick thickness adjustment
    if (keyEvent.key === '[' && this.state.thickness > 50) {
      this.state.thickness -= 25
      return true
    }

    if (keyEvent.key === ']' && this.state.thickness < 500) {
      // Partition walls typically thinner
      this.state.thickness += 25
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
  }

  onDeactivate(): void {
    if (this.state.isDrawing) {
      this.state.isDrawing = false
      this.state.startPoint = undefined
    }
  }

  // Context actions
  getContextActions(_context: ToolContext): ContextAction[] {
    const actions: ContextAction[] = []

    actions.push({
      label: 'Switch to Structural Wall',
      action: () => {},
      hotkey: 'S'
    })

    actions.push({
      label: 'Switch to Outer Wall',
      action: () => {},
      hotkey: 'O'
    })

    if (this.state.isDrawing) {
      actions.push({
        label: 'Cancel Wall',
        action: () => this.cancelDrawing(),
        hotkey: 'Escape'
      })
    }

    // Partition-specific thickness presets
    actions.push({
      label: 'Thin Partition (75mm)',
      action: () => this.setThickness(75)
    })

    actions.push({
      label: 'Standard Partition (100mm)',
      action: () => this.setThickness(100)
    })

    actions.push({
      label: 'Thick Partition (150mm)',
      action: () => this.setThickness(150)
    })

    return actions
  }

  // Tool-specific methods
  setThickness(thickness: number): void {
    this.state.thickness = Math.max(50, Math.min(500, thickness)) // Partition walls are thinner
  }

  setHeight(height: number): void {
    this.state.height = Math.max(1000, Math.min(4000, height)) // Partitions can be shorter
  }

  setMaterial(material: string): void {
    this.state.material = material
  }

  // Helper methods
  private cancelDrawing(context?: ToolContext): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
    if (context) {
      context.clearSnapState()
      // Tools now handle their own previews
    }
  }
}
