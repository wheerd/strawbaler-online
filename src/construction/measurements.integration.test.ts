import { describe, it, expect } from 'vitest'
import { constructInfillWall } from './infill'
import type { InfillConstructionConfig } from './infill'
import type { PerimeterWall, Perimeter } from '@/model'
import type { Length } from '@/types/geometry'
import { createVec2 } from '@/types/geometry'
import { createPerimeterId, createPerimeterCornerId } from '@/types/ids'

const mockWall = (length: Length, openings: any[] = []): PerimeterWall => ({
  id: 'wall-1' as any,
  constructionType: 'infill',
  insideLength: length,
  outsideLength: length,
  wallLength: length,
  thickness: 100 as Length,
  insideLine: { start: [0, 0], end: [length, 0] } as any,
  outsideLine: { start: [0, 100], end: [length, 100] } as any,
  direction: [1, 0] as any,
  outsideDirection: [0, 1] as any,
  openings
})

const mockPerimeter = (wall: PerimeterWall): Perimeter => ({
  id: createPerimeterId(),
  storeyId: 'test-storey' as any,
  walls: [wall],
  corners: [
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(0, 0),
      outsidePoint: createVec2(-50, 150),
      belongsTo: 'next'
    },
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(wall.wallLength, 0),
      outsidePoint: createVec2(wall.wallLength + 50, 150),
      belongsTo: 'previous'
    }
  ]
})

const defaultConfig: InfillConstructionConfig = {
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: {
    type: 'full',
    width: 40 as Length,
    material: 'wood' as any
  },
  openings: {
    window: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: 'wood' as any,
      sillThickness: 60 as Length,
      sillMaterial: 'wood' as any
    },
    door: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: 'wood' as any
    },
    passage: {
      padding: 15 as Length,
      headerThickness: 60 as Length,
      headerMaterial: 'wood' as any
    }
  },
  straw: {
    material: 'straw' as any,
    baleLength: 400 as Length,
    baleHeight: 350 as Length,
    baleWidth: 450 as Length
  }
}

