import { describe, expect, it } from 'vitest'

import { applyMigrations } from './index'

describe('model store migrations', () => {
  it('ensures floor collections are plain objects', () => {
    const migrated = applyMigrations({
      floorAreas: null,
      floorOpenings: []
    }) as Record<string, unknown>

    expect(migrated.floorAreas).toEqual({})
    expect(migrated.floorOpenings).toEqual({})
  })

  it('derives referencePolygon from corners when missing (inside reference)', () => {
    const migrated = applyMigrations({
      perimeters: {
        perimeter1: {
          referenceSide: 'inside',
          corners: [
            { insidePoint: [0, 0], outsidePoint: [100, 0] },
            { insidePoint: [100, 0], outsidePoint: [100, 100] },
            { insidePoint: [100, 100], outsidePoint: [0, 100] }
          ],
          walls: []
        }
      }
    }) as Record<string, any>

    const perimeter = migrated.perimeters.perimeter1
    expect(Array.isArray(perimeter.referencePolygon)).toBe(true)
    expect(perimeter.referencePolygon).toHaveLength(3)
    expect(Array.from(perimeter.referencePolygon[0])).toEqual([0, 0])
  })

  it('derives referencePolygon from corners when reference side is outside', () => {
    const migrated = applyMigrations({
      perimeters: {
        perimeter1: {
          referenceSide: 'outside',
          corners: [
            { insidePoint: [0, 0], outsidePoint: [-10, 0] },
            { insidePoint: [10, 0], outsidePoint: [10, 0] },
            { insidePoint: [10, 10], outsidePoint: [10, 10] }
          ],
          walls: []
        }
      }
    }) as Record<string, any>

    const perimeter = migrated.perimeters.perimeter1
    expect(Array.isArray(perimeter.referencePolygon)).toBe(true)
    expect(perimeter.referencePolygon).toHaveLength(3)
    expect(Array.from(perimeter.referencePolygon[0])).toEqual([-10, 0])
  })
})
