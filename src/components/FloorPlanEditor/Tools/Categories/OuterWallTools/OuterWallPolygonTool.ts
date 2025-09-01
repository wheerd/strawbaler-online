import type { Tool, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D, Polygon2D, LineSegment2D } from '@/types/geometry'
import { createLength, polygonIsClockwise } from '@/types/geometry'
import type { SnappingContext, SnapResult } from '@/model/store/services/snapping/types'
import React from 'react'
import { Line, Circle } from 'react-konva'
import { SnappingService } from '@/model/store/services/snapping'
import { createPointId, type FloorId } from '@/model'

interface OuterWallPolygonToolState {
  points: Point2D[]
  snapResult?: SnapResult
  snapContext: SnappingContext
}

export class OuterWallPolygonTool implements Tool {
  readonly id = 'outer-wall-polygon'
  readonly name = 'Outer Wall Polygon'
  readonly icon = '⬜'
  readonly cursor = 'crosshair'
  readonly category = 'walls'
  readonly hasInspector = false

  public state: OuterWallPolygonToolState = {
    points: [],
    snapContext: {
      points: [],
      alignPoints: [],
      referenceLineSegments: []
    }
  }

  private snapService = new SnappingService()

  private readonly firstPointId = createPointId()

  private updateSnapContext() {
    const referenceLineSegments: LineSegment2D[] = []
    for (let i = 1; i < this.state.points.length; i++) {
      const start = this.state.points[i - 1]
      const end = this.state.points[i]
      referenceLineSegments.push({ start, end })
    }

    this.state.snapContext = {
      points:
        this.state.points.length > 0
          ? [
              {
                id: this.firstPointId,
                position: this.state.points[0],
                floorId: 'invalid' as FloorId,
                roomIds: new Set()
              }
            ]
          : [],
      alignPoints: this.state.points,
      referencePoint: this.state.points[this.state.points.length - 1],
      referenceLineSegments
    }
    console.log(this.state.snapContext)
  }

  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined
    const snapCoords = this.state.snapResult?.position ?? stageCoords

    // Check if clicking near the first point to close the polygon
    if (this.state.points.length >= 3) {
      if (this.state.snapResult?.pointId === this.firstPointId) {
        this.completePolygon(event)
        return true
      }
    }

    // Add point to polygon
    this.state.points.push(snapCoords)
    this.updateSnapContext()

    return true
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    this.state.snapResult = this.snapService.findSnapResult(stageCoords, this.state.snapContext) ?? undefined
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      // Only handle escape if we have points, otherwise bubble up
      if (this.state.points.length > 0) {
        this.cancelPolygon()
        return true
      }
      return false // Bubble up to allow tool cancellation
    }

    if (keyEvent.key === 'Enter' && this.state.points.length >= 3) {
      this.completePolygon(event)
      return true
    }

    return false
  }

  onActivate(): void {
    this.state.points = []
    this.updateSnapContext()
  }

  onDeactivate(): void {
    this.state.points = []
    this.updateSnapContext()
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    if (this.state.points.length === 0) return null

    const elements: React.ReactNode[] = []

    // Draw existing points
    this.state.points.forEach((point, index) => {
      const isFirstPoint = index === 0

      elements.push(
        React.createElement(Circle, {
          key: `point-${index}`,
          x: point.x,
          y: point.y,
          radius: 20,
          fill: isFirstPoint ? '#ef4444' : '#3b82f6',
          stroke: '#ffffff',
          strokeWidth: 3,
          listening: false
        })
      )
    })

    // Draw lines between points
    if (this.state.points.length > 1) {
      const points: number[] = []
      for (const point of this.state.points) {
        points.push(point.x, point.y)
      }

      elements.push(
        React.createElement(Line, {
          key: 'polygon-lines',
          points,
          stroke: '#3b82f6',
          strokeWidth: 10,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false
        })
      )
    }

    // Draw line to current mouse position
    if (this.state.points.length > 0) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const currentPos = context.snapResult?.position || context.snapTarget || context.currentMousePos

      if (currentPos) {
        elements.push(
          React.createElement(Line, {
            key: 'preview-line',
            points: [lastPoint.x, lastPoint.y, currentPos.x, currentPos.y],
            stroke: '#94a3b8',
            strokeWidth: 10,
            dash: [30, 30],
            listening: false
          })
        )
      }
    }

    return React.createElement(React.Fragment, null, ...elements)
  }

  getContextActions(): ContextAction[] {
    const actions: ContextAction[] = []

    if (this.state.points.length > 0) {
      actions.push({
        label: 'Cancel Polygon',
        action: () => this.cancelPolygon(),
        hotkey: 'Escape',
        icon: '✕'
      })
    }

    if (this.state.points.length >= 3) {
      actions.push({
        label: 'Complete Polygon',
        action: () => this.completePolygon(null),
        hotkey: 'Enter',
        icon: '✓'
      })
    }

    return actions
  }

  private completePolygon(event: CanvasEvent | null): void {
    if (this.state.points.length < 3) return

    // Create polygon and ensure clockwise order for outer walls
    let polygon: Polygon2D = { points: [...this.state.points] }

    // Check if polygon is clockwise, if not reverse it
    if (!polygonIsClockwise(polygon)) {
      polygon = { points: [...this.state.points].reverse() }
    }

    if (event) {
      const modelStore = event.context.getModelStore()
      const activeFloorId = event.context.getActiveFloorId()

      try {
        modelStore.addOuterWallPolygon(
          activeFloorId,
          polygon,
          'cells-under-tension',
          createLength(440) // Default 44cm thickness
        )
      } catch (error) {
        console.error('Failed to create outer wall polygon:', error)
      }
    }

    this.state.points = []
    this.updateSnapContext()
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.updateSnapContext()
  }
}