describe('measurements integration', () => {
  it('generates post spacing measurements for infill wall', () => {
    const wall = mockWall(2400 as Length)
    const floorHeight = 2400 as Length

    const plan = constructInfillWall(wall, mockPerimeter(wall), floorHeight, defaultConfig)

    // Should have measurements
    expect(plan.measurements).toBeDefined()
    expect(plan.measurements.length).toBeGreaterThan(0)

    // Should have post spacing measurements
    const postSpacingMeasurements = plan.measurements.filter(m => m.type === 'post-spacing')
    expect(postSpacingMeasurements.length).toBeGreaterThan(0)

    // All post spacing measurements should have labels
    postSpacingMeasurements.forEach(m => {
      expect(m.label).toMatch(/\d+mm/)
    })
  })

  it('generates opening measurements for wall with window', () => {
    const window = {
      id: 'window-1' as any,
      type: 'window' as const,
      offsetFromStart: 800 as Length,
      width: 1200 as Length,
      height: 1200 as Length,
      sillHeight: 800 as Length
    }

    const wall = mockWall(3000 as Length, [window])
    const floorHeight = 2400 as Length

    const plan = constructInfillWall(wall, mockPerimeter(wall), floorHeight, defaultConfig)

    // Should have opening-related measurements
    const openingWidthMeasurements = plan.measurements.filter(m => m.type === 'opening-width')
    const sillHeightMeasurements = plan.measurements.filter(m => m.type === 'sill-height')
    const headerHeightMeasurements = plan.measurements.filter(m => m.type === 'header-height')
    const openingHeightMeasurements = plan.measurements.filter(m => m.type === 'opening-height')

    expect(openingWidthMeasurements.length).toBe(1)
    expect(sillHeightMeasurements.length).toBe(1)
    expect(headerHeightMeasurements.length).toBe(1)
    expect(openingHeightMeasurements.length).toBe(1)

    // Verify measurements exist
    expect(openingWidthMeasurements[0]).toBeDefined()
    expect(sillHeightMeasurements[0]).toBeDefined()
    expect(headerHeightMeasurements[0]).toBeDefined()
    expect(openingHeightMeasurements[0]).toBeDefined()

    // Check that sill height is correct
    // The sill height in the opening spec is 800mm, which means the actual sill top should be at 800mm
    expect(sillHeightMeasurements[0].label).toBe('800mm')

    // Check that opening height is correct (headerBottom - sillTop = (800+1200) - 800 = 1200)
    expect(openingHeightMeasurements[0].label).toBe('1200mm')
  })

  it('generates opening measurements for door without sill', () => {
    const door = {
      id: 'door-1' as any,
      type: 'door' as const,
      offsetFromStart: 1000 as Length,
      width: 800 as Length,
      height: 2000 as Length
      // No sillHeight for door
    }

    const wall = mockWall(3000 as Length, [door])
    const floorHeight = 2400 as Length

    const plan = constructInfillWall(wall, mockPerimeter(wall), floorHeight, defaultConfig)

    // Should have opening width and header height, but no sill height or opening height
    const openingWidthMeasurements = plan.measurements.filter(m => m.type === 'opening-width')
    const sillHeightMeasurements = plan.measurements.filter(m => m.type === 'sill-height')
    const headerHeightMeasurements = plan.measurements.filter(m => m.type === 'header-height')
    const openingHeightMeasurements = plan.measurements.filter(m => m.type === 'opening-height')

    expect(openingWidthMeasurements.length).toBe(1)
    expect(sillHeightMeasurements.length).toBe(0)
    expect(headerHeightMeasurements.length).toBe(1)
    expect(openingHeightMeasurements.length).toBe(0)

    // Header height should be the opening height (2000mm)
    expect(headerHeightMeasurements[0].label).toBe('2000mm')
  })

  it('generates spacing measurements between multiple openings', () => {
    const window1 = {
      id: 'window-1' as any,
      type: 'window' as const,
      offsetFromStart: 400 as Length,
      width: 800 as Length,
      height: 1200 as Length,
      sillHeight: 800 as Length
    }

    const window2 = {
      id: 'window-2' as any,
      type: 'window' as const,
      offsetFromStart: 1600 as Length,
      width: 800 as Length,
      height: 1200 as Length,
      sillHeight: 800 as Length
    }

    const wall = mockWall(3000 as Length, [window1, window2])
    const floorHeight = 2400 as Length

    const plan = constructInfillWall(wall, mockPerimeter(wall), floorHeight, defaultConfig)

    // Should have opening spacing measurements: start to first, between openings, last to end
    const spacingMeasurements = plan.measurements.filter(m => m.type === 'opening-spacing')
    expect(spacingMeasurements.length).toBe(3)
    spacingMeasurements.forEach(m => {
      expect(m.type).toBe('opening-spacing')
    })

    // Start to first: 0 to 400 = 400mm
    // Between: (400 + 800) to 1600 = 400mm
    // Last to end: (1600 + 800) to 3000 = 600mm
    const labels = spacingMeasurements.map(m => m.label).sort()
    expect(labels).toEqual(['400mm', '400mm', '600mm'])
  })

  it('handles wall with both posts and openings correctly', () => {
    const window = {
      id: 'window-1' as any,
      type: 'window' as const,
      offsetFromStart: 1200 as Length,
      width: 800 as Length,
      height: 1200 as Length,
      sillHeight: 800 as Length
    }

    const wall = mockWall(4000 as Length, [window])
    const floorHeight = 2400 as Length

    const plan = constructInfillWall(wall, mockPerimeter(wall), floorHeight, defaultConfig)

    // Should have both post spacing and opening measurements
    const postSpacingMeasurements = plan.measurements.filter(m => m.type === 'post-spacing')
    const openingMeasurements = plan.measurements.filter(
      m => m.type.startsWith('opening-') || m.type.includes('height')
    )

    expect(postSpacingMeasurements.length).toBeGreaterThan(0)
    expect(openingMeasurements.length).toBeGreaterThan(0)

    // Verify all measurements have required properties
    plan.measurements.forEach(m => {
      expect(m.type).toBeDefined()
      expect(m.startPoint).toBeDefined()
      expect(m.endPoint).toBeDefined()
      expect(m.label).toBeDefined()
      expect(m.offset).toBeDefined()
    })
  })
})
