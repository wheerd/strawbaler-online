import type { Tool, ToolContext, ContextAction, Entity } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { createAbsoluteOffset, createPoint2D, createLength } from '@/types/geometry'

interface MoveToolState {
  isDragging: boolean
  dragEntity?: Entity
  dragStartPoint?: Point2D
  dragOffset?: Point2D
  dragStartMousePos?: Point2D
}

export class MoveTool implements Tool {
  id = 'basic.move'
  name = 'Move'
  icon = '↔'
  cursor = 'move'
  category = 'basic'
  hasInspector = false

  private state: MoveToolState = {
    isDragging: false
  }

  // Event handlers
  handleMouseDown(event: MouseEvent, context: ToolContext): boolean {
    const stageCoords = context.getStageCoordinates(event)
    const entity = this.getEntityAtPoint(stageCoords, context)

    if (entity) {
      // Start dragging the entity (tool handles its own drag state)
      this.state.isDragging = true
      this.state.dragEntity = entity
      this.state.dragStartPoint = stageCoords
      this.state.dragStartMousePos = createPoint2D(event.clientX, event.clientY)

      // Calculate offset for smooth dragging
      const entityPosition = this.getEntityPosition(entity)
      if (entityPosition) {
        this.state.dragOffset = {
          x: createAbsoluteOffset(stageCoords.x - entityPosition.x),
          y: createAbsoluteOffset(stageCoords.y - entityPosition.y)
        }
      }

      // Select the entity being moved
      context.selectEntity(this.getEntityId(entity))

      console.log(`MoveTool: Started dragging ${this.getEntityId(entity)}`)
      return true
    }

    return false
  }

  handleMouseMove(event: MouseEvent, context: ToolContext): boolean {
    if (!this.state.isDragging || !this.state.dragEntity || !this.state.dragStartPoint) {
      return false
    }

    // Tool handles its own drag update
    const currentStageCoords = context.getStageCoordinates(event)
    const deltaX = currentStageCoords.x - this.state.dragStartPoint.x
    const deltaY = currentStageCoords.y - this.state.dragStartPoint.y

    console.log(`MoveTool: Dragging ${this.getEntityId(this.state.dragEntity)} by (${deltaX}, ${deltaY})`)

    // TODO: Apply the drag to the entity in the model store
    // For now, just log the drag movement

    return true
  }

  handleMouseUp(event: MouseEvent, context: ToolContext): boolean {
    if (!this.state.isDragging) return false

    // Tool handles its own drag completion
    if (this.state.dragEntity) {
      const finalStageCoords = context.getStageCoordinates(event)
      const totalDeltaX = finalStageCoords.x - this.state.dragStartPoint!.x
      const totalDeltaY = finalStageCoords.y - this.state.dragStartPoint!.y

      console.log(
        `MoveTool: Finished dragging ${this.getEntityId(this.state.dragEntity)} by (${totalDeltaX}, ${totalDeltaY})`
      )

      // TODO: Apply final position to the entity in the model store
    }

    // Reset state
    this.state.isDragging = false
    this.state.dragEntity = undefined
    this.state.dragStartPoint = undefined
    this.state.dragOffset = undefined
    this.state.dragStartMousePos = undefined

    return true
  }

  handleKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    // Cancel move with Escape
    if (event.key === 'Escape' && this.state.isDragging) {
      this.cancelMove()
      return true
    }

    // Arrow key nudging
    const selectedId = context.getSelectedEntityId()
    if (selectedId) {
      const nudgeDistance = event.shiftKey ? 10 : 1 // 10mm or 1mm
      let handled = false

      switch (event.key) {
        case 'ArrowUp':
          this.nudgeEntity(selectedId, 0, -nudgeDistance)
          handled = true
          break
        case 'ArrowDown':
          this.nudgeEntity(selectedId, 0, nudgeDistance)
          handled = true
          break
        case 'ArrowLeft':
          this.nudgeEntity(selectedId, -nudgeDistance, 0)
          handled = true
          break
        case 'ArrowRight':
          this.nudgeEntity(selectedId, nudgeDistance, 0)
          handled = true
          break
      }

      return handled
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isDragging = false
    this.state.dragEntity = undefined
    this.state.dragStartPoint = undefined
    this.state.dragOffset = undefined
  }

