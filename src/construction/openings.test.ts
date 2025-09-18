import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Opening } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import { createOpeningId } from '@/types/ids'
import { constructOpeningFrame, constructOpening, type OpeningConstructionConfig } from './openings'
import type { InfillConstructionConfig } from './infill'
import { infillWallArea } from './infill'
import { createMaterialId, resolveDefaultMaterial } from './material'
import {
  createConstructionElementId,
  createConstructionElement,
  getElementPosition,
  getElementSize,
  type ConstructionElement,
  type WithIssues,
  type WallSegment3D
} from './base'

// Mock the infill module
vi.mock('./infill', () => ({
  infillWallArea: vi.fn()
}))

const mockInfillWallArea = vi.mocked(infillWallArea)

const createTestOpening = (overrides: Partial<Opening> = {}): Opening => ({
  id: createOpeningId(),
  type: 'window',
  offsetFromStart: 1000 as Length,
  width: 800 as Length,
  height: 1200 as Length,
  sillHeight: 900 as Length,
  ...overrides
})

const createTestConfig = (overrides: Partial<OpeningConstructionConfig> = {}): OpeningConstructionConfig => ({
  padding: 15 as Length,
  headerThickness: 60 as Length,
  headerMaterial: createMaterialId(),
  sillThickness: 60 as Length,
  sillMaterial: createMaterialId(),
  fillingThickness: 30 as Length,
  fillingMaterial: createMaterialId(),
  ...overrides
})

const createTestInfillConfig = (): InfillConstructionConfig => ({
  maxPostSpacing: 800 as Length,
  minStrawSpace: 70 as Length,
  posts: {
    type: 'full',
    width: 60 as Length,
    material: createMaterialId()
  },
  openings: {
    door: createTestConfig(),
    window: createTestConfig(),
    passage: createTestConfig()
  },
  straw: {
    baleLength: 800 as Length,
    baleHeight: 500 as Length,
    baleWidth: 360 as Length,
    material: createMaterialId()
  }
})

const createTestOpeningSegment = (
  opening: Opening,
  wallThickness: Length = 360 as Length,
  wallHeight: Length = 2500 as Length
): WallSegment3D => ({
  type: 'opening',
  position: [opening.offsetFromStart, 0, 0] as Vec3,
  size: [opening.width, wallThickness, wallHeight] as Vec3,
  openings: [opening]
})

const createMockInfillResult = (numElements: number = 2): WithIssues<ConstructionElement[]> => ({
  it: Array.from({ length: numElements }, (_, i) => {
    const position = [100 * i, 0, 0] as Vec3
    const size = [100, 360, 500] as Vec3
    return createConstructionElement('straw' as const, createMaterialId(), { type: 'cuboid' as const, position, size })
  }),
  errors: [],
  warnings: []
})

