import { wallNodeRefPointId } from '@/building/gcs/constraintTranslator'
import { type WrappedGcs, gcsService } from '@/building/gcs/service'
import type { IntermediateWallWithGeometry } from '@/building/model'
import type { SelectableId, WallId, WallNodeId } from '@/building/model/ids'
import { isIntermediateWallId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { IntermediateWallMovementPreview } from '@/editor/tools/basic/movement/previews/IntermediateWallMovementPreview'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/types'
import type { WallValidationContext } from '@/editor/tools/intermediate-wall/wallValidation'
import { type LineSegment2D, type Vec2, midpoint, subVec2 } from '@/shared/geometry'

import {
  getAffectedIntermediateWalls,
  getFixedWallPointIds,
  getWallNodePositions,
  getWallValidationContext
} from './wallMovementValidation'

export interface IntermediateWallEntityContext {
  wall: IntermediateWallWithGeometry
  directNodeIds: Set<WallNodeId>
  gcs: WrappedGcs
  validationContext: WallValidationContext
  affectedWallIds: WallId[]
}

export interface IntermediateWallMovementState extends MovementState {
  movementDelta: Vec2
  nodePositions: Record<WallNodeId, Vec2>
  centerLine: LineSegment2D
}

export class IntermediateWallMovementBehavior implements MovementBehavior<
  IntermediateWallEntityContext,
  IntermediateWallMovementState
> {
  previewComponent = IntermediateWallMovementPreview

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): IntermediateWallEntityContext {
    if (!isIntermediateWallId(entityId)) throw new Error(`Invalid intermediate wall ${entityId}`)
    const wall = store.getIntermediateWallById(entityId)
    const directNodeIds = new Set<WallNodeId>([wall.start.nodeId, wall.end.nodeId])
    const perimeters = store.getPerimetersByStorey(store.getActiveStoreyId())
    const gcs = gcsService.getGcs(undefined, getFixedWallPointIds(perimeters, directNodeIds))
    const validationContext = getWallValidationContext(store, wall.perimeterId)
    const affectedWalls = getAffectedIntermediateWalls(store, wall.perimeterId, directNodeIds)
    return {
      wall,
      directNodeIds,
      gcs,
      validationContext,
      affectedWallIds: affectedWalls.map(affectedWall => affectedWall.id)
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): IntermediateWallMovementState {
    const { wall, directNodeIds, gcs } = context.entity
    gcs.startAttachedPointsDrag([...directNodeIds].map(wallNodeRefPointId))
    return {
      movementDelta: pointerState.delta,
      nodePositions: getWallNodePositions(gcs, [
        context.store.getWallNodeById(wall.start.nodeId),
        context.store.getWallNodeById(wall.end.nodeId)
      ]),
      centerLine: wall.centerLine
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): IntermediateWallMovementState {
    const { wall, gcs } = context.entity
    gcs.updatePointsDrag(pointerState.delta[0], pointerState.delta[1])
    const nodePositions = getWallNodePositions(gcs, [
      context.store.getWallNodeById(wall.start.nodeId),
      context.store.getWallNodeById(wall.end.nodeId)
    ])
    return {
      movementDelta: subVec2(
        midpoint(nodePositions[wall.start.nodeId], nodePositions[wall.end.nodeId]),
        midpoint(wall.centerLine.start, wall.centerLine.end)
      ),
      nodePositions,
      centerLine: {
        start: nodePositions[wall.start.nodeId],
        end: nodePositions[wall.end.nodeId]
      }
    }
  }

  validatePosition(
    _movementState: IntermediateWallMovementState,
    _context: MovementContext<IntermediateWallEntityContext>
  ): boolean {
    // The GCS solver's internal validator already checks all geometric validity.
    return true
  }

  commitMovement(
    movementState: IntermediateWallMovementState,
    context: MovementContext<IntermediateWallEntityContext>
  ): boolean {
    const { wall, gcs } = context.entity
    context.store.applyGcsWallNodePositions(wall.perimeterId, movementState.nodePositions)
    gcs.applyWallEntityOffsets(wall.perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<IntermediateWallEntityContext>): boolean {
    const { wall, directNodeIds, gcs } = context.entity
    gcs.startAttachedPointsDrag([...directNodeIds].map(wallNodeRefPointId))
    gcs.updatePointsDrag(deltaDifference[0], deltaDifference[1])
    context.store.applyGcsWallNodePositions(
      wall.perimeterId,
      getWallNodePositions(gcs, [
        context.store.getWallNodeById(wall.start.nodeId),
        context.store.getWallNodeById(wall.end.nodeId)
      ])
    )
    gcs.applyWallEntityOffsets(wall.perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }
}
