import type { Tool, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D, Polygon2D } from '@/types/geometry'
import { createLength } from '@/types/geometry'
import React from 'react'
import { Line, Circle } from 'react-konva'

interface OuterWallPolygonToolState {
  points: Point2D[]
  isComplete: boolean
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
    isComplete: false
  }

  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (this.state.isComplete) {
      // Start a new polygon
      this.state.points = [snapCoords]
      this.state.isComplete = false
      return true
    }

    // Check if clicking near the first point to close the polygon
    if (this.state.points.length >= 3) {
      const firstPoint = this.state.points[0]
      const distanceToFirst = Math.sqrt(
        Math.pow(snapCoords.x - firstPoint.x, 2) + Math.pow(snapCoords.y - firstPoint.y, 2)
      )

      if (distanceToFirst < 20) {
        // Close polygon if within 20 pixels of start
        this.completePolygon(event)
        return true
      }
    }

    // Add point to polygon
    this.state.points.push(snapCoords)
    return true
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    event.context.updateSnapTarget(snapResult?.position ?? stageCoords)
    return true
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent

    if (keyEvent.key === 'Escape') {
      this.cancelPolygon()
      return true
    }

    if (keyEvent.key === 'Enter' && this.state.points.length >= 3) {
      this.completePolygon(event)
      return true
    }

    return false
  }

  onActivate(): void {
    this.state.points = []
    this.state.isComplete = false
  }

  onDeactivate(): void {
    this.state.points = []
    this.state.isComplete = false
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    if (this.state.points.length === 0) return null

    const elements: React.ReactNode[] = []

    // Draw existing points
    this.state.points.forEach((point, index) => {
      elements.push(
        React.createElement(Circle, {
          key: `point-${index}`,
          x: point.x,
          y: point.y,
          radius: 8,
          fill: index === 0 ? '#ef4444' : '#3b82f6',
          stroke: '#ffffff',
          strokeWidth: 2,
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
          strokeWidth: 2,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false
        })
      )
    }

    // Draw line to current mouse position
    if (this.state.points.length > 0 && !this.state.isComplete) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const currentPos = context.snapResult?.position || context.snapTarget || context.currentMousePos

      if (currentPos) {
        elements.push(
          React.createElement(Line, {
            key: 'preview-line',
            points: [lastPoint.x, lastPoint.y, currentPos.x, currentPos.y],
            stroke: '#94a3b8',
            strokeWidth: 1,
            dash: [5, 5],
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

    const polygon: Polygon2D = { points: [...this.state.points] }

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
    this.state.isComplete = false
  }

  private cancelPolygon(): void {
    this.state.points = []
    this.state.isComplete = false
  }
}
