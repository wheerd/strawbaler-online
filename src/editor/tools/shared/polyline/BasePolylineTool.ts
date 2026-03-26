import {
  type SnapCandidate,
  type SnapResult,
  type SnappingContext,
  SnappingService
} from '@/editor/canvas/services/SnappingService'
import type { LengthInputPosition } from '@/editor/canvas/services/length-input'
import { activateLengthInput, deactivateLengthInput } from '@/editor/canvas/services/length-input'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { CursorStyle, EditorEvent } from '@/editor/tools/system/types'
import {
  type Length,
  type LineSegment2D,
  type Vec2,
  ZERO_VEC2,
  direction,
  scaleAddVec2,
  wouldPolygonSelfIntersect
} from '@/shared/geometry'

export interface PolylineValidationContext {
  existingWalls: { centerLine: LineSegment2D }[]
}

export interface PolylineToolStateBase {
  points: Vec2[]
  pointer: Vec2
  snapResult?: SnapResult<void>
  snapCandidates: SnapCandidate<void>[]
  isCurrentSegmentValid: boolean
  lengthOverride: Length | null
  segmentLengthOverrides: (Length | null)[]
  validationContext: PolylineValidationContext
}

export abstract class BasePolylineTool<TState extends PolylineToolStateBase> extends BaseTool {
  public state: TState

  private snappingService: SnappingService<void> | null = null

  protected constructor(toolSystem: ToolSystem, initialState: Omit<TState, keyof PolylineToolStateBase>) {
    super(toolSystem)
    const initialCandidates = this.createBaseSnapCandidates([])
    this.state = {
      points: [] as Vec2[],
      pointer: ZERO_VEC2,
      snapResult: undefined,
      isCurrentSegmentValid: true,
      lengthOverride: null,
      segmentLengthOverrides: [] as (Length | null)[],
      validationContext: this.createInitialValidationContext(),
      snapCandidates: this.extendSnapCandidates(initialCandidates),
      ...initialState
    } as TState
  }

  protected createInitialValidationContext(): PolylineValidationContext {
    return {
      existingWalls: []
    }
  }

  handlePointerDown(event: EditorEvent): boolean {
    this.state.pointer = event.worldCoordinates
    this.state.snapResult = this.findSnap(event.worldCoordinates)
    const snapCoords = this.state.snapResult?.position ?? event.worldCoordinates

    if (!this.state.isCurrentSegmentValid) return true

    const shouldTerminate = this.shouldTerminateAtSnap(this.state.snapResult)

    let pointToAdd = snapCoords
    if (this.state.lengthOverride && this.state.points.length > 0) {
      const lastPoint = this.state.points[this.state.points.length - 1]
      const dir = direction(lastPoint, snapCoords)
      pointToAdd = scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
    }

    if (this.state.points.length > 0) {
      this.state.segmentLengthOverrides.push(this.state.lengthOverride)
    }

    this.state.points.push(pointToAdd)
    this.updateSnapCandidates()
    this.clearLengthOverride()
    this.updateValidation()

    if (this.state.points.length >= 1) {
      this.activateLengthInputForNextSegment()
    }

    if (shouldTerminate && this.state.points.length >= 2) {
      this.complete()
    }

    return true
  }

  handlePointerMove(event: EditorEvent): boolean {
    this.state.pointer = event.worldCoordinates
    this.state.snapResult = this.findSnap(event.worldCoordinates)
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
    this.updateSnapCandidates()
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
    this.onPolylineCancelled()
    deactivateLengthInput()
  }

  public complete(): void {
    if (this.state.points.length < this.getMinimumPointCount()) return

    const points = [...this.state.points]

    try {
      this.onPolylineCompleted(points)
    } catch (error) {
      this.onPolylineCompletionFailed(error)
    }

    this.resetDrawingState()
    deactivateLengthInput()
  }

  public getPreviewPosition(): Vec2 {
    const currentPos = this.state.snapResult?.position ?? this.state.pointer

    if (!this.state.lengthOverride || this.state.points.length === 0) {
      return currentPos
    }

    const lastPoint = this.state.points[this.state.points.length - 1]
    const dir = direction(lastPoint, currentPos)
    return scaleAddVec2(lastPoint, dir, this.state.lengthOverride)
  }

  protected updateSnapCandidates(): void {
    const candidates = this.createBaseSnapCandidates(this.state.points)
    this.state.snapCandidates = this.extendSnapCandidates(candidates)
    this.snappingService = null
    this.triggerRender()
  }

  protected createBaseSnapCandidates(points: readonly Vec2[]): SnapCandidate<void>[] {
    const candidates: SnapCandidate<void>[] = []

    for (let i = 1; i < points.length; i += 1) {
      candidates.push({
        type: 'segment',
        segment: { start: points[i - 1], end: points[i] }
      })
    }

    for (const point of points) {
      candidates.push({
        type: 'point',
        position: point,
        mode: 'align'
      })
    }

    return candidates
  }

  protected extendSnapCandidates(candidates: SnapCandidate<void>[]): SnapCandidate<void>[] {
    return candidates
  }

  public getMinimumPointCount(): number {
    return 2
  }

  protected shouldTerminateAtSnap(_snapResult: SnapResult<void> | undefined): boolean {
    return false
  }

  protected abstract onPolylineCompleted(points: Vec2[]): void

  protected onPolylineCancelled(): void {}

  protected onPolylineCompletionFailed(error: unknown): void {
    console.error('Failed to create polyline:', error)
  }

  protected onToolActivated(): void {}

  protected onToolDeactivated(): void {}

  private getOrCreateSnappingService(): SnappingService<void> {
    if (!this.snappingService) {
      const context: SnappingContext<void> = {
        candidates: this.state.snapCandidates
      }
      this.snappingService = new SnappingService(context)

      if (this.state.points.length > 0) {
        this.snappingService.referencePoint = this.state.points[this.state.points.length - 1]
        this.snappingService.referenceMinDistance = 50
      }
    }
    return this.snappingService
  }

  private findSnap(target: Vec2): SnapResult<void> | undefined {
    const result = this.getOrCreateSnappingService().findSnapResult(target)
    return result ?? undefined
  }

  private updateValidation(): void {
    if (this.state.points.length === 0) {
      this.state.isCurrentSegmentValid = true
      return
    }

    const currentPos = this.state.snapResult?.position ?? this.state.pointer
    this.state.isCurrentSegmentValid = !wouldPolygonSelfIntersect(this.state.points, currentPos)
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
      onCommit: (length: Length) => {
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
    this.state.lengthOverride = null
    this.state.segmentLengthOverrides = []
    this.state.validationContext = this.createInitialValidationContext()
    this.snappingService = null
    this.updateSnapCandidates()
  }
}
