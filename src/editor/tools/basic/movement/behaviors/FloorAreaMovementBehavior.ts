import type { FloorArea, FloorOpening, PerimeterWithGeometry } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isFloorAreaId } from '@/building/model/ids'
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

export interface FloorAreaEntityContext extends PolygonEntityContext {
  floorArea: FloorArea
}

export type FloorAreaMovementState = PolygonMovementState

export class FloorAreaMovementBehavior extends PolygonMovementBehavior<FloorAreaEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): FloorAreaEntityContext {
    if (!isFloorAreaId(entityId)) {
      throw new Error(`Invalid floor area id ${entityId}`)
    }

    const floorArea = store.getFloorAreaById(entityId)
    if (!floorArea) {
      throw new Error(`Unable to locate floor area ${entityId}`)
    }

    const perimeters = store.getPerimetersByStorey(floorArea.storeyId)
    const otherAreas = store.getFloorAreasByStorey(floorArea.storeyId).filter(area => area.id !== floorArea.id)
    const openings = store.getFloorOpeningsByStorey(floorArea.storeyId)

    const snapCandidates = this.buildSnapCandidates(perimeters, otherAreas, openings)
    const snapService = new SnappingService<void>({ candidates: snapCandidates })

    return { floorArea, snapService }
  }

  private buildSnapCandidates(
    perimeters: PerimeterWithGeometry[],
    otherAreas: FloorArea[],
    openings: FloorOpening[]
  ): SnapCandidate<void>[] {
    const candidates: SnapCandidate<void>[] = []

    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.innerPolygon.points)
    const perimeterSegments = perimeters.flatMap(perimeter => [...polygonEdges(perimeter.innerPolygon)])

    const areaPoints = otherAreas.flatMap(area => area.area.points)
    const areaSegments = otherAreas.flatMap(area => createPolygonSegments(area.area.points))

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

  protected getPolygonPoints(context: MovementContext<FloorAreaEntityContext>): readonly Vec2[] {
    return context.entity.floorArea.area.points
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<FloorAreaEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.floorArea.area.points, delta)
    }

    return context.store.updateFloorArea(context.entity.floorArea.id, newPolygon)
  }
}
