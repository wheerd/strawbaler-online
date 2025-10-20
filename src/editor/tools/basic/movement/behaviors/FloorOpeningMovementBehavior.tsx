import { vec2 } from 'gl-matrix'

import type { SelectableId } from '@/building/model/ids'
import { isFloorOpeningId } from '@/building/model/ids'
import type { FloorArea, FloorOpening, Perimeter } from '@/building/model/model'
import type { StoreActions } from '@/building/store/types'
import type { SnapResult, SnappingContext } from '@/editor/services/snapping/types'
import type {
  MovementBehavior,
  MovementContext,
  MovementState,
  PointerMovementState
} from '@/editor/tools/basic/movement/MovementBehavior'
import { FloorOpeningMovementPreview } from '@/editor/tools/basic/movement/previews/FloorOpeningMovementPreview'
import { type Polygon2D } from '@/shared/geometry'

export interface FloorOpeningEntityContext {
  opening: FloorOpening
  snapContext: SnappingContext
}

export interface FloorOpeningMovementState extends MovementState {
  movementDelta: vec2
  snapResult?: SnapResult
}

function createPolygonSegments(points: readonly vec2[]): { start: vec2; end: vec2 }[] {
  if (points.length < 2) return []
  const segments: { start: vec2; end: vec2 }[] = []
  for (let i = 0; i < points.length; i += 1) {
    const start = points[i]
    const end = points[(i + 1) % points.length]
    segments.push({ start, end })
  }
  return segments
}

function buildSnapContext(perimeters: Perimeter[], areas: FloorArea[], openings: FloorOpening[]): SnappingContext {
  const perimeterPoints = perimeters.flatMap(perimeter => perimeter.corners.map(corner => corner.insidePoint))
  const perimeterSegments = perimeters.flatMap(perimeter => perimeter.walls.map(wall => wall.insideLine))

  const areaPoints = areas.flatMap(area => area.area.points)
  const areaSegments = areas.flatMap(area => createPolygonSegments(area.area.points))

  const openingPoints = openings.flatMap(opening => opening.area.points)
  const openingSegments = openings.flatMap(opening => createPolygonSegments(opening.area.points))

  return {
    snapPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    alignPoints: [...perimeterPoints, ...areaPoints, ...openingPoints],
    referenceLineSegments: [...perimeterSegments, ...areaSegments, ...openingSegments]
  }
}

export class FloorOpeningMovementBehavior
  implements MovementBehavior<FloorOpeningEntityContext, FloorOpeningMovementState>
{
  previewComponent = FloorOpeningMovementPreview

  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): FloorOpeningEntityContext {
    if (!isFloorOpeningId(entityId)) {
      throw new Error(`Invalid floor opening id ${entityId}`)
    }

    const opening = store.getFloorOpeningById(entityId)
    if (!opening) {
      throw new Error(`Unable to locate floor opening ${entityId}`)
    }

    const floorAreas = store.getFloorAreasByStorey(opening.storeyId)
    const perimeters = store.getPerimetersByStorey(opening.storeyId)
    const otherOpenings = store.getFloorOpeningsByStorey(opening.storeyId).filter(o => o.id !== opening.id)

    return {
      opening,
      snapContext: buildSnapContext(perimeters, floorAreas, otherOpenings)
    }
  }

  initializeState(pointerState: PointerMovementState): FloorOpeningMovementState {
    return {
      movementDelta: vec2.clone(pointerState.delta)
    }
  }

  constrainAndSnap(
    pointerState: PointerMovementState,
    context: MovementContext<FloorOpeningEntityContext>
  ): FloorOpeningMovementState {
    const previewPoints = this.translatePoints(context.entity.opening.area.points, pointerState.delta)

    let bestSnap: SnapResult | undefined
    let bestScore = Infinity
    let finalDelta = vec2.clone(pointerState.delta)

    for (let index = 0; index < previewPoints.length; index += 1) {
      const snapResult =
        context.snappingService.findSnapResult(previewPoints[index], context.entity.snapContext) ?? undefined
      if (!snapResult) continue

      const score =
        vec2.squaredDistance(previewPoints[index], snapResult.position) *
        (snapResult.lines && snapResult.lines.length > 0 ? 5 : 1)

      if (score < bestScore) {
        bestScore = score
        bestSnap = snapResult
        finalDelta = vec2.subtract(vec2.create(), snapResult.position, context.entity.opening.area.points[index])
      }
    }

    return {
      movementDelta: finalDelta,
      snapResult: bestSnap
    }
  }

  validatePosition(
    _movementState: FloorOpeningMovementState,
    _context: MovementContext<FloorOpeningEntityContext>
  ): boolean {
    return true
  }

  commitMovement(
    movementState: FloorOpeningMovementState,
    context: MovementContext<FloorOpeningEntityContext>
  ): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.opening.area.points, movementState.movementDelta)
    }

    return context.store.updateFloorOpening(context.entity.opening.id, newPolygon)
  }

  applyRelativeMovement(deltaDifference: vec2, context: MovementContext<FloorOpeningEntityContext>): boolean {
    const updatedPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.opening.area.points, deltaDifference)
    }

    return context.store.updateFloorOpening(context.entity.opening.id, updatedPolygon)
  }

  private translatePoints(points: readonly vec2[], delta: vec2): vec2[] {
    return points.map(point => vec2.add(vec2.create(), point, delta))
  }
}
