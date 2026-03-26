import { getModelActions } from '@/building/store'
import type { SnappingService } from '@/editor/canvas/services/SnappingService'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { BasePolygonTool, type PolygonToolStateBase } from '@/editor/tools/shared/polygon/BasePolygonTool'
import { type LineSegment2D, type Vec2, polygonEdges } from '@/shared/geometry'

const createPolygonSegments = (points: readonly Vec2[]): LineSegment2D[] => {
  if (points.length < 2) return []

  const segments: LineSegment2D[] = []
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    segments.push({ start, end })
  }
  return segments
}

export abstract class BaseFloorPolygonTool<TState extends PolygonToolStateBase> extends BasePolygonTool<TState> {
  protected override setupSnapService(snapService: SnappingService<void>): void {
    const { getPerimetersByStorey, getFloorAreasByStorey, getFloorOpeningsByStorey, getActiveStoreyId } =
      getModelActions()

    const activeStoreyId = getActiveStoreyId()
    const perimeters = getPerimetersByStorey(activeStoreyId)
    const floorAreas = getFloorAreasByStorey(activeStoreyId)
    const floorOpenings = getFloorOpeningsByStorey(activeStoreyId)

    const perimeterPoints = perimeters.flatMap(perimeter => perimeter.outerPolygon.points)
    const perimeterSegments = perimeters.flatMap(perimeter => [
      ...polygonEdges(perimeter.innerPolygon),
      ...polygonEdges(perimeter.outerPolygon)
    ])

    const areaPoints = floorAreas.flatMap(area => area.area.points)
    const areaSegments = floorAreas.flatMap(area => createPolygonSegments(area.area.points))

    const openingPoints = floorOpenings.flatMap(opening => opening.area.points)
    const openingSegments = floorOpenings.flatMap(opening => createPolygonSegments(opening.area.points))

    const allPoints = [...perimeterPoints, ...areaPoints, ...openingPoints]
    for (const point of allPoints) {
      snapService.addSnapCandidate({ type: 'point', position: point, mode: 'snap' })
    }

    const alignPoints = [...perimeterPoints, ...areaPoints, ...openingPoints]
    for (const point of alignPoints) {
      snapService.addSnapCandidate({ type: 'point', position: point, mode: 'align' })
    }

    const allSegments = [...perimeterSegments, ...areaSegments, ...openingSegments]
    for (const segment of allSegments) {
      snapService.addSnapCandidate({ type: 'segment', segment })
    }
  }

  protected onToolActivated(): void {
    getViewModeActions().ensureMode('floors')
  }
}
