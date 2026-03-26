import { type WrappedGcs, gcsService } from '@/building/gcs/service'
import type { PerimeterCornerWithGeometry } from '@/building/model'
import { type PerimeterCornerId, type SelectableId, isPerimeterCornerId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { SnapCandidate, SnapResult } from '@/editor/canvas/services/SnappingService'
import { SnappingService } from '@/editor/canvas/services/SnappingService'
import { PerimeterCornerMovementPreview } from '@/editor/tools/basic/movement/previews/PerimeterCornerMovementPreview'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/types'
import { type Vec2, addVec2, subVec2 } from '@/shared/geometry'

export interface CornerEntityContext {
  corner: PerimeterCornerWithGeometry
  corners: PerimeterCornerWithGeometry[]
  cornerIndex: number
  snapService: SnappingService<void>
  gcs: WrappedGcs
}

export interface CornerMovementState extends MovementState {
  position: Vec2
  movementDelta: Vec2
  snapResult?: SnapResult<void>
  newBoundary: Vec2[]
}

export class PerimeterCornerMovementBehavior implements MovementBehavior<CornerEntityContext, CornerMovementState> {
  previewComponent = PerimeterCornerMovementPreview

  canMove(entityId: SelectableId, store: StoreActions): boolean {
    const constraints = store.getConstraintsForEntity(entityId as PerimeterCornerId)
    return !constraints.some(c => c.type === 'lockedCorner')
  }

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): CornerEntityContext {
    if (!isPerimeterCornerId(entityId)) {
      throw new Error(`Invalid entity context for corner ${entityId}`)
    }

    const corner = store.getPerimeterCornerById(entityId)
    const perimeter = store.getPerimeterById(corner.perimeterId)
    const corners = perimeter.cornerIds.map(store.getPerimeterCornerById)

    const cornerIndex = perimeter.cornerIds.indexOf(corner.id)
    if (cornerIndex === -1) {
      throw new Error(`Could not find corner index for ${entityId}`)
    }

    const snapCandidates = this.buildSnapCandidates(corners, cornerIndex)
    const snapService = new SnappingService<void>({ candidates: snapCandidates })

    const fixedCornerIds = perimeter.cornerIds.filter(c => c !== entityId)
    const gcs = gcsService.getGcs(fixedCornerIds)

    return {
      corners,
      corner,
      cornerIndex,
      snapService,
      gcs
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corner, gcs } = context.entity

    gcs.startCornerDrag(corner.id)

    return {
      position: corner.referencePoint,
      movementDelta: pointerState.delta,
      newBoundary: gcs.getPerimeterBoundary(corner.perimeterId)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<CornerEntityContext>
  ): CornerMovementState {
    const { corner, snapService, gcs } = context.entity

    const newPosition = addVec2(corner.referencePoint, pointerState.delta)

    const snapResult = snapService.findSnapResult(newPosition)
    const finalPosition = snapResult?.position ?? newPosition

    gcs.updateDrag(finalPosition[0], finalPosition[1])

    const newBoundary = gcs.getPerimeterBoundary(corner.perimeterId)
    const solvedPosition = gcs.getCornerPosition(corner.id)

    return {
      position: solvedPosition,
      movementDelta: subVec2(solvedPosition, corner.referencePoint),
      snapResult: snapResult ?? undefined,
      newBoundary
    }
  }

  validatePosition(_movementState: CornerMovementState, _context: MovementContext<CornerEntityContext>): boolean {
    return true
  }

  commitMovement(movementState: CornerMovementState, context: MovementContext<CornerEntityContext>): boolean {
    context.entity.gcs.endDrag()
    const updated = context.store.updatePerimeterBoundary(context.entity.corner.perimeterId, movementState.newBoundary)
    if (updated) {
      context.entity.gcs.syncConstraintStatus()
    }
    return updated
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<CornerEntityContext>): boolean {
    const { corner, gcs } = context.entity

    const dragPos = gcs.startCornerDrag(corner.id)

    const targetX = dragPos[0] + deltaDifference[0]
    const targetY = dragPos[1] + deltaDifference[1]

    gcs.updateDrag(targetX, targetY)

    const newBoundary = gcs.getPerimeterBoundary(corner.perimeterId)

    gcs.endDrag()

    const updated = context.store.updatePerimeterBoundary(corner.perimeterId, newBoundary)
    if (updated) {
      gcs.applyWallEntityOffsets(corner.perimeterId)
      gcs.syncConstraintStatus()
    }

    return updated
  }

  private buildSnapCandidates(corners: PerimeterCornerWithGeometry[], cornerIndex: number): SnapCandidate<void>[] {
    const candidates: SnapCandidate<void>[] = []

    candidates.push({
      type: 'point',
      position: corners[cornerIndex].referencePoint,
      mode: 'snap'
    })

    for (const c of corners) {
      candidates.push({
        type: 'point',
        position: c.referencePoint,
        mode: 'align'
      })
    }

    for (let i = 0; i < corners.length; i++) {
      const nextIndex = (i + 1) % corners.length
      if (i === cornerIndex || nextIndex === cornerIndex) continue
      candidates.push({
        type: 'segment',
        segment: { start: corners[i].referencePoint, end: corners[nextIndex].referencePoint }
      })
    }

    return candidates
  }
}
