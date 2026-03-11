import { gcsService } from '@/building/gcs/service'
import type { PerimeterWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isPerimeterId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { SnappingContext } from '@/editor/canvas/services/SnappingService'
import type { MovementContext } from '@/editor/tools/basic/movement/types'
import { type Vec2, ZERO_VEC2, addVec2, distSqrVec2 } from '@/shared/geometry'
import { arePolygonsIntersecting } from '@/shared/geometry/polygon'

import {
  type PolygonEntityContext,
  PolygonMovementBehavior,
  type PolygonMovementState
} from './PolygonMovementBehavior'

export interface PerimeterEntityContext extends PolygonEntityContext {
  perimeter: PerimeterWithGeometry
}

export type PerimeterMovementState = PolygonMovementState

const ORIGIN_LOCK_TOLERANCE_MM = 1
const ORIGIN_LOCK_TOLERANCE_SQUARED = ORIGIN_LOCK_TOLERANCE_MM * ORIGIN_LOCK_TOLERANCE_MM

export class PerimeterMovementBehavior extends PolygonMovementBehavior<PerimeterEntityContext> {
  canMove(entityId: SelectableId, store: StoreActions): boolean {
    if (!isPerimeterId(entityId)) {
      return true
    }

    const perimeter = store.getPerimeterById(entityId)
    for (const cornerId of perimeter.cornerIds) {
      const constraints = store.getConstraintsForEntity(cornerId)
      if (constraints.some(c => c.type === 'lockedCorner')) {
        return false
      }
    }
    return true
  }

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): PerimeterEntityContext {
    if (!isPerimeterId(entityId)) {
      throw new Error(`Invalid entity context for wall ${entityId}`)
    }

    const perimeter = store.getPerimeterById(entityId)

    const referenceSide = perimeter.referenceSide
    const activeStorey = store.getActiveStoreyId()
    const storeys = store.getStoreysOrderedByLevel()
    const storeyIndex = storeys.findIndex(s => s.id === activeStorey)
    const lowerStorey = storeyIndex > 0 ? storeys[storeyIndex - 1] : null
    const lowerPerimeters = lowerStorey ? store.getPerimetersByStorey(lowerStorey.id) : []
    const lowerPerimeterPoints = lowerPerimeters.flatMap(p =>
      referenceSide === 'inside' ? p.innerPolygon.points : p.outerPolygon.points
    )

    const otherPerimeters = store.getPerimetersByStorey(activeStorey).filter(p => p.id !== entityId)
    const otherPerimeterPoints = otherPerimeters.flatMap(p =>
      referenceSide === 'inside' ? p.innerPolygon.points : p.outerPolygon.points
    )

    const snapContext: SnappingContext = {
      snapPoints: [ZERO_VEC2, ...lowerPerimeterPoints],
      alignPoints: otherPerimeterPoints
    }

    return { perimeter, snapContext }
  }

  protected getPolygonPoints(context: MovementContext<PerimeterEntityContext>): readonly Vec2[] {
    const perimeter = context.entity.perimeter
    return perimeter.referenceSide === 'inside' ? perimeter.innerPolygon.points : perimeter.outerPolygon.points
  }

  validatePosition(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    return this.isDeltaValid(movementState.movementDelta, context)
  }

  commitMovement(movementState: PerimeterMovementState, context: MovementContext<PerimeterEntityContext>): boolean {
    if (!this.isDeltaValid(movementState.movementDelta, context)) {
      return false
    }
    const success = super.commitMovement(movementState, context)
    if (success) {
      this.autoLockOriginCorners(movementState, context)
    }
    return success
  }

  private autoLockOriginCorners(
    movementState: PerimeterMovementState,
    context: MovementContext<PerimeterEntityContext>
  ): void {
    const perimeter = context.entity.perimeter
    const delta = movementState.movementDelta

    for (let i = 0; i < perimeter.cornerIds.length; i++) {
      const cornerId = perimeter.cornerIds[i]
      const constraints = context.store.getConstraintsForEntity(cornerId)
      if (constraints.some(c => c.type === 'lockedCorner')) {
        continue
      }

      const refPoints =
        perimeter.referenceSide === 'inside' ? perimeter.innerPolygon.points : perimeter.outerPolygon.points
      const movedPoint = addVec2(refPoints[i], delta)

      if (distSqrVec2(movedPoint, ZERO_VEC2) < ORIGIN_LOCK_TOLERANCE_SQUARED) {
        context.store.addBuildingConstraint({
          type: 'lockedCorner',
          corner: cornerId,
          position: ZERO_VEC2
        })
        gcsService.triggerSolve()
      }
    }
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    if (!this.isDeltaValid(deltaDifference, context)) {
      return false
    }

    return super.applyRelativeMovement(deltaDifference, context)
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    const wallId = context.entity.perimeter.id
    return context.store.movePerimeter(wallId, delta)
  }

  private isDeltaValid(delta: Vec2, context: MovementContext<PerimeterEntityContext>): boolean {
    const previewOutside = this.translatePoints(context.entity.perimeter.outerPolygon.points, delta)

    const currentWall = context.entity.perimeter
    const allPerimeters = context.store.getPerimetersByStorey(currentWall.storeyId)

    for (const other of allPerimeters) {
      if (other.id === currentWall.id) continue
      if (arePolygonsIntersecting({ points: previewOutside }, other.outerPolygon)) {
        return false
      }
    }

    return true
  }
}
