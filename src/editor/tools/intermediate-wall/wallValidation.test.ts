import { describe, expect, it } from 'vitest'

import { newVec2 } from '@/shared/geometry'

import { isWallGeometryValid } from './wallValidation'

const polygon = { points: [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100), newVec2(0, 100)] }

describe('isWallGeometryValid', () => {
  it('accepts a segment inside the perimeter without intersections', () => {
    expect(
      isWallGeometryValid(
        {
          points: [newVec2(20, 20), newVec2(80, 20)],
          segments: [{ start: newVec2(20, 20), end: newVec2(80, 20) }]
        },
        { polygon, lines: [] }
      )
    ).toBe(true)
  })

  it('rejects points outside the perimeter', () => {
    expect(
      isWallGeometryValid(
        {
          points: [newVec2(20, 20), newVec2(120, 20)],
          segments: [{ start: newVec2(20, 20), end: newVec2(120, 20) }]
        },
        { polygon, lines: [] }
      )
    ).toBe(false)
  })

  it('rejects intersections with unrelated walls', () => {
    expect(
      isWallGeometryValid(
        {
          points: [newVec2(20, 20), newVec2(80, 20)],
          segments: [{ start: newVec2(20, 20), end: newVec2(80, 20) }]
        },
        { polygon, lines: [{ wallId: 'wall_other', line: { start: newVec2(50, 0), end: newVec2(50, 50) } }] }
      )
    ).toBe(false)
  })

  it('allows intersections with excluded walls', () => {
    expect(
      isWallGeometryValid(
        {
          points: [newVec2(20, 20), newVec2(80, 20)],
          segments: [{ start: newVec2(20, 20), end: newVec2(80, 20) }],
          excludedWallIds: ['wall_moving']
        },
        { polygon, lines: [{ wallId: 'wall_moving', line: { start: newVec2(50, 0), end: newVec2(50, 50) } }] }
      )
    ).toBe(true)
  })

  it('allows an affected wall to meet its perimeter attachment', () => {
    const attachment = newVec2(50, 0)
    const candidate = { wallId: 'wall_moving', line: { start: attachment, end: newVec2(50, 80) } }
    expect(
      isWallGeometryValid(
        {
          points: [attachment, newVec2(50, 80)],
          segments: [candidate.line],
          candidateLines: [candidate],
          excludedWallIds: []
        },
        {
          polygon,
          lines: [{ wallId: 'perimeter_wall', line: { start: newVec2(0, 0), end: newVec2(100, 0) } }],
          allowedIntersections: [{ candidateWallId: 'wall_moving', existingWallId: 'perimeter_wall' }]
        }
      )
    ).toBe(true)
  })
})
