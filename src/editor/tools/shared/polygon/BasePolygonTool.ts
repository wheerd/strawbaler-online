import { type SnapResult, SnappingService } from '@/editor/canvas/services/SnappingService'
import type { LengthInputPosition } from '@/editor/canvas/services/length-input'
import { activateLengthInput, deactivateLengthInput } from '@/editor/canvas/services/length-input'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { CursorStyle, EditorEvent } from '@/editor/tools/system/types'
import {
  type Length,
  type Polygon2D,
  type Vec2,
  ZERO_VEC2,
  direction,
  distSqrVec2,
  scaleAddVec2,
  wouldClosingPolygonSelfIntersect,
  wouldPolygonSelfIntersect
} from '@/shared/geometry'

export interface PolygonToolStateBase {
  points: Vec2[]
  pointer: Vec2
  snapResult?: SnapResult<void>
  snapService: SnappingService<void>
  isCurrentSegmentValid: boolean
  isClosingSegmentValid: boolean
  lengthOverride: Length | null
  /** Per-segment record of which segments had a user-typed length override. */
  segmentLengthOverrides: (Length | null)[]
  /** Index of the point that was snapped to the origin [0, 0], if any. */
  originSnappedIndex: number | null
}

/**
 * Base class for polygon-creation tools. Handles pointer interaction, snapping,
 * validation, and length overrides. Concrete tools provide completion logic and
 * can augment the snapping context with domain-specific geometry.
 */
export abstract class BasePolygonTool<TState extends PolygonToolStateBase> extends BaseTool {
  public state: TState

  protected constructor(toolSystem: ToolSystem, initialState: Omit<TState, keyof PolygonToolStateBase>) {
    super(toolSystem)

    const snapService = new SnappingService<void>({ candidates: [] })
    this.setupSnapService(snapService)

    this.state = {
      points: [] as Vec2[],
      pointer: ZERO_VEC2,
      snapResult: undefined,
      isCurrentSegmentValid: true,
      isClosingSegmentValid: true,
      lengthOverride: null,
      segmentLengthOverrides: [] as (Length | null)[],
      originSnappedIndex: null,
      snapService,
      ...initialState
    } as TState
  }

  handlePointerDown(event: EditorEvent): boolean {
    this.state.pointer = event.worldCoordinates
    this.state.snapResult = this.findSnap(event.worldCoordinates)
    const snapCoords = this.state.snapResult?.position ?? event.worldCoordinates

    if (this.state.points.length >= this.getMinimumPointCount()) {
      if (this.isSnappingToFirstPoint()) {
        if (this.state.isClosingSegmentValid) {
          this.complete()
        }
        return true
      }
    }

    if (this.state.isCurrentSegmentValid) {
      let pointToAdd = snapCoords
      if (this.state.lengthOverride && this.state.points.length > 0) {
        const lastPoint = this.state.points[this.state.points.length - 1]
        const dir = direction(lastPoint, snapCoords)
        pointToAdd = scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
      }

      // Record the length override for the segment that just ended at pointToAdd.
      // Segment i goes from points[i] to points[i+1], so when we push point[n]
      // the segment from points[n-1] to points[n] is segment n-1.
      if (this.state.points.length > 0) {
        this.state.segmentLengthOverrides.push(this.state.lengthOverride)
      }

      // Check if point was snapped to origin (within tolerance)
      const ORIGIN_SNAP_TOLERANCE = 1 // 1mm
      const isAtOrigin =
        Math.abs(pointToAdd[0]) < ORIGIN_SNAP_TOLERANCE && Math.abs(pointToAdd[1]) < ORIGIN_SNAP_TOLERANCE
      if (isAtOrigin && this.state.snapResult != null) {
        this.state.originSnappedIndex = this.state.points.length
      }

      this.addPoint(pointToAdd)

      this.clearLengthOverride()
      this.updateValidation()

      if (this.state.points.length >= 1) {
        this.activateLengthInputForNextSegment()
      }
    }

    return true
  }

  private addPoint(pointToAdd: Vec2) {
    this.state.points.push(pointToAdd)

    const snapService = this.state.snapService
    snapService.referencePoint = pointToAdd
    snapService.addSnapCandidate({
      type: 'point',
      position: pointToAdd,
      mode: 'align'
    })

    if (this.state.points.length === 1) {
      snapService.addSnapCandidate({
        type: 'point',
        position: pointToAdd,
        mode: 'snap',
        priority: 1
      })
    }

    if (this.state.points.length > 1) {
      const lastPoint = this.state.points[this.state.points.length - 2]
      const line = { point: lastPoint, direction: direction(lastPoint, pointToAdd) }
      snapService.addSnapCandidate({
        type: 'line',
        line
      })
    }
  }

  handlePointerMove(event: EditorEvent): boolean {
    const stageCoords = event.worldCoordinates
    this.state.pointer = stageCoords
    this.state.snapResult = this.findSnap(stageCoords)

    this.updateValidation()
    this.triggerRender()
    return true
  }

  handleKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      if (this.state.lengthOverride) {
        this.clearLengthOverride()
        return true
      }
      if (this.state.points.length > 0) {
        this.cancel()
        return true
      }
      return false
    }

    if (event.key === 'Enter' && this.state.points.length >= this.getMinimumPointCount()) {
      this.complete()
      return true
    }

    return false
  }

  onActivate(): void {
    this.resetDrawingState()
    this.onToolActivated()
    this.createSnapService()
  }

  onDeactivate(): void {
    this.resetDrawingState()
    this.onToolDeactivated()
    deactivateLengthInput()
  }

  getCursor(): CursorStyle {
    return 'crosshair'
  }

  public cancel(): void {
    this.resetDrawingState()
    this.onPolygonCancelled()
    deactivateLengthInput()
  }

  public complete(): void {
    if (this.state.points.length < this.getMinimumPointCount()) return
    if (!this.state.isClosingSegmentValid) return

    // The closing segment (last→first) never has a user-typed override.
    this.state.segmentLengthOverrides.push(null)

    const polygon = this.buildPolygon([...this.state.points])

    try {
      this.onPolygonCompleted(polygon)
    } catch (error) {
      this.onPolygonCompletionFailed(error)
    }

    this.resetDrawingState()
    deactivateLengthInput()
  }

  /**
   * Position used for overlay preview and ghost point rendering.
   */
  public getPreviewPosition(): Vec2 {
    const currentPos = this.state.snapResult?.position ?? this.state.pointer

    if (!this.state.lengthOverride || this.state.points.length === 0) {
      return currentPos
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const dir = direction(lastPoint, currentPos)
    return scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
  }

  protected createSnapService(): void {
    const service = new SnappingService<void>({ candidates: [] })
    this.setupSnapService(service)
    this.state.snapService = service
  }

  protected setupSnapService(_snapService: SnappingService<void>): void {
    // Override to add additional snap candidates from subclass
  }

  public getMinimumPointCount(): number {
    return 3
  }

  protected getSnapToFirstPointDistanceSquared(): number {
    const distance = 5 // millimetres
    return distance * distance
  }

  protected buildPolygon(points: Vec2[]): Polygon2D {
    return { points }
  }

  protected onPolygonCancelled(): void {
    // Optional hook for subclasses
  }

  protected onPolygonCompletionFailed(error: unknown): void {
    console.error('Failed to create polygon:', error)
  }

  protected onToolActivated(): void {
    // Optional hook for subclasses
  }

  protected onToolDeactivated(): void {
    // Optional hook for subclasses
  }

  protected abstract onPolygonCompleted(polygon: Polygon2D): void

  private findSnap(target: Vec2): SnapResult<void> | undefined {
    const result = this.state.snapService.findSnapResult(target)
    return result ?? undefined
  }

  public isSnappingToFirstPoint(): boolean {
    if (this.state.points.length === 0 || !this.state.snapResult?.position) {
      return false
    }
    const firstPoint = this.state.points[0]
    const snapPos = this.state.snapResult.position
    return distSqrVec2(firstPoint, snapPos) < this.getSnapToFirstPointDistanceSquared()
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentSegmentValid = true
      this.state.isClosingSegmentValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.pointer
    const isSnapToFirstPoint = this.isSnappingToFirstPoint()

    if (isSnapToFirstPoint) {
      this.state.isCurrentSegmentValid =
        this.state.points.length >= this.getMinimumPointCount()
          ? !wouldClosingPolygonSelfIntersect({ points: this.state.points })
          : true
    } else {
      this.state.isCurrentSegmentValid = !wouldPolygonSelfIntersect(this.state.points, currentPos)
    }

    if (this.state.points.length >= this.getMinimumPointCount()) {
      this.state.isClosingSegmentValid = !wouldClosingPolygonSelfIntersect({ points: this.state.points })
    } else {
      this.state.isClosingSegmentValid = true
    }
  }

  public setLengthOverride(length: Length | null): void {
    this.state.lengthOverride = length
    this.triggerRender()
  }

  public clearLengthOverride(): void {
    this.state.lengthOverride = null
    this.triggerRender()
  }

  private activateLengthInputForNextSegment(): void {
    if (this.state.points.length === 0) return

    activateLengthInput({
      position: this.getLengthInputPosition(),
      placeholder: this.getLengthInputPlaceholder(),
      onCommit: length => {
        this.setLengthOverride(length)
      },
      onCancel: () => {
        this.clearLengthOverride()
      }
    })
  }

  private getLengthInputPlaceholder(): string {
    return 'Enter length...'
  }

  private getLengthInputPosition(): LengthInputPosition {
    const { worldToStage } = viewportActions()

    if (this.state.points.length === 0) {
      return { x: 400, y: 300 }
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const stageCoords = worldToStage(lastPoint)

    return {
      x: stageCoords[0] + 20,
      y: stageCoords[1] - 30
    }
  }

  private resetDrawingState(): void {
    this.state.points = []
    this.state.pointer = ZERO_VEC2
    this.state.snapResult = undefined
    this.state.isCurrentSegmentValid = true
    this.state.isClosingSegmentValid = true
    this.state.lengthOverride = null
    this.state.segmentLengthOverrides = []
    this.state.originSnappedIndex = null
    this.createSnapService()
  }
}
