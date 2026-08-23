import { describe, expect, it } from 'vitest'

import { newVec2 } from '@/shared/geometry'

import { getAdjacentWallNodeBadgePairs, getSmallerAngleBisector } from './wallNodeBadgeGeometry'

describe('wall-node badge geometry', () => {
  it('returns the smaller-angle bisector for two away-from-node directions', () => {
    const bisector = getSmallerAngleBisector(newVec2(1, 0), newVec2(0, 1))

    expect(bisector[0]).toBeCloseTo(Math.SQRT1_2)
    expect(bisector[1]).toBeCloseTo(Math.SQRT1_2)
  })

  it('uses a stable perpendicular fallback for opposite directions', () => {
    const bisector = getSmallerAngleBisector(newVec2(1, 0), newVec2(-1, 0))

    expect(bisector[0]).toBeCloseTo(0)
    expect(Math.abs(bisector[1])).toBeCloseTo(1)
  })

  it('returns only adjacent pairs in angular order', () => {
    const point = newVec2(0, 0)
    const pairs = getAdjacentWallNodeBadgePairs([
      { id: 'wall_a' as never, key: 'wall_a', direction: newVec2(1, 0), leftPoint: point, rightPoint: point },
      {
        id: 'wall_b' as never,
        key: 'wall_b',
        direction: newVec2(Math.cos(0.2), Math.sin(0.2)),
        leftPoint: point,
        rightPoint: point
      },
      {
        id: 'wall_c' as never,
        key: 'wall_c',
        direction: newVec2(Math.cos(0.4), Math.sin(0.4)),
        leftPoint: point,
        rightPoint: point
      },
      {
        id: 'wall_d' as never,
        key: 'wall_d',
        direction: newVec2(Math.cos(0.6), Math.sin(0.6)),
        leftPoint: point,
        rightPoint: point
      }
    ])

    expect(pairs).toHaveLength(4)
    const pairIds = pairs.map(pair => `${pair.wallA.id}-${pair.wallB.id}`)
    expect(pairIds).not.toContain('wall_a-wall_c')
    expect(pairIds).not.toContain('wall_c-wall_a')
  })

  it('uses the ordered reflex sector for a multi-wall pair', () => {
    const point = newVec2(0, 0)
    const pairs = getAdjacentWallNodeBadgePairs([
      { id: 'wall_a' as never, key: 'wall_a', direction: newVec2(1, 0), leftPoint: point, rightPoint: point },
      {
        id: 'wall_b' as never,
        key: 'wall_b',
        direction: newVec2(Math.cos(0.2), Math.sin(0.2)),
        leftPoint: point,
        rightPoint: point
      },
      {
        id: 'wall_c' as never,
        key: 'wall_c',
        direction: newVec2(Math.cos(0.4), Math.sin(0.4)),
        leftPoint: point,
        rightPoint: point
      }
    ])
    const reflexPair = pairs.find(pair => {
      const wallAId: string = pair.wallA.id
      const wallBId: string = pair.wallB.id
      return wallAId === 'wall_a' && wallBId === 'wall_c'
    })

    expect(reflexPair).toBeDefined()
    expect(reflexPair?.offsetDirection[0]).toBeLessThan(0)
  })

  it('anchors a pair at the midpoint of its selected side points', () => {
    const pairs = getAdjacentWallNodeBadgePairs([
      {
        id: 'wall_a' as never,
        key: 'wall_a',
        direction: newVec2(1, 0),
        leftPoint: newVec2(0, 0),
        rightPoint: newVec2(10, 0)
      },
      {
        id: 'wall_b' as never,
        key: 'wall_b',
        direction: newVec2(0, 1),
        leftPoint: newVec2(20, 10),
        rightPoint: newVec2(20, 20)
      }
    ])

    expect(pairs[0].basePoint).toEqual(newVec2(10, 10))
  })

  it('returns one pair for two incident walls', () => {
    const point = newVec2(0, 0)
    const pairs = getAdjacentWallNodeBadgePairs([
      { id: 'wall_a' as never, key: 'wall_a', direction: newVec2(1, 0), leftPoint: point, rightPoint: point },
      { id: 'wall_b' as never, key: 'wall_b', direction: newVec2(0, 1), leftPoint: point, rightPoint: point }
    ])

    expect(pairs).toHaveLength(1)
  })

  it('does not create the exterior pair between perimeter rays', () => {
    const point = newVec2(0, 0)
    const pairs = getAdjacentWallNodeBadgePairs([
      {
        id: 'perimeter' as never,
        key: 'perimeter-forward',
        direction: newVec2(1, 0),
        leftPoint: point,
        rightPoint: point,
        isPerimeterRay: true
      },
      {
        id: 'perimeter' as never,
        key: 'perimeter-backward',
        direction: newVec2(-1, 0),
        leftPoint: point,
        rightPoint: point,
        isPerimeterRay: true
      },
      { id: 'wall_a' as never, key: 'wall_a', direction: newVec2(0, 1), leftPoint: point, rightPoint: point }
    ])

    expect(pairs).toHaveLength(1)
    expect(pairs.every(pair => !(pair.wallA.isPerimeterRay && pair.wallB.isPerimeterRay))).toBe(true)
  })
})
