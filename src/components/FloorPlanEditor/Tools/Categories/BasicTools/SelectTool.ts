import type { EntityId, SelectableId } from '@/types/ids'
import type { Tool, ToolContext, CanvasEvent } from '../../ToolSystem/types'
import { createLength, type Vec2 } from '@/types/geometry'

interface HitResult {
  entityId: EntityId
  subEntityId?: SelectableId
  subEntityType?: 'segment' | 'corner' | 'opening'
}

export class SelectTool implements Tool {
  id = 'basic.select'
  name = 'Select'
  icon = '↖'
  hotkey = 'v'
  cursor = 'default'
  category = 'basic'
  hasInspector = false

  // Event handlers
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const hitResult = this.getHitResult(stageCoords, event.context)

    if (hitResult) {
      // Hierarchical selection logic
      if (hitResult.entityId === this.getCurrentEntitySelection(event.context)) {
        // Clicking on the same entity - drill down to sub-entity if available
        if (hitResult.subEntityId) {
          event.context.selectSubEntity(hitResult.subEntityId)
        }
      } else {
        // Clicking on a different entity - start fresh with entity selection
        event.context.selectEntity(hitResult.entityId)
      }
      return true
    } else {
      // Clear selection when clicking empty space
      event.context.clearSelection()
      return true
    }
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      // Progressive deselection - pop from selection stack
      const currentSelection = event.context.getCurrentSelection()

      if (currentSelection) {
        event.context.popSelection()
      }
      return true
    }

    // Don't handle Delete/Backspace here - let the KeyboardShortcutManager handle it
    return false
  }

  // Lifecycle methods
  onActivate(): void {
    // Nothing to do for simple selection
  }

  onDeactivate(): void {
    // Nothing to do for simple selection
  }

  // Helper methods for hierarchical selection
  private getHitResult(point: Vec2, context: ToolContext, tolerance = 10): HitResult | null {
    const modelStore = context.getModelStore()
    const activeFloorId = context.getActiveFloorId()
    const viewport = context.getViewport()

    // Convert tolerance from screen pixels to stage coordinates
    const stageTolerance = tolerance / viewport.zoom

    // Check outer walls first (most complex hierarchy)
    const outerWalls = modelStore.getOuterWallsByFloor(activeFloorId)
    for (const outerWall of outerWalls) {
      // Check if point is within outer wall polygon bounds
      if (this.isPointInPolygon(point, outerWall.boundary)) {
        // Check for opening hits first (most specific)
        for (let i = 0; i < outerWall.segments.length; i++) {
          const segment = outerWall.segments[i]
          for (const opening of segment.openings) {
            if (this.isPointInOpening(point, segment, opening)) {
              return {
                entityId: outerWall.id,
                subEntityId: opening.id,
                subEntityType: 'opening'
              }
            }
          }
        }

        // Check for segment hits
        for (const segment of outerWall.segments) {
          if (this.isPointInSegment(point, segment, stageTolerance)) {
            return {
              entityId: outerWall.id,
              subEntityId: segment.id,
              subEntityType: 'segment'
            }
          }
        }

        // Check for corner hits
        for (const corner of outerWall.corners) {
          if (this.isPointNearCorner(point, corner.outsidePoint, stageTolerance)) {
            return {
              entityId: outerWall.id,
              subEntityId: corner.id,
              subEntityType: 'corner'
            }
          }
        }

        // Hit the outer wall polygon but no specific sub-entity
        return {
          entityId: outerWall.id
        }
      }
    }

    // Check points (smallest targets)
    const nearestPoint = modelStore.findNearestPoint(activeFloorId, point, createLength(stageTolerance))
    if (nearestPoint) {
      return {
        entityId: nearestPoint.id
      }
    }

    // Check walls
    const wall = modelStore.getWallAtPoint(point, activeFloorId)
    if (wall) {
      return {
        entityId: wall.id
      }
    }

    return null
  }

  private getCurrentEntitySelection(context: ToolContext): EntityId | null {
    return context.getSelectedEntityId()
  }

  // Geometry helper methods
  private isPointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
    // Simple point-in-polygon test using ray casting
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i][1] > point[1] !== polygon[j][1] > point[1] &&
        point[0] <
          ((polygon[j][0] - polygon[i][0]) * (point[1] - polygon[i][1])) / (polygon[j][1] - polygon[i][1]) +
            polygon[i][0]
      ) {
        inside = !inside
      }
    }
    return inside
  }

  private isPointInSegment(point: Vec2, segment: any, tolerance: number): boolean {
    // Check if point is near the segment's inside or outside line
    const distToInside = this.distancePointToLine(point, segment.insideLine.start, segment.insideLine.end)
    const distToOutside = this.distancePointToLine(point, segment.outsideLine.start, segment.outsideLine.end)
    return Math.min(distToInside, distToOutside) <= tolerance
  }

  private isPointInOpening(point: Vec2, segment: any, opening: any): boolean {
    // Calculate opening position along segment and check if point is within opening bounds
    // This is a simplified implementation - you might need more sophisticated geometry
    const segmentStart = segment.insideLine.start
    const segmentDir = segment.direction
    const openingStart = [
      segmentStart[0] + segmentDir[0] * opening.offsetFromStart,
      segmentStart[1] + segmentDir[1] * opening.offsetFromStart
    ]
    const openingEnd = [
      openingStart[0] + segmentDir[0] * opening.width,
      openingStart[1] + segmentDir[1] * opening.width
    ]

    return this.distancePointToLine(point, openingStart, openingEnd) <= 10 // 10mm tolerance
  }

  private isPointNearCorner(point: Vec2, cornerPoint: Vec2, tolerance: number): boolean {
    const dx = point[0] - cornerPoint[0]
    const dy = point[1] - cornerPoint[1]
    return Math.sqrt(dx * dx + dy * dy) <= tolerance
  }

  private distancePointToLine(point: Vec2, lineStart: Vec2, lineEnd: Vec2): number {
    const A = point[0] - lineStart[0]
    const B = point[1] - lineStart[1]
    const C = lineEnd[0] - lineStart[0]
    const D = lineEnd[1] - lineStart[1]

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    if (lenSq === 0) return Math.sqrt(A * A + B * B)

    const param = dot / lenSq
    let closestX, closestY

    if (param < 0) {
      closestX = lineStart[0]
      closestY = lineStart[1]
    } else if (param > 1) {
      closestX = lineEnd[0]
      closestY = lineEnd[1]
    } else {
      closestX = lineStart[0] + param * C
      closestY = lineStart[1] + param * D
    }

    const dx = point[0] - closestX
    const dy = point[1] - closestY
    return Math.sqrt(dx * dx + dy * dy)
  }
}
