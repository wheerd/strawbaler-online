import type { Tool, ToolContext, ContextAction, CanvasEvent, ToolOverlayContext } from '../../ToolSystem/types'
import type { Point2D } from '@/types/geometry'
import { distanceSquared } from '@/types/geometry'
import React from 'react'
import { Line, Circle, Text } from 'react-konva'
import type { StoreActions, FloorId, PointId } from '@/model'

export interface WallToolState {
  isDrawing: boolean
  startPoint?: Point2D
  thickness: number // mm
  previewEndPoint?: Point2D // Tool handles its own preview
  hoverPoint?: Point2D // Point where mouse is hovering (for start point preview)
}

export interface WallTypeConfig {
  id: string
  name: string
  icon: string
  hotkey?: string
  defaultThickness: number // mm
  primaryColor: string // Color for main preview elements
  secondaryColor: string // Color for thickness indicators
  label: string // Label to show in length text (e.g., "Structural", "Partition")
}

export abstract class BaseWallTool implements Tool {
  // Tool metadata from config
  readonly id: string
  readonly name: string
  readonly icon: string
  readonly hotkey?: string

  // Common tool properties
  readonly cursor = 'crosshair'
  readonly category = 'walls'
  readonly hasInspector = true

  public state: WallToolState
  protected config: WallTypeConfig

  constructor(config: WallTypeConfig) {
    this.config = config
    this.id = config.id
    this.name = config.name
    this.icon = config.icon
    this.hotkey = config.hotkey

    this.state = {
      isDrawing: false,
      thickness: config.defaultThickness
    }
  }

