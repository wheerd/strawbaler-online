import type { Tool, ToolContext, ContextAction, Entity } from '../../ToolSystem/types'
import { createLength } from '@/types/geometry'

interface SelectToolState {
  isSelecting: boolean
  selectionStart?: { x: number; y: number }
}

export class SelectTool implements Tool {
  id = 'basic.select'
  name = 'Select'
  icon = '↖'
  cursor = 'default'
  category = 'basic'
  hasInspector = false

  private state: SelectToolState = {
    isSelecting: false
  }

  // Event handlers
  handleMouseDown(event: MouseEvent, context: ToolContext): boolean {
    const stageCoords = context.getStageCoordinates(event)
    const entity = this.getEntityAtPoint(stageCoords, context)

    if (entity) {
      // Select the entity
      context.selectEntity(this.getEntityId(entity))
      return true
    } else {
      // Start selection rectangle
      this.state.isSelecting = true
      this.state.selectionStart = { x: event.clientX, y: event.clientY }
      context.clearSelection()
      return true
    }
  }

  handleMouseMove(_event: MouseEvent, _context: ToolContext): boolean {
    if (!this.state.isSelecting || !this.state.selectionStart) return false

    // Update selection rectangle preview
    // This would be handled by the canvas layer
    return true
  }

  handleMouseUp(event: MouseEvent, context: ToolContext): boolean {
    if (!this.state.isSelecting || !this.state.selectionStart) return false

    // Complete rectangle selection
    const rect = {
      x: Math.min(this.state.selectionStart.x, event.clientX),
      y: Math.min(this.state.selectionStart.y, event.clientY),
      width: Math.abs(event.clientX - this.state.selectionStart.x),
      height: Math.abs(event.clientY - this.state.selectionStart.y)
    }

    const entitiesInRect = this.getEntitiesInRect(rect, context)

    // Select all entities in rectangle
    if (entitiesInRect.length > 0) {
      // For now, just select the first entity (multi-select would be implemented later)
      context.selectEntity(this.getEntityId(entitiesInRect[0]))
    }

    this.state.isSelecting = false
    this.state.selectionStart = undefined
    return true
  }

  handleKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    // Handle keyboard shortcuts
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedId = context.getSelectedEntityId()
      if (selectedId) {
        // Delete selected entity (would be implemented in context)
        context.clearSelection()
        return true
      }
    }

    if (event.key === 'Escape') {
      context.clearSelection()
      this.cancelSelection()
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isSelecting = false
    this.state.selectionStart = undefined
  }

  onDeactivate(): void {
    this.cancelSelection()
  }

  // Context actions
  getContextActions(selectedEntity?: Entity): ContextAction[] {
    const actions: ContextAction[] = []

    if (selectedEntity) {
      actions.push({
        label: `Delete ${this.getEntityType(selectedEntity)}`,
        action: () => {
          // Delete action would be implemented
        },
        hotkey: 'Delete'
      })

      actions.push({
        label: 'Properties',
        action: () => {
          // Open properties panel or focus on it
        },
        hotkey: 'P'
      })
    }

    actions.push({
      label: 'Select All',
      action: () => {
        // Select all entities on current floor
      },
      hotkey: 'Ctrl+A'
    })

    return actions
  }

  // Helper methods
  private getEntityAtPoint(point: { x: number; y: number }, context: ToolContext, tolerance = 10): Entity | null {
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

  private getEntitiesInRect(
    rect: { x: number; y: number; width: number; height: number },
    context: ToolContext
  ): Entity[] {
    const modelStore = context.getModelStore()
    const activeFloorId = context.getActiveFloorId()
    const viewport = context.getViewport()
    const entities: Entity[] = []

    const stageRect = {
      x: (rect.x - viewport.panX) / viewport.zoom,
      y: (rect.y - viewport.panY) / viewport.zoom,
      width: rect.width / viewport.zoom,
      height: rect.height / viewport.zoom
    }

    // Check points
    for (const point of modelStore.points.values()) {
      if (
        point.floorId === activeFloorId &&
        point.position.x >= stageRect.x &&
        point.position.x <= stageRect.x + stageRect.width &&
        point.position.y >= stageRect.y &&
        point.position.y <= stageRect.y + stageRect.height
      ) {
        entities.push(point as Entity)
      }
    }

    return entities
  }

  private cancelSelection(): void {
    this.state.isSelecting = false
    this.state.selectionStart = undefined
  }

  private getEntityId(entity: Entity): string {
    // All entities should have an id, but Corner uses pointId
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
}