  onDeactivate(): void {
    // If we're in the middle of a drag, cancel it
    if (this.state.isDragging) {
      // Would need context here to cancel properly
      this.state.isDragging = false
      this.state.dragEntity = undefined
      this.state.dragStartPoint = undefined
      this.state.dragOffset = undefined
    }
  }

  // Context actions
  getContextActions(selectedEntity?: Entity): ContextAction[] {
    const actions: ContextAction[] = []

    if (selectedEntity) {
      actions.push({
        label: `Move ${this.getEntityType(selectedEntity)}`,
        action: () => {
          // Activate move mode (we're already in it)
        },
        hotkey: 'M'
      })

      actions.push({
        label: 'Reset Position',
        action: () => {
          // Reset to original position
          this.resetEntityPosition(selectedEntity)
        }
      })
    }

    return actions
  }

  // Helper methods
  private getEntityAtPoint(point: Point2D, context: ToolContext, tolerance = 10): Entity | null {
    const modelStore = context.getModelStore()
    const activeFloorId = context.getActiveFloorId()
    const viewport = context.getViewport()

    // Convert tolerance from screen pixels to stage coordinates
    const stageTolerance = tolerance / viewport.zoom

    // Check points first (smallest targets)
    const nearestPoint = modelStore.findNearestPoint(activeFloorId, point, createLength(stageTolerance))
    if (nearestPoint) {
      return nearestPoint as Entity
    }

    // Check walls
    for (const wall of modelStore.walls.values()) {
      if (wall.floorId === activeFloorId) {
        // Simple distance check - could be improved with proper line-to-point distance
        const startPoint = modelStore.points.get(wall.startPointId)
        const endPoint = modelStore.points.get(wall.endPointId)
        if (startPoint && endPoint) {
          // Simplified wall hit test - should use proper line-to-point distance
          const distToStart = Math.hypot(point.x - startPoint.position.x, point.y - startPoint.position.y)
          const distToEnd = Math.hypot(point.x - endPoint.position.x, point.y - endPoint.position.y)
          const wallLength = Math.hypot(
            endPoint.position.x - startPoint.position.x,
            endPoint.position.y - startPoint.position.y
          )

          if (distToStart + distToEnd <= wallLength + stageTolerance) {
            return wall as Entity
          }
        }
      }
    }

    return null
  }

  private cancelMove(): void {
    if (this.state.isDragging && this.state.dragEntity && this.state.dragStartPoint) {
      console.log(`MoveTool: Cancelled dragging ${this.getEntityId(this.state.dragEntity)}`)
      // TODO: Reset entity to original position in model store
    }

    this.state.isDragging = false
    this.state.dragEntity = undefined
    this.state.dragStartPoint = undefined
    this.state.dragOffset = undefined
    this.state.dragStartMousePos = undefined
  }

  private nudgeEntity(entityId: string, deltaX: number, deltaY: number): void {
    // Implementation for nudging entity by small amounts
    // This would need to be implemented in the model store
    console.log(`Nudging entity ${entityId} by (${deltaX}, ${deltaY})`)
  }

  private resetEntityPosition(entity: Entity): void {
    // Reset entity to its original position
    // This would need access to the model store and undo functionality
    console.log(`Resetting position for entity:`, entity)
  }

  private getEntityId(entity: Entity): string {
    if ('id' in entity) {
      return entity.id
    } else if ('pointId' in entity) {
      return entity.pointId
    }
    throw new Error('Entity has no id')
  }

  private getEntityType(entity: Entity): string {
    if ('id' in entity && entity.id.includes('wall_')) return 'Wall'
    if ('id' in entity && entity.id.includes('room_')) return 'Room'
    if ('id' in entity && entity.id.includes('point_')) return 'Point'
    if ('pointId' in entity) return 'Corner'
    return 'Entity'
  }

  private getEntityPosition(entity: Entity): Point2D | null {
    // Get the position of an entity for drag calculations
    if ('position' in entity) {
      return entity.position
    }

    // For walls, we could use the midpoint
    // For rooms, we could use the centroid
    // For now, return null
    return null
  }
}