  // Abstract methods - must be implemented by concrete classes
  protected abstract createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): void

  // Event handlers (common implementation)
  handleMouseDown(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (!this.state.isDrawing) {
      // Start drawing wall
      this.state.isDrawing = true
      this.state.startPoint = snapCoords
      // Clear any previous preview state to avoid artifacts
      this.state.previewEndPoint = undefined
      this.state.hoverPoint = undefined
      event.context.updateSnapReference(snapCoords, snapResult?.pointId ?? null)
      return true
    } else if (this.state.startPoint) {
      // Finish drawing wall
      const wallLength = distanceSquared(this.state.startPoint, snapCoords)

      if (wallLength >= 50 ** 2) {
        // Minimum 50mm wall length - create wall using model store
        const modelStore = event.context.getModelStore()
        const activeFloorId = event.context.getActiveFloorId()

        // Get or create points
        const startPointEntity = modelStore.addPoint(activeFloorId, this.state.startPoint)
        const endPointEntity = modelStore.addPoint(activeFloorId, snapCoords)

        // Create wall using abstract method
        this.createWall(modelStore, activeFloorId, startPointEntity.id, endPointEntity.id, this.state.thickness)
      } else {
        // TODO: Handle minimum wall length validation
      }

      // Reset state
      this.state.isDrawing = false
      this.state.startPoint = undefined
      this.state.previewEndPoint = undefined
      this.state.hoverPoint = undefined
      event.context.clearSnapState()
      return true
    }

    return false
  }

  handleMouseMove(event: CanvasEvent): boolean {
    const stageCoords = event.stageCoordinates
    const snapResult = event.context.findSnapPoint(stageCoords)
    const snapCoords = snapResult?.position ?? stageCoords

    if (this.state.isDrawing && this.state.startPoint) {
      // Update preview end point during drawing
      this.state.previewEndPoint = snapCoords
      return true
    } else {
      // Update hover point before drawing starts (for start point preview)
      this.state.hoverPoint = snapCoords
      // Update snap target for visual feedback
      event.context.updateSnapTarget(snapCoords)
      return true
    }
  }

  handleKeyDown(event: CanvasEvent): boolean {
    const keyEvent = event.originalEvent as KeyboardEvent
    if (keyEvent.key === 'Escape' && this.state.isDrawing) {
      this.cancelDrawing(event.context)
      return true
    }

    return false
  }

  // Lifecycle methods
  onActivate(): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
    this.state.previewEndPoint = undefined
    this.state.hoverPoint = undefined
  }

  onDeactivate(): void {
    if (this.state.isDrawing) {
      this.state.isDrawing = false
      this.state.startPoint = undefined
      this.state.previewEndPoint = undefined
      this.state.hoverPoint = undefined
    }
  }

  renderOverlay(context: ToolOverlayContext): React.ReactNode {
    // Show hover point indicator when not drawing (for start point preview)
    if (!this.state.isDrawing) {
      const hoverPoint =
        this.state.hoverPoint || context.snapResult?.position || context.snapTarget || context.currentMousePos

      if (!hoverPoint) return null

      return React.createElement(Circle, {
        x: hoverPoint.x,
        y: hoverPoint.y,
        radius: 18,
        fill: this.config.primaryColor,
        stroke: '#ffffff',
        strokeWidth: 4,
        opacity: 0.7,
        listening: false
      })
    }

    // Show wall preview when drawing
    if (!this.state.startPoint) return null

    // Use preview end point from tool state, fallback to current snap position
    const endPoint =
      this.state.previewEndPoint || context.snapResult?.position || context.snapTarget || context.currentMousePos

    if (!endPoint) return null

    return React.createElement(
      React.Fragment,
      null,
      // Main wall preview line
      React.createElement(Line, {
        points: [this.state.startPoint.x, this.state.startPoint.y, endPoint.x, endPoint.y],
        stroke: this.config.primaryColor,
        strokeWidth: this.state.thickness,
        opacity: 0.6,
        dash: [20, 15],
        listening: false
      }),

      // Wall thickness indicators
      this.renderThicknessIndicators(this.state.startPoint, endPoint),

      // End point snap indicator
      React.createElement(Circle, {
        x: endPoint.x,
        y: endPoint.y,
        radius: 15,
        fill: this.config.primaryColor,
        stroke: '#ffffff',
        strokeWidth: 3,
        opacity: 0.8,
        listening: false
      }),

      // Start point indicator
      React.createElement(Circle, {
        x: this.state.startPoint.x,
        y: this.state.startPoint.y,
        radius: 12,
        fill: '#ff6600',
        stroke: '#ffffff',
        strokeWidth: 3,
        opacity: 0.8,
        listening: false
      }),

      // Wall length text
      this.renderLengthLabel(this.state.startPoint, endPoint)
    )
  }

  private renderThicknessIndicators(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    // Calculate perpendicular vector for thickness
    const dx = endPoint.x - startPoint.x
    const dy = endPoint.y - startPoint.y
    const length = Math.sqrt(dx * dx + dy * dy)

    if (length === 0) return null

    // Normalize and get perpendicular
    const perpX = (-dy / length) * (this.state.thickness / 2)
    const perpY = (dx / length) * (this.state.thickness / 2)

    return React.createElement(
      React.Fragment,
      null,
      // Top edge of wall
      React.createElement(Line, {
        points: [startPoint.x + perpX, startPoint.y + perpY, endPoint.x + perpX, endPoint.y + perpY],
        stroke: this.config.secondaryColor,
        strokeWidth: 3,
        opacity: 0.4,
        dash: [10, 5],
        listening: false
      }),

      // Bottom edge of wall
      React.createElement(Line, {
        points: [startPoint.x - perpX, startPoint.y - perpY, endPoint.x - perpX, endPoint.y - perpY],
        stroke: this.config.secondaryColor,
        strokeWidth: 3,
        opacity: 0.4,
        dash: [10, 5],
        listening: false
      })
    )
  }

  private renderLengthLabel(startPoint: Point2D, endPoint: Point2D): React.ReactNode {
    const length = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2))

    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2

    return React.createElement(Text, {
      x: midX,
      y: midY - 25,
      text: `${(length / 1000).toFixed(2)}m (${this.config.label})`,
      fontSize: 22,
      fill: this.config.primaryColor,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      align: 'center',
      listening: false,
      shadowColor: '#ffffff',
      shadowBlur: 6,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    })
  }

  getContextActions(context: ToolContext): ContextAction[] {
    const actions: ContextAction[] = []

    // Wall-specific actions
    if (this.state.isDrawing) {
      actions.push({
        label: 'Cancel Wall',
        action: () => this.cancelDrawing(context),
        hotkey: 'Escape',
        icon: '✕'
      })
    }

    // Quick tool switching (abstract - could be customized by subclasses)
    actions.push({
      label: 'Switch Wall Type',
      action: () => {
        // Implementation would cycle through wall types
      },
      hotkey: 'Tab'
    })

    return actions
  }

  // Helper methods
  private cancelDrawing(context?: ToolContext): void {
    this.state.isDrawing = false
    this.state.startPoint = undefined
    this.state.previewEndPoint = undefined
    this.state.hoverPoint = undefined
    if (context) {
      context.clearSnapState()
    }
  }
}
