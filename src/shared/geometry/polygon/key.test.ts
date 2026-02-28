import { describe, expect, it } from 'vitest'

import { type Vec2, copyVec2, newVec2 } from '@/shared/geometry/2d'
import { canonicalPolygonKey } from '@/shared/geometry/polygon/key'

describe('canonicalPolygonKey', () => {
  const translate = (points: Vec2[], dx: number, dy: number): Vec2[] =>
    points.map(point => newVec2(point[0] + dx, point[1] + dy))
  const rotate90 = (points: Vec2[]): Vec2[] => points.map(point => newVec2(-point[1], point[0]))
  const mirrorYAxis = (points: Vec2[]): Vec2[] => points.map(point => newVec2(-point[0], point[1]))
  const changeStartingVertex = (points: Vec2[], offset: number): Vec2[] => {
    const count = points.length
    return Array.from({ length: count }, (_, index) => copyVec2(points[(index + offset) % count]))
  }
  const reverseOrder = (points: Vec2[]): Vec2[] =>
    points
      .slice()
      .reverse()
      .map(point => copyVec2(point))

  const basePoints: Vec2[] = [newVec2(0, 0), newVec2(400, 0), newVec2(500, 300), newVec2(200, 500), newVec2(-100, 300)]

  const baseKey = canonicalPolygonKey(basePoints)

  it('is translation invariant', () => {
    const translated = translate(basePoints, 10, -7)
    expect(canonicalPolygonKey(translated)).toBe(baseKey)
  })

  it('is rotation invariant', () => {
    const rotated = rotate90(basePoints)
    expect(canonicalPolygonKey(rotated)).toBe(baseKey)
  })

  it('is mirror invariant', () => {
    const mirrored = mirrorYAxis(basePoints)
    expect(canonicalPolygonKey(mirrored)).toBe(baseKey)
  })

  it('is invariant to reversed winding order', () => {
    const reversed = reverseOrder(basePoints)
    expect(canonicalPolygonKey(reversed)).toBe(baseKey)
  })

  it('is invariant to the starting vertex', () => {
    const rotatedStart = changeStartingVertex(basePoints, 2)
    expect(canonicalPolygonKey(rotatedStart)).toBe(baseKey)
  })

  it('returns different keys for different polygons', () => {
    const changedPolygon = [newVec2(10, 10), ...basePoints.slice(1)]
    expect(canonicalPolygonKey(changedPolygon)).not.toBe(baseKey)
  })
})
