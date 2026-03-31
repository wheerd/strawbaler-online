import type { PerimeterWithGeometry, Roof } from '@/building/model'
import type { SelectableId } from '@/building/model/ids'
import { isRoofId } from '@/building/model/ids'
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

export interface RoofEntityContext extends PolygonEntityContext {
  roof: Roof
}

export type RoofMovementState = PolygonMovementState

export class RoofMovementBehavior extends PolygonMovementBehavior<RoofEntityContext> {
  getEntity(entityId: SelectableId, _parentIds: SelectableId[], store: StoreActions): RoofEntityContext {
    if (!isRoofId(entityId)) {
      throw new Error(`Invalid roof id ${entityId}`)
    }

    const roof = store.getRoofById(entityId)
    if (!roof) {
      throw new Error(`Unable to locate roof ${entityId}`)
    }

    const perimeters = store.getPerimetersByStorey(roof.storeyId)
    const otherRoofs = store.getRoofsByStorey(roof.storeyId).filter(r => r.id !== roof.id)
    const snapCandidates = this.buildSnapCandidates(perimeters, otherRoofs)
    const snapService = new SnappingService<void>({
      candidates: snapCandidates,
      defaultPointDistance: 200,
      defaultLineDistance: 100
    })

    return { roof, snapService }
  }

  private buildSnapCandidates(perimeters: PerimeterWithGeometry[], otherRoofs: Roof[]): SnapCandidate<void>[] {
    const candidates: SnapCandidate<void>[] = []

    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.outerPolygon.points)
    const perimeterSegments = perimeters.flatMap(perimeter => [...polygonEdges(perimeter.outerPolygon)])

    const roofPoints = otherRoofs.flatMap(roof => roof.referencePolygon.points)
    const roofSegments = otherRoofs.flatMap(roof => createPolygonSegments(roof.referencePolygon.points))

    for (const point of perimeterPoints) {
      candidates.push({ type: 'point', position: point, mode: 'snap', priority: 2 })
    }
    for (const point of roofPoints) {
      candidates.push({ type: 'point', position: point, mode: 'snap', priority: 1 })
    }

    const allSegments = [...perimeterSegments, ...roofSegments]
    for (const segment of allSegments) {
      candidates.push({ type: 'segment', segment })
    }

    return candidates
  }

  protected getPolygonPoints(context: MovementContext<RoofEntityContext>): readonly Vec2[] {
    return context.entity.roof.referencePolygon.points
  }

  protected applyMovementDelta(delta: Vec2, context: MovementContext<RoofEntityContext>): boolean {
    const newPolygon: Polygon2D = {
      points: this.translatePoints(context.entity.roof.referencePolygon.points, delta)
    }

    return context.store.updateRoofArea(context.entity.roof.id, newPolygon)
  }
}
