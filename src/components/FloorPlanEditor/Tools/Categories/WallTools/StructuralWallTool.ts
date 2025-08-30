import type { Tool, ToolContext, ContextAction } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared, createLength } from '@/types/geometry'

export interface StructuralWallToolState {
  isDrawing: boolean
  startPoint?: Point2D
  thickness: number // mm
  height: number // mm
  material: string
  previewEndPoint?: Point2D // Tool handles its own preview
}

export class StructuralWallTool implements Tool {
  id = 'wall.structural'
  name = 'Structural Wall'
  icon = '▬'
  cursor = 'crosshair'
  category = 'walls'
  hasInspector = true
  // inspectorComponent would be set to WallToolInspector

  public state: StructuralWallToolState = {
    isDrawing: false,
    thickness: 200, // 200mm default for structural walls
    height: 2700, // 2.7m default ceiling height
    material: 'concrete'
  }

  // Event handlers
  handleMouseDown(event: MouseEvent, context: ToolContext): boolean {
    const stageCoords = context.getStageCoordinates(event)
    const snapResult = context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.isDrawing) {
      // Start drawing wall
      this.state.isDrawing = true
      this.state.startPoint = snapCoords
      context.updateSnapReference(snapCoords, snapResult?.pointId ?? null)
      console.log('Starting structural wall at', snapCoords)
      return true
    } else if (this.state.startPoint) {
      // Finish drawing wall
      const wallLength = distanceSquared(this.state.startPoint, snapCoords)

      if (wallLength >= 50 ** 2) {
        // Minimum 50mm wall length - create wall using model store directly
        const modelStore = context.getModelStore()
        const activeFloorId = context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Add wall
        modelStore.addStructuralWall(
          activeFloorId,
          startPointEntity.id,
          endPointEntity.id,
          createLength(this.state.thickness)
        )
        console.log('Created structural wall from', this.state.startPoint, 'to', snapCoords)
      } else {
        console.log('Wall too short, minimum length is 50mm')
      }

      // Reset state
      this.state.isDrawing = false
      this.state.startPoint = undefined
      context.clearSnapState()
      return true
    }

    return false
  }

  handleMouseMove(event: MouseEvent, context: ToolContext): boolean {
    if (!this.state.isDrawing || !this.state.startPoint) return false

    const stageCoords = context.getStageCoordinates(event)
    const snapResult = context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    // Tool handles its own wall preview
    this.state.previewEndPoint = snapCoords
    console.log('StructuralWallTool: Preview from', this.state.startPoint, 'to', snapCoords)
    return true
  }

  handleKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    if (event.key === 'Escape' && this.state.isDrawing) {
      this.cancelDrawing(context)
      return true
    }

    // Quick thickness adjustment
    if (event.key === '[' && this.state.thickness > 50) {
      this.state.thickness -= 25
      console.log(`Thickness decreased to ${this.state.thickness}mm`)
      return true
    }

    if (event.key === ']' && this.state.thickness < 1000) {
      this.state.thickness += 25
      console.log(`Thickness increased to ${this.state.thickness}mm`)
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    console.log('Structural wall tool activated')
    this.state.isDrawing = false
    this.state.startPoint = undefined
  }

  onDeactivate(): void {
    console.log('Structural wall tool deactivated')
    if (this.state.isDrawing) {
      this.state.isDrawing = false
      this.state.startPoint = undefined
    }
  }

  // Context actions
  getContextActions(): ContextAction[] {
    const actions: ContextAction[] = []

    actions.push({
      label: 'Switch to Partition Wall',
      action: () => {
        // Implementation would switch to partition wall tool
        console.log('Switching to partition wall tool')
      },
      hotkey: 'P'
    })

    actions.push({
      label: 'Switch to Outer Wall',
      action: () => {
        // Implementation would switch to outer wall tool
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

    // Thickness presets
    actions.push({
      label: 'Thin Wall (100mm)',
      action: () => this.setThickness(100)
    })

    actions.push({
      label: 'Standard Wall (200mm)',
      action: () => this.setThickness(200)
    })

    actions.push({
      label: 'Thick Wall (300mm)',
      action: () => this.setThickness(300)
    })

    return actions
  }

  // Tool-specific methods
  setThickness(thickness: number): void {
    this.state.thickness = Math.max(50, Math.min(1000, thickness))
    console.log(`Wall thickness set to ${this.state.thickness}mm`)
  }

  setHeight(height: number): void {
    this.state.height = Math.max(1000, Math.min(5000, height)) // Between 1m and 5m
    console.log(`Wall height set to ${this.state.height}mm`)
  }

  setMaterial(material: string): void {
    this.state.material = material
    console.log(`Wall material set to ${material}`)
  }

  // Helper methods
  private cancelDrawing(context?: ToolContext): void {
    console.log('Cancelling wall drawing')
    this.state.isDrawing = false
    this.state.startPoint = undefined
    if (context) {
      context.clearSnapState()
      // Tools now handle their own previews
    }
  }
}
