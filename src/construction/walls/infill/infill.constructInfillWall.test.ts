import { describe, expect, it } from 'vitest'

import {
  createOpeningId,
  createPerimeterConstructionMethodId,
  createPerimeterCornerId,
  createPerimeterId,
  createPerimeterWallId
} from '@/building/model/ids'
import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import type { LayersConfig } from '@/construction/config/types'
import { createMaterialId } from '@/construction/materials/material'
import { TAG_OPENING_SPACING, TAG_POST_SPACING } from '@/construction/tags'
import type { Length } from '@/shared/geometry'
import { createLength, createVec2 } from '@/shared/geometry'

import { type InfillConstructionConfig, constructInfillWall } from './infill'

const createTestWall = (overrides: Partial<PerimeterWall> = {}): PerimeterWall => ({
  id: createPerimeterWallId(),
  thickness: 360 as Length,
  constructionMethodId: createPerimeterConstructionMethodId(),
  openings: [],
  insideLength: 5000 as Length,
  outsideLength: 5000 as Length,
  wallLength: 5000 as Length,
  insideLine: { start: [0, 0], end: [5000, 0] },
  outsideLine: { start: [0, 360], end: [5000, 360] },
  direction: [1, 0],
  outsideDirection: [0, 1],
  ...overrides
})

const createTestPerimeter = (wall: PerimeterWall): Perimeter => ({
  id: createPerimeterId(),
  storeyId: 'test-storey' as any,
  walls: [wall],
  corners: [
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(0, 0),
      outsidePoint: createVec2(-100, 400),
      constuctedByWall: 'previous' // doesn't belong to wall[0]
    },
    {
      id: createPerimeterCornerId(),
      insidePoint: createVec2(5000, 0),
      outsidePoint: createVec2(5100, 400),
      constuctedByWall: 'next' // doesn't belong to wall[0]
    }
  ]
})

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 2000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

const createTestConfig = (): InfillConstructionConfig => ({
  type: 'infill',
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: {
    type: 'full',
    width: 60 as Length,
    material: createMaterialId()
  },
  openings: {
    padding: 15 as Length,
    headerThickness: 60 as Length,
    headerMaterial: createMaterialId(),
    sillThickness: 60 as Length,
    sillMaterial: createMaterialId()
  },
  straw: {
    baleLength: 800 as Length,
    baleHeight: 500 as Length,
    baleWidth: 360 as Length,
    material: createMaterialId()
  }
})

const createTestLayersConfig = (): LayersConfig => ({
  insideThickness: createLength(20),
  outsideThickness: createLength(20)
})

