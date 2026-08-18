import { describe, expect, it } from 'vitest'

import {
  getAdjacentPerimeterWallReferences,
  getPerimeterWallMeasurementReferences,
  getReferencePoint
} from './perimeterWallMeasurementReferences'

describe('perimeter wall measurement references', () => {
  it('sorts corners and perimeter nodes by wall offset', () => {
    const node = {
      id: 'wallnode_middle',
      type: 'perimeter',
      offsetFromCornerStart: 400,
      insideLine: { start: [390, 0], end: [410, 0] },
      outsideLine: { start: [390, 100], end: [410, 100] }
    }
    const wall = {
      id: 'wall_perimeter',
      wallNodeIds: [node.id],
      startCornerId: 'corner_start',
      endCornerId: 'corner_end',
      wallLength: 1000
    }
    const corners = {
      corner_start: { id: 'corner_start', insidePoint: [0, 0], outsidePoint: [0, 100] },
      corner_end: { id: 'corner_end', insidePoint: [1000, 0], outsidePoint: [1000, 100] }
    }

    const references = getPerimeterWallMeasurementReferences(
      wall as never,
      id => corners[id as keyof typeof corners] as never,
      () => node as never
    )

    expect(references.map(reference => reference.id)).toEqual(['corner_start', node.id, 'corner_end'])
    expect(getReferencePoint(references[1], 'inside', 'end')).toEqual(node.insideLine.end)
  })

  it('finds the closest references on either side of an offset', () => {
    const references = [
      { id: 'start', offset: 0 },
      { id: 'node', offset: 400 },
      { id: 'end', offset: 1000 }
    ] as never[]

    const adjacent = getAdjacentPerimeterWallReferences(references, 600)

    expect(adjacent.previous?.id).toBe('node')
    expect(adjacent.next?.id).toBe('end')
  })
})
