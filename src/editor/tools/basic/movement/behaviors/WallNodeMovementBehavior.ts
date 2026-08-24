import { wallNodeRefPointId } from '@/building/gcs/constraintTranslator'
import { type WrappedGcs, gcsService } from '@/building/gcs/service'
import type { WallNodeWithGeometry } from '@/building/model'
import type { SelectableId, WallId, WallNodeId } from '@/building/model/ids'
import { isWallNodeId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { WallNodeMovementPreview } from '@/editor/tools/basic/movement/previews/WallNodeMovementPreview'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/types'
import type { WallValidationContext } from '@/editor/tools/intermediate-wall/wallValidation'
import { type LineSegment2D, type Vec2, subVec2 } from '@/shared/geometry'

import {
  getAffectedIntermediateWalls,
  getFixedWallPointIds,
  getSolvedIntermediateWallLines,
  getWallNodePositions,
  getWallValidationContext
} from './wallMovementValidation'

export interface WallNodeEntityContext {
  node: WallNodeWithGeometry
  perimeterId: WallNodeWithGeometry['perimeterId']
  gcs: WrappedGcs
  validationContext: WallValidationContext
  affectedWallIds: WallId[]
}

export interface WallNodeMovementState extends MovementState {
  position: Vec2
  movementDelta: Vec2
  nodePositions: Record<WallNodeId, Vec2>
  previewLines: LineSegment2D[]
}

export class WallNodeMovementBehavior implements MovementBehavior<WallNodeEntityContext, WallNodeMovementState> {
  previewComponent = WallNodeMovementPreview

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): WallNodeEntityContext {
    if (!isWallNodeId(entityId)) throw new Error(`Invalid entity context for wall node ${entityId}`)

    const node = store.getWallNodeById(entityId)
    const directNodeIds = new Set<WallNodeId>([node.id])
    const perimeters = store.getPerimetersByStorey(store.getActiveStoreyId())
    const gcs = gcsService.getGcs(undefined, getFixedWallPointIds(perimeters, directNodeIds))
    const validationContext = getWallValidationContext(store, node.perimeterId)
    const affectedWalls = getAffectedIntermediateWalls(store, node.perimeterId, new Set([node.id]))
    return {
      node,
      perimeterId: node.perimeterId,
      gcs,
      validationContext,
      affectedWallIds: affectedWalls.map(w => w.id)
    }
  }

  initializeState(
    pointerState: PointerMovementState,
    context: MovementContext<WallNodeEntityContext>
  ): WallNodeMovementState {
    const { node, gcs, affectedWallIds } = context.entity
    gcs.startPointDrag(wallNodeRefPointId(node.id))
    const lines = getSolvedIntermediateWallLines(gcs, affectedWallIds)
    return {
      position: node.center,
      movementDelta: pointerState.delta,
      nodePositions: getWallNodePositions(gcs, [node]),
      previewLines: lines.map(l => l.line)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<WallNodeEntityContext>
  ): WallNodeMovementState {
    const { node, gcs, affectedWallIds } = context.entity
    gcs.updatePointDrag(pointerState.delta[0], pointerState.delta[1])
    const position = gcs.getPointPosition(wallNodeRefPointId(node.id))
    const lines = getSolvedIntermediateWallLines(gcs, affectedWallIds)
    return {
      position,
      movementDelta: subVec2(position, node.center),
      nodePositions: getWallNodePositions(gcs, [node]),
      previewLines: lines.map(l => l.line)
    }
  }

  validatePosition(_movementState: WallNodeMovementState, _context: MovementContext<WallNodeEntityContext>): boolean {
    // The GCS solver's internal validator already checks all geometric validity.
    return true
  }

  commitMovement(movementState: WallNodeMovementState, context: MovementContext<WallNodeEntityContext>): boolean {
    const { gcs, perimeterId } = context.entity
    context.store.applyGcsWallNodePositions(perimeterId, movementState.nodePositions)
    gcs.applyWallEntityOffsets(perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }

  applyRelativeMovement(deltaDifference: Vec2, context: MovementContext<WallNodeEntityContext>): boolean {
    const { node, gcs, perimeterId } = context.entity
    gcs.startPointDrag(wallNodeRefPointId(node.id))
    gcs.updatePointDrag(deltaDifference[0], deltaDifference[1])
    const position = gcs.getPointPosition(wallNodeRefPointId(node.id))
    context.store.applyGcsWallNodePositions(perimeterId, { [node.id]: position })
    gcs.applyWallEntityOffsets(perimeterId)
    gcs.endDrag()
    gcs.syncConstraintStatus()
    return true
  }
}
