import type { PerimeterCornerWithGeometry, PerimeterWallWithGeometry, WallNodeWithGeometry } from '@/building/model'
import type { NodeId } from '@/building/model/ids'
import type { Length, LineSegment2D, Vec2 } from '@/shared/geometry'

export interface PerimeterWallMeasurementReference {
  id: NodeId
  offset: Length
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
}

export function getPerimeterWallMeasurementReferences(
  wall: PerimeterWallWithGeometry,
  getCorner: (cornerId: PerimeterCornerWithGeometry['id']) => PerimeterCornerWithGeometry,
  getNode: (nodeId: WallNodeWithGeometry['id']) => WallNodeWithGeometry
): PerimeterWallMeasurementReference[] {
  const startCorner = getCorner(wall.startCornerId)
  const endCorner = getCorner(wall.endCornerId)
  const references: PerimeterWallMeasurementReference[] = [
    {
      id: startCorner.id,
      offset: 0,
      insideLine: { start: startCorner.insidePoint, end: startCorner.insidePoint },
      outsideLine: { start: startCorner.outsidePoint, end: startCorner.outsidePoint }
    },
    ...wall.wallNodeIds.map(nodeId => {
      const node = getNode(nodeId)
      if (node.type !== 'perimeter') throw new Error(`Expected perimeter wall node ${nodeId}`)
      return {
        id: node.id,
        offset: node.offsetFromCornerStart,
        insideLine: node.insideLine,
        outsideLine: node.outsideLine
      }
    }),
    {
      id: endCorner.id,
      offset: wall.wallLength,
      insideLine: { start: endCorner.insidePoint, end: endCorner.insidePoint },
      outsideLine: { start: endCorner.outsidePoint, end: endCorner.outsidePoint }
    }
  ]

  return references.sort((a, b) => a.offset - b.offset)
}

export function getAdjacentPerimeterWallReferences(
  references: readonly PerimeterWallMeasurementReference[],
  offset: Length,
  excluded?: NodeId
): { previous?: PerimeterWallMeasurementReference; next?: PerimeterWallMeasurementReference } {
  let previous: PerimeterWallMeasurementReference | undefined
  let next: PerimeterWallMeasurementReference | undefined

  for (const reference of references) {
    if (reference.id === excluded) continue
    if (reference.offset <= offset) previous = reference
    if (reference.offset >= offset) {
      next = reference
      break
    }
  }

  return { previous, next }
}

export function getReferencePoint(
  reference: {
    insideLine: LineSegment2D
    outsideLine: LineSegment2D
  },
  side: 'inside' | 'outside',
  direction: 'start' | 'end'
): Vec2 {
  return (side === 'inside' ? reference.insideLine : reference.outsideLine)[direction]
}