describe('constructOpeningFrame', () => {
  beforeEach(() => {
    mockInfillWallArea.mockReset()
    mockInfillWallArea.mockReturnValue(createMockInfillResult())
  })

  describe('basic opening construction', () => {
    it('creates header and sill for window with sill height', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it.length).toBeGreaterThan(3)

      const header = result.it.find(el => el.type === 'header')
      const sill = result.it.find(el => el.type === 'sill')
      const filling = result.it.find(el => el.type === 'opening')

      expect(header).toBeDefined()
      expect(sill).toBeDefined()
      expect(filling).toBeDefined()

      // Check header positioning
      expect(getElementPosition(header!)[0]).toBe(1000)
      expect(getElementPosition(header!)[2]).toBe(2100) // 900 + 1200
      expect(getElementSize(header!)).toEqual([800, 360, 60])

      // Check sill positioning
      expect(getElementPosition(sill!)[0]).toBe(1000)
      expect(getElementPosition(sill!)[2]).toBe(840) // 900 - 60
      expect(getElementSize(sill!)).toEqual([800, 360, 60])

      // Check filling positioning (centered with padding)
      expect(getElementPosition(filling!)[0]).toBe(1015) // 1000 + 15 padding
      expect(getElementPosition(filling!)[2]).toBe(915) // 900 + 15 padding
      expect(getElementSize(filling!)).toEqual([770, 30, 1170]) // width/height reduced by 2*padding
    })

    it('creates only header for door without sill height', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: undefined,
        height: 2000 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const header = result.it.find(el => el.type === 'header')
      const sill = result.it.find(el => el.type === 'sill')
      const filling = result.it.find(el => el.type === 'opening')

      expect(header).toBeDefined()
      expect(sill).toBeUndefined()
      expect(filling).toBeDefined()

      // Check header is at correct position (sillHeight defaults to 0)
      expect(getElementPosition(header!)[2]).toBe(2000) // 0 + 2000
    })

    it('does not create sill when sill height is 0', () => {
      const opening = createTestOpening({
        sillHeight: 0 as Length,
        height: 2000 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const sill = result.it.find(el => el.type === 'sill')
      expect(sill).toBeUndefined()
    })

    it('does not create header when opening reaches wall top', () => {
      const opening = createTestOpening({
        sillHeight: 500 as Length,
        height: 2000 as Length // opening top = 2500, same as wall height
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const header = result.it.find(el => el.type === 'header')
      expect(header).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('returns error when header does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 2400 as Length,
        height: 60 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        headerThickness: 100 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].description).toContain('Header does not fit')
      expect(result.errors[0].description).toContain('needs 100mm but only 40mm available')
      expect(result.errors[0].elements).toHaveLength(1)

      const header = result.it.find(el => el.type === 'header')
      expect(header).toBeDefined()
    })

    it('returns error when sill does not fit', () => {
      const opening = createTestOpening({
        sillHeight: 50 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        sillThickness: 100 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].description).toContain('Sill does not fit')
      expect(result.errors[0].description).toContain('needs 100mm but only 50mm available')
      expect(result.errors[0].elements).toHaveLength(1)

      const sill = result.it.find(el => el.type === 'sill')
      expect(sill).toBeDefined()
    })
  })

  describe('filling construction', () => {
    it('does not create filling when no filling material is specified', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        fillingMaterial: undefined
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const filling = result.it.find(el => el.type === 'opening')
      expect(filling).toBeUndefined()
    })

    it('does not create filling when no filling thickness is specified', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        fillingThickness: undefined
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const filling = result.it.find(el => el.type === 'opening')
      expect(filling).toBeUndefined()
    })

    it('centers filling with padding in wall thickness direction', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening, 400 as Length, 2500 as Length)
      const config = createTestConfig({
        padding: 20 as Length,
        fillingThickness: 50 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      const filling = result.it.find(el => el.type === 'opening')
      expect(filling).toBeDefined()

      // Y position should center the filling in wall thickness
      const expectedYPosition = (400 - 50) / 2 // (wallThickness - fillingThickness) / 2
      expect(getElementPosition(filling!)[1]).toBe(expectedYPosition)
    })
  })

  describe('infill wall construction', () => {
    it('calls infillWallArea for wall above header when header is required', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        headerThickness: 60 as Length
      })
      const infillConfig = createTestInfillConfig()

      constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(mockInfillWallArea).toHaveBeenCalledWith(
        [1000, 0, 2160], // [offsetFromStart, 0, sillHeight + height + headerThickness]
        [800, 360, 340], // [width, wallThickness, remaining height]
        infillConfig,
        resolveDefaultMaterial
      )
    })

    it('calls infillWallArea for wall below sill when sill is required', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        sillThickness: 80 as Length
      })
      const infillConfig = createTestInfillConfig()

      constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(mockInfillWallArea).toHaveBeenCalledWith(
        [1000, 0, 0], // [offsetFromStart, 0, 0]
        [800, 360, 820], // [width, wallThickness, sillHeight - sillThickness]
        infillConfig,
        resolveDefaultMaterial
      )
    })

    it('does not call infillWallArea for wall above header when no space remains', () => {
      const opening = createTestOpening({
        sillHeight: undefined, // No sill
        height: 2440 as Length, // Opening reaches exactly to where header starts
        type: 'door'
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        headerThickness: 60 as Length
      })
      const infillConfig = createTestInfillConfig()

      constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      // Wall above header height would be: wallHeight - (openingTop + headerThickness) = 2500 - (2440 + 60) = 0
      // Should not call infillWallArea since there's no space above header and no sill required
      expect(mockInfillWallArea).not.toHaveBeenCalled()
    })

    it('does not call infillWallArea for wall below sill when no space remains', () => {
      const opening = createTestOpening({
        sillHeight: 60 as Length,
        height: 2380 as Length // Opening reaches almost to wall top
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        sillThickness: 60 as Length,
        headerThickness: 60 as Length
      })
      const infillConfig = createTestInfillConfig()

      constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      // Wall below sill height would be: sillHeight - sillThickness = 60 - 60 = 0
      // Should not call infillWallArea since there's no space below sill
      expect(mockInfillWallArea).not.toHaveBeenCalled()
    })

    it('propagates infill errors and warnings', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const mockInfillError = { description: 'Infill error', elements: [createConstructionElementId()] }
      const mockInfillWarning = { description: 'Infill warning', elements: [createConstructionElementId()] }

      mockInfillWallArea.mockReturnValue({
        it: [],
        errors: [mockInfillError],
        warnings: [mockInfillWarning]
      })

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toContain(mockInfillError)
      expect(result.warnings).toContain(mockInfillWarning)
    })
  })

  describe('material and thickness requirements', () => {
    it('uses sillMaterial for sill when specified', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const sillMaterial = createMaterialId()
      const config = createTestConfig({
        sillMaterial,
        headerMaterial: createMaterialId()
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      const sill = result.it.find(el => el.type === 'sill')
      expect(sill?.material).toBe(sillMaterial)
    })

    it('does not create sill when sillMaterial is not specified', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        sillMaterial: undefined,
        sillThickness: 60 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      const sill = result.it.find(el => el.type === 'sill')
      expect(sill).toBeUndefined()
    })

    it('does not create sill when sillThickness is not defined even with material', () => {
      const opening = createTestOpening({
        sillHeight: 900 as Length,
        height: 1200 as Length
      })
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        sillMaterial: createMaterialId(),
        sillThickness: undefined
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      const sill = result.it.find(el => el.type === 'sill')
      expect(sill).toBeUndefined()
    })

    it('uses correct materials for all elements', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening)
      const headerMaterial = createMaterialId()
      const sillMaterial = createMaterialId()
      const fillingMaterial = createMaterialId()
      const config = createTestConfig({
        headerMaterial,
        sillMaterial,
        fillingMaterial
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      const header = result.it.find(el => el.type === 'header')
      const sill = result.it.find(el => el.type === 'sill')
      const filling = result.it.find(el => el.type === 'opening')

      expect(header?.material).toBe(headerMaterial)
      expect(sill?.material).toBe(sillMaterial)
      expect(filling?.material).toBe(fillingMaterial)
    })
  })

  describe('edge cases', () => {
    it('handles very small openings', () => {
      const opening = createTestOpening({
        width: 10 as Length,
        height: 10 as Length,
        sillHeight: 1000 as Length
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig({
        padding: 5 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const filling = result.it.find(el => el.type === 'opening')
      expect(filling).toBeDefined()
      expect(getElementSize(filling!)[0]).toBe(0) // 10 - 2*5 = 0
      expect(getElementSize(filling!)[2]).toBe(0) // 10 - 2*5 = 0
    })

    it('handles zero padding', () => {
      const opening = createTestOpening()
      const openingSegment = createTestOpeningSegment(opening)
      const config = createTestConfig({
        padding: 0 as Length
      })
      const infillConfig = createTestInfillConfig()

      const result = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)

      const filling = result.it.find(el => el.type === 'opening')
      expect(filling).toBeDefined()
      expect(getElementPosition(filling!)[0]).toBe(1000) // no padding offset
      expect(getElementSize(filling!)[0]).toBe(800) // full width
      expect(getElementSize(filling!)[2]).toBe(1200) // full height
    })
  })
})

describe('constructOpening', () => {
  beforeEach(() => {
    mockInfillWallArea.mockReset()
    mockInfillWallArea.mockReturnValue(createMockInfillResult())
  })

  it('creates an opening construction with correct structure', () => {
    const opening = createTestOpening()
    const openingSegment = createTestOpeningSegment(opening)
    const config = createTestConfig()
    const infillConfig = createTestInfillConfig()

    const result = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

    expect(result.errors).toHaveLength(0)
    expect(result.it.type).toBe('opening')
    expect(result.it.openingIds).toEqual([opening.id])
    expect(result.it.position).toBe(openingSegment.position[0])
    expect(result.it.width).toBe(openingSegment.size[0])
    expect(result.it.elements).toBeDefined()
    expect(result.it.elements.length).toBeGreaterThan(0)
  })

  it('propagates errors and warnings from constructOpeningFrame', () => {
    const opening = createTestOpening({
      sillHeight: 50 as Length,
      height: 1200 as Length
    })
    const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
    const config = createTestConfig({
      sillThickness: 100 as Length
    })
    const infillConfig = createTestInfillConfig()

    const result = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].description).toContain('Sill does not fit')
  })

  it('includes all elements from constructOpeningFrame', () => {
    const opening = createTestOpening()
    const openingSegment = createTestOpeningSegment(opening)
    const config = createTestConfig()
    const infillConfig = createTestInfillConfig()

    const frameResult = constructOpeningFrame(openingSegment, config, infillConfig, resolveDefaultMaterial)

    const openingResult = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

    // Compare elements by structure, not IDs (since IDs are generated fresh each call)
    expect(openingResult.it.elements).toHaveLength(frameResult.it.length)

    // Check that all element types, positions, sizes, and materials match
    frameResult.it.forEach((frameElement, index) => {
      const openingElement = openingResult.it.elements[index]
      expect(openingElement.type).toBe(frameElement.type)
      expect(getElementPosition(openingElement)).toEqual(getElementPosition(frameElement))
      expect(getElementSize(openingElement)).toEqual(getElementSize(frameElement))
      expect(openingElement.material).toBe(frameElement.material)
    })
  })

  it('generates unique construction element ID', () => {
    const opening = createTestOpening()
    const openingSegment = createTestOpeningSegment(opening)
    const config = createTestConfig()
    const infillConfig = createTestInfillConfig()

    const result1 = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

    const result2 = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

    expect(result1.it.id).not.toBe(result2.it.id)
  })

  describe('with different opening types', () => {
    it('handles door openings', () => {
      const opening = createTestOpening({
        type: 'door',
        sillHeight: undefined
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it.type).toBe('opening')
      expect(result.it.openingIds).toEqual([opening.id])
    })

    it('handles passage openings', () => {
      const opening = createTestOpening({
        type: 'passage',
        sillHeight: undefined
      })
      const openingSegment = createTestOpeningSegment(opening, 360 as Length, 2500 as Length)
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it.type).toBe('opening')
      expect(result.it.openingIds).toEqual([opening.id])
    })

    it('handles multiple openings in one segment', () => {
      const opening1 = createTestOpening({
        offsetFromStart: 1000 as Length,
        width: 400 as Length
      })
      const opening2 = createTestOpening({
        offsetFromStart: 1400 as Length,
        width: 400 as Length
      })
      const openingSegment: WallSegment3D = {
        type: 'opening',
        position: [1000, 0, 0] as Vec3,
        size: [800, 360, 2500] as Vec3,
        openings: [opening1, opening2]
      }
      const config = createTestConfig()
      const infillConfig = createTestInfillConfig()

      const result = constructOpening(openingSegment, config, infillConfig, resolveDefaultMaterial)

      expect(result.errors).toHaveLength(0)
      expect(result.it.type).toBe('opening')
      expect(result.it.openingIds).toEqual([opening1.id, opening2.id])
    })
  })
})
