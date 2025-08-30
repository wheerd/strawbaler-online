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
      console.log('Starting partition wall at', snapCoords)
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
        console.log('Created partition wall from', this.state.startPoint, 'to', snapCoords)
      } else {
        console.log('Wall too short, minimum length is 50mm')
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
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    // Tool handles its own wall preview
    // TODO: Implement preview rendering within the tool (using snapCoords)
    console.log('Preview wall to:', snapCoords)
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
      console.log(`Thickness decreased to ${this.state.thickness}mm`)
      return true
    }

    if (keyEvent.key === ']' && this.state.thickness < 500) {
      // Partition walls typically thinner
      this.state.thickness += 25
      console.log(`Thickness increased to ${this.state.thickness}mm`)
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    console.log('Partition wall tool activated')
    this.state.isDrawing = false
    this.state.startPoint = undefined
  }

  onDeactivate(): void {
    console.log('Partition wall tool deactivated')
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
      action: () => {
        console.log('Switching to structural wall tool')
      },
      hotkey: 'S'
    })

    actions.push({
      label: 'Switch to Outer Wall',
      action: () => {
        console.log('Switching to outer wall tool')
      },
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
    console.log(`Partition wall thickness set to ${this.state.thickness}mm`)
  }

  setHeight(height: number): void {
    this.state.height = Math.max(1000, Math.min(4000, height)) // Partitions can be shorter
    console.log(`Partition wall height set to ${this.state.height}mm`)
  }

  setMaterial(material: string): void {
    this.state.material = material
    console.log(`Partition wall material set to ${material}`)
  }

  // Helper methods
  private cancelDrawing(context?: ToolContext): void {
    console.log('Cancelling partition wall drawing')
    this.state.isDrawing = false
    this.state.startPoint = undefined
    if (context) {
      context.clearSnapState()
      // Tools now handle their own previews
    }
  }
}
