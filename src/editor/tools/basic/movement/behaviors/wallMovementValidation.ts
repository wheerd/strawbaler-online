import {
  nodeRefSidePointId,
  wallNodeRefPointId,
  wallNonRefLineId,
  wallRefLineId
} from '@/building/gcs/constraintTranslator'
import type { WrappedGcs } from '@/building/gcs/service'
import type { IntermediateWallWithGeometry, Perimeter, WallNodeWithGeometry } from '@/building/model'
import type { NodeId, PerimeterId, WallId, WallNodeId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import {
  type WallAllowedIntersection,
  type WallValidationContext,
  type WallValidationLine,
  isWallGeometryValid
} from '@/editor/tools/intermediate-wall/wallValidation'
import type { Vec2 } from '@/shared/geometry'

export function getFixedWallPointIds(perimeters: Perimeter[], excludedNodes: ReadonlySet<NodeId>): string[] {
  return perimeters.flatMap(perimeter => [
    ...perimeter.cornerIds.filter(c => !excludedNodes.has(c)).map(c => nodeRefSidePointId(c)),
    ...perimeter.wallNodeIds.filter(n => !excludedNodes.has(n)).map(n => wallNodeRefPointId(n))
  ])
}

export function getWallValidationContext(store: StoreActions, perimeterId: PerimeterId): WallValidationContext {
  const perimeter = store.getPerimeterById(perimeterId)
  const lines: WallValidationLine[] = store
    .getPerimeterWallsById(perimeterId)
    .flatMap(wall => [{ wallId: wall.id, line: wall.insideLine }])

  for (const wall of store.getIntermediateWallsByPerimeter(perimeterId)) {
    lines.push({ wallId: wall.id, line: wall.leftLine }, { wallId: wall.id, line: wall.rightLine })
  }

  const allowedIntersections: WallAllowedIntersection[] = []
  for (const wall of store.getIntermediateWallsByPerimeter(perimeterId)) {
    for (const endpoint of [wall.start, wall.end]) {
      const node = store.getWallNodeById(endpoint.nodeId)
      if (node.type !== 'perimeter') continue
      allowedIntersections.push({
        candidateWallId: wall.id,
        existingWallId: node.wallId
      })
    }
  }

  return { polygon: perimeter.outerPolygon, lines, allowedIntersections }
}

export function getSolvedIntermediateWallLines(gcs: WrappedGcs, wallIds: WallId[]): WallValidationLine[] {
  return wallIds.flatMap(w => [
    { wallId: w, line: gcs.getLineSegment(wallRefLineId(w)) },
    { wallId: w, line: gcs.getLineSegment(wallNonRefLineId(w)) }
  ])
}

export function isSolvedWallGeometryValid(
  gcs: WrappedGcs,
  context: WallValidationContext,
  nodeIds: WallNodeId[],
  affectedWallIds: WallId[]
): boolean {
  const points = nodeIds.map(n => gcs.getPointPosition(wallNodeRefPointId(n)))
  const candidateLines = getSolvedIntermediateWallLines(gcs, affectedWallIds)
  return isWallGeometryValid(
    {
      points,
      segments: candidateLines.map(({ line }) => line),
      candidateLines,
      excludedWallIds: affectedWallIds
    },
    context
  )
}

export function getAffectedIntermediateWalls(
  store: StoreActions,
  perimeterId: PerimeterId,
  nodeIds: ReadonlySet<WallNodeId>
): IntermediateWallWithGeometry[] {
  return store
    .getIntermediateWallsByPerimeter(perimeterId)
    .filter(wall => nodeIds.has(wall.start.nodeId) || nodeIds.has(wall.end.nodeId))
}

export function getWallNodePositions(gcs: WrappedGcs, nodes: WallNodeWithGeometry[]): Record<WallNodeId, Vec2> {
  return Object.fromEntries(nodes.map(node => [node.id, gcs.getPointPosition(wallNodeRefPointId(node.id))])) as Record<
    WallNodeId,
    Vec2
  >
}
