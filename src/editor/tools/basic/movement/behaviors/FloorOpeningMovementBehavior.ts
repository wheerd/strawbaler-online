import type { FloorArea, FloorOpening, PerimeterWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isFloorOpeningId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import { type SnapCandidate, SnappingService } from '@/editor/canvas/services/SnappingService'
import type { MovementContext } from '@/editor/tools/basic/movement/types'
import { type Polygon2D, type Vec2, polygonEdges } from '@/shared/geometry'

import {
  type PolygonEntityContext,
  PolygonMovementBehavior,
  type PolygonMovementState
} from './PolygonMovementBehavior'
import { createPolygonSegments } from './polygonUtils'

export interface FloorOpeningEntityContext extends PolygonEntityContext {
  opening: FloorOpening
}

export type FloorOpeningMovementState = PolygonMovementState

export class FloorOpeningMovementBehavior extends PolygonMovementBehavior<FloorOpeningEntityContext> {
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

    const snapCandidates = this.buildSnapCandidates(perimeters, floorAreas, otherOpenings)
    const snapService = new SnappingService<void>({ candidates: snapCandidates })

    return { opening, snapService }
  }

  private buildSnapCandidates(
    perimeters: PerimeterWithGeometry[],
    areas: FloorArea[],
    openings: FloorOpening[]
  ): SnapCandidate<void>[] {
    const candidates: SnapCandidate<void>[] = []

    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.innerPolygon.points)
    const perimeterSegments = perimeters.flatMap(perimeter => [...polygonEdges(perimeter.innerPolygon)])

    const areaPoints = areas.flatMap(area => area.area.points)
    const areaSegments = areas.flatMap(area => createPolygonSegments(area.area.points))

    const openingPoints = openings.flatMap(opening => opening.area.points)
    const openingSegments = openings.flatMap(opening => createPolygonSegments(opening.area.points))

    const allPoints = [...perimeterPoints, ...areaPoints, ...openingPoints]
    for (const point of allPoints) {
      candidates.push({ type: 'point', position: point, mode: 'snap' })
    }

    const alignPoints = [...perimeterPoints, ...areaPoints, ...openingPoints]
    for (const point of alignPoints) {
      candidates.push({ type: 'point', position: point, mode: 'align' })
    }

    const allSegments = [...perimeterSegments, ...areaSegments, ...openingSegments]
    for (const segment of allSegments) {
      candidates.push({ type: 'segment', segment })
    }

    return candidates
  }

  protected getPolygonPoints(context: MovementContext<FloorOpeningEntityContext>): readonly Vec2[] {
    return context.entity.opening.area.points
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<FloorOpeningEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.opening.area.points, delta)
    }

    return context.store.updateFloorOpening(context.entity.opening.id, newPolygon)
  }
}