describe('constructInfillWall - Integration Tests', () => {
  describe('basic wall construction', () => {
    it('constructs wall without openings', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Check the new ConstructionModel structure
      expect(result).toBeDefined()
      expect(result.elements).toBeDefined()
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.measurements).toBeDefined()
      expect(result.areas).toBeDefined()
      expect(result.errors).toBeDefined()
      expect(result.warnings).toBeDefined()
      expect(result.bounds).toBeDefined()

      // Check that elements have the correct structure
      result.elements.forEach(element => {
        expect(element.id).toBeDefined()
        expect(element.bounds).toBeDefined()

        // Check if it's a ConstructionElement (has material and shape)
        if ('material' in element && 'shape' in element) {
          expect(element.material).toBeDefined()
          expect(element.shape).toBeDefined()
          expect(element.transform).toBeDefined()
        }
        // Or if it's a ConstructionGroup (has children)
        else if ('children' in element) {
          expect(element.children).toBeDefined()
          expect(element.transform).toBeDefined()
        }
      })
    })

    it('constructs wall with single opening', () => {
      const opening = createTestOpening({
        offsetFromStart: 2000 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({ openings: [opening] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have construction elements for both wall areas and opening frame
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toEqual([])

      // Should have measurements for post spacing and segments
      expect(result.measurements.length).toBeGreaterThan(0)
    })

    it('constructs wall with multiple openings', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 600 as Length,
        type: 'door'
      })
      const opening2 = createTestOpening({
        offsetFromStart: 3000 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({ openings: [opening1, opening2] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have construction elements for wall areas and opening frames
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toEqual([])

      // Should have measurements for post spacing and segments
      expect(result.measurements.length).toBeGreaterThan(0)
    })

    it('constructs wall with opening at start', () => {
      const opening = createTestOpening({
        offsetFromStart: 0 as Length,
        width: 800 as Length,
        type: 'door'
      })
      const wall = createTestWall({
        openings: [opening],
        insideLength: 3000 as Length,
        outsideLength: 3000 as Length,
        wallLength: 3000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have construction elements for opening frame and wall area
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toEqual([])
    })

    it('constructs wall with opening at end', () => {
      const opening = createTestOpening({
        offsetFromStart: 2200 as Length,
        width: 800 as Length,
        type: 'window'
      })
      const wall = createTestWall({
        openings: [opening],
        insideLength: 3000 as Length,
        outsideLength: 3000 as Length,
        wallLength: 3000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have construction elements for wall area and opening frame
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toEqual([])
    })
  })

  describe('element generation', () => {
    it('generates construction elements with correct structure', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.elements.length).toBeGreaterThan(0)

      // Check that elements have required properties
      result.elements.forEach(element => {
        expect(element.id).toBeDefined()
        expect(element.bounds).toBeDefined()

        if ('material' in element && 'shape' in element) {
          expect(element.material).toBeDefined()
          expect(element.shape).toBeDefined()
          expect(element.shape.bounds).toBeDefined()

          // Check common shape properties
          if (element.shape.type === 'cuboid') {
            expect(element.shape.offset).toBeDefined()
            expect(element.shape.size).toBeDefined()
          }
        }
      })
    })

    it('generates opening elements for walls with openings', () => {
      const opening = createTestOpening()
      const wall = createTestWall({ openings: [opening] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result.elements.length).toBeGreaterThan(0)

      // Should have elements for both wall construction and opening frame
      const wallElements = result.elements.filter(e => 'material' in e && 'shape' in e)
      expect(wallElements.length).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('handles walls with no length', () => {
      const wall = createTestWall({
        insideLength: 0 as Length,
        openings: []
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should still create a result, even if it has no meaningful elements
      expect(result).toBeDefined()
      expect(result.elements).toBeDefined()
      expect(result.errors).toBeDefined()
      expect(result.warnings).toBeDefined()
    })

    it('handles very small walls', () => {
      const wall = createTestWall({
        insideLength: 50 as Length,
        wallLength: 50 as Length,
        outsideLength: 50 as Length,
        openings: []
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      expect(result).toBeDefined()
      expect(result.elements).toBeDefined()

      // May have warnings about insufficient space
      if (result.warnings.length > 0) {
        expect(result.warnings[0].description).toContain('space')
      }
    })
  })

  describe('measurements and areas', () => {
    it('generates measurements for post spacing', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have measurements for post spacing
      expect(result.measurements).toBeDefined()
      const postSpacingMeasurements = result.measurements.filter(m => m.tags?.includes(TAG_POST_SPACING))
      expect(postSpacingMeasurements.length).toBeGreaterThan(0)
    })

    it('generates corner areas when walls have corners', () => {
      const wall = createTestWall({ openings: [] })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have corner areas for the perimeter corners
      expect(result.areas).toBeDefined()
      const cornerAreas = result.areas.filter(area => area.label === 'Corner')
      expect(cornerAreas.length).toBeGreaterThan(0)
    })
  })

  describe('opening type handling', () => {
    it('handles different opening types with correct configurations', () => {
      const door = createTestOpening({ type: 'door', offsetFromStart: 500 as Length })
      const window = createTestOpening({ type: 'window', offsetFromStart: 2000 as Length })
      const passage = createTestOpening({ type: 'passage', offsetFromStart: 3500 as Length })

      const wall = createTestWall({
        openings: [door, window, passage],
        insideLength: 6000 as Length,
        wallLength: 6000 as Length,
        outsideLength: 6000 as Length
      })
      const config = createTestConfig()
      const floorHeight = 2500 as Length

      const result = constructInfillWall(wall, createTestPerimeter(wall), floorHeight, config, createTestLayersConfig())

      // Should have construction elements for all areas
      expect(result.elements.length).toBeGreaterThan(0)
      expect(result.errors).toEqual([])

      // Should have segment measurements for the multiple wall sections
      const segmentMeasurements = result.measurements.filter(m => m.tags?.includes(TAG_OPENING_SPACING))
      expect(segmentMeasurements.length).toBeGreaterThan(0)
    })
  })
})
