import type { SelectableId } from '@/building/model'
import type { StoreActions } from '@/building/store'
import type { SnapResult } from '@/editor/canvas/services/SnappingService'
import { SnappingService } from '@/editor/canvas/services/SnappingService'
import { PolygonMovementPreview } from '@/editor/tools/basic/movement/previews/PolygonMovementPreview'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/types'
import { type Vec2, addVec2, copyVec2, distSqrVec2, subVec2 } from '@/shared/geometry'

export interface PolygonEntityContext {
  snapService: SnappingService<void>
}

export interface PolygonMovementState extends MovementState {
  previewPolygon: readonly Vec2[]
  snapResults: SnapResult<void>[]
}

export abstract class PolygonMovementBehavior<TEntity extends PolygonEntityContext> implements MovementBehavior<
  TEntity,
  PolygonMovementState
> {
  previewComponent = PolygonMovementPreview<TEntity>

  abstract getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): TEntity

  initializeState(pointerState: PointerMovementState, context: MovementContext<TEntity>): PolygonMovementState {
    return {
      previewPolygon: this.getPolygonPoints(context),
      movementDelta: copyVec2(pointerState.delta),
      snapResults: []
    }
  }

  constrainAndSnap(pointerState: PointerMovementState, context: MovementContext<TEntity>): PolygonMovementState {
    const originalPoints = this.getPolygonPoints(context)
    const previewPoints = originalPoints.map(point => addVec2(point, pointerState.delta))

    const service = context.entity.snapService

    let highestPriority = -Infinity
    let bestDist = Infinity
    let resultDelta = copyVec2(pointerState.delta)

    for (let index = 0; index < previewPoints.length; index += 1) {
      const snapResult = service.findSnapResult(previewPoints[index]) ?? undefined
      if (!snapResult) continue

      const dist = distSqrVec2(previewPoints[index], snapResult.position)
      if (highestPriority < snapResult.priority || (highestPriority === snapResult.priority && dist < bestDist)) {
        highestPriority = snapResult.priority
        bestDist = dist
        resultDelta = subVec2(snapResult.position, originalPoints[index])
      }
    }

    const finalPoints = this.translatePoints(originalPoints, resultDelta)
    const snapResults = finalPoints.map(point => service.findSnapResult(point, 1)).filter(r => r != null)

    return {
      previewPolygon: finalPoints,
      movementDelta: resultDelta,
      snapResults
    }
  }

  validatePosition(_movementState: PolygonMovementState, _context: MovementContext<TEntity>): boolean {
    return true
  }

  commitMovement(movementState: PolygonMovementState, context: MovementContext<TEntity>): boolean {
    return this.applyMovementDelta(movementState.movementDelta, context)
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<TEntity>): boolean {
    return this.applyMovementDelta(deltaDifference, context)
  }

  protected translatePoints(points: readonly Vec2[], delta: Vec2): Vec2[] {
    return points.map(point => addVec2(point, delta))
  }

  protected abstract getPolygonPoints(context: MovementContext<TEntity>): readonly Vec2[]

  protected abstract applyMovementDelta(delta: Vec2, context: MovementContext<TEntity>): boolean
}
