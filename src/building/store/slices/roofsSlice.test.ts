import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RoofAssemblyId, StoreyId } from '@/building/model/ids'
import { createStoreyId } from '@/building/model/ids'
import type { Polygon2D } from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

import type { RoofsSlice } from './roofsSlice'
import { createRoofsSlice } from './roofsSlice'

vi.mock('@/shared/geometry/polygon', async importOriginal => {
  return {
    ...(await importOriginal()),
    wouldClosingPolygonSelfIntersect: vi.fn(),
    ensurePolygonIsClockwise: vi.fn()
  }
})

const wouldClosingPolygonSelfIntersectMock = vi.mocked(wouldClosingPolygonSelfIntersect)
const ensurePolygonIsClockwiseMock = vi.mocked(ensurePolygonIsClockwise)

vi.mock('zustand')

describe('roofsSlice', () => {
  let store: RoofsSlice
  let mockSet: any
  let mockGet: any
  let testStoreyId: StoreyId
  let testAssemblyId: RoofAssemblyId
  let testDirection: vec2

  beforeEach(() => {
    wouldClosingPolygonSelfIntersectMock.mockReset()
    wouldClosingPolygonSelfIntersectMock.mockReturnValue(false)
    ensurePolygonIsClockwiseMock.mockReset()
    ensurePolygonIsClockwiseMock.mockImplementation(p => p)

    mockSet = vi.fn()
    mockGet = vi.fn()
    const mockStore = {} as any
    testStoreyId = createStoreyId()
    testAssemblyId = 'ra_test' as RoofAssemblyId
    testDirection = vec2.fromValues(1, 0)

    store = createRoofsSlice(mockSet, mockGet, mockStore)

    mockGet.mockImplementation(() => store)

    mockSet.mockImplementation((updater: any) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        if (newState !== store) {
          store = { ...store, ...newState }
        }
      } else {
        store = { ...store, ...updater }
      }
    })
  })

  const createTestPolygon = (): Polygon2D => ({
    points: [vec2.fromValues(0, 0), vec2.fromValues(100, 0), vec2.fromValues(100, 100), vec2.fromValues(0, 100)]
  })

  const createTrianglePolygon = (): Polygon2D => ({
    points: [vec2.fromValues(0, 0), vec2.fromValues(100, 0), vec2.fromValues(50, 100)]
  })

  describe('addRoof', () => {
    it('should create a roof with valid parameters', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(roof).toBeDefined()
      expect(roof.storeyId).toBe(testStoreyId)
      expect(roof.type).toBe('gable')
      expect(roof.slope).toBe(45)
      expect(roof.ridgeHeight).toBe(3000)
      expect(roof.assemblyId).toBe(testAssemblyId)
      expect(roof.area.points).toHaveLength(4)
      expect(roof.overhang).toHaveLength(4)
      expect(roof.overhang).toEqual([500, 500, 500, 500])
    })

    it('should expand single overhang value to array matching polygon sides', () => {
      const polygon = createTrianglePolygon()
      const roof = store.actions.addRoof(testStoreyId, 'shed', polygon, testDirection, 30, 2500, 400, testAssemblyId)

      expect(roof.overhang).toHaveLength(3)
      expect(roof.overhang).toEqual([400, 400, 400])
    })

    it('should normalize polygon to clockwise', () => {
      const polygon = createTestPolygon()
      store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(polygon)
    })

    it('should reject invalid slope (< 0)', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, -5, 3000, 500, testAssemblyId)
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should reject invalid slope (> 90)', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 95, 3000, 500, testAssemblyId)
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should accept boundary slope values (0 and 90)', () => {
      const polygon = createTestPolygon()

      const flatRoof = store.actions.addRoof(testStoreyId, 'shed', polygon, testDirection, 0, 3000, 500, testAssemblyId)
      expect(flatRoof.slope).toBe(0)

      const steepRoof = store.actions.addRoof(
        testStoreyId,
        'gable',
        polygon,
        testDirection,
        90,
        3000,
        500,
        testAssemblyId
      )
      expect(steepRoof.slope).toBe(90)
    })

    it('should reject negative ridge height', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, -100, 500, testAssemblyId)
      }).toThrow('Ridge height must be non-negative')
    })

    it('should reject negative overhang', () => {
      const polygon = createTestPolygon()
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, -50, testAssemblyId)
      }).toThrow('Overhang must be non-negative')
    })

    it('should reject polygon with < 3 points', () => {
      const invalidPolygon: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(100, 0)]
      }
      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', invalidPolygon, testDirection, 45, 3000, 500, testAssemblyId)
      }).toThrow('Roof polygon must have at least 3 points')
    })

    it('should reject self-intersecting polygon', () => {
      wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
      const polygon = createTestPolygon()

      expect(() => {
        store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)
      }).toThrow('Roof polygon must not self-intersect')
    })

    it('should clone direction vector', () => {
      const polygon = createTestPolygon()
      const direction = vec2.fromValues(1, 0)
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, direction, 45, 3000, 500, testAssemblyId)

      // Modify original direction
      vec2.set(direction, 0, 1)

      // Roof direction should be unchanged
      expect(roof.direction[0]).toBe(1)
      expect(roof.direction[1]).toBe(0)
    })
  })

  describe('removeRoof', () => {
    it('should remove roof by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(store.roofs[roof.id]).toBeDefined()

      store.actions.removeRoof(roof.id)

      expect(store.roofs[roof.id]).toBeUndefined()
    })

    it('should not throw when removing non-existent roof', () => {
      expect(() => {
        store.actions.removeRoof('roof_nonexistent' as any)
      }).not.toThrow()
    })
  })

  describe('updateRoofOverhang', () => {
    it('should update overhang by index', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofOverhang(roof.id, 1, 750)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.overhang).toEqual([500, 750, 500, 500])
    })

    it('should reject out-of-bounds index (negative)', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofOverhang(roof.id, -1, 750)

      expect(success).toBe(false)
      expect(store.roofs[roof.id].overhang).toEqual([500, 500, 500, 500])
    })

    it('should reject out-of-bounds index (too large)', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofOverhang(roof.id, 4, 750)

      expect(success).toBe(false)
      expect(store.roofs[roof.id].overhang).toEqual([500, 500, 500, 500])
    })

    it('should reject negative overhang value', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(() => {
        store.actions.updateRoofOverhang(roof.id, 0, -100)
      }).toThrow('Overhang must be non-negative')
    })

    it('should return false for non-existent roof', () => {
      const success = store.actions.updateRoofOverhang('roof_nonexistent' as any, 0, 500)
      expect(success).toBe(false)
    })
  })

  describe('updateRoofProperties', () => {
    it('should update single property (slope)', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, { slope: 30 })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(30)
      expect(updatedRoof.ridgeHeight).toBe(3000) // Unchanged
    })

    it('should update multiple properties at once', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, {
        slope: 35,
        ridgeHeight: 3500
      })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(35)
      expect(updatedRoof.ridgeHeight).toBe(3500)
    })

    it('should update all properties at once', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const newDirection = vec2.fromValues(0, 1)
      const newAssemblyId = 'ra_new' as RoofAssemblyId
      const success = store.actions.updateRoofProperties(roof.id, {
        slope: 25,
        direction: newDirection,
        ridgeHeight: 2800,
        assemblyId: newAssemblyId
      })

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(25)
      expect(updatedRoof.direction[0]).toBe(0)
      expect(updatedRoof.direction[1]).toBe(1)
      expect(updatedRoof.ridgeHeight).toBe(2800)
      expect(updatedRoof.assemblyId).toBe(newAssemblyId)
    })

    it('should handle empty updates object', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const success = store.actions.updateRoofProperties(roof.id, {})

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.slope).toBe(45)
      expect(updatedRoof.ridgeHeight).toBe(3000)
    })

    it('should reject invalid slope in update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(() => {
        store.actions.updateRoofProperties(roof.id, { slope: -10 })
      }).toThrow('Roof slope must be between 0 and 90 degrees')

      expect(() => {
        store.actions.updateRoofProperties(roof.id, { slope: 100 })
      }).toThrow('Roof slope must be between 0 and 90 degrees')
    })

    it('should reject invalid ridgeHeight in update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      expect(() => {
        store.actions.updateRoofProperties(roof.id, { ridgeHeight: -500 })
      }).toThrow('Ridge height must be non-negative')
    })

    it('should clone direction vector on update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const newDirection = vec2.fromValues(0, 1)
      store.actions.updateRoofProperties(roof.id, { direction: newDirection })

      // Modify original direction
      vec2.set(newDirection, 1, 1)

      // Roof direction should be unchanged
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.direction[0]).toBe(0)
      expect(updatedRoof.direction[1]).toBe(1)
    })

    it('should return false for non-existent roof', () => {
      const success = store.actions.updateRoofProperties('roof_nonexistent' as any, { slope: 30 })
      expect(success).toBe(false)
    })
  })

  describe('updateRoofArea', () => {
    it('should update area with same point count', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const newPolygon: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(200, 0), vec2.fromValues(200, 200), vec2.fromValues(0, 200)]
      }

      const success = store.actions.updateRoofArea(roof.id, newPolygon)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.area.points).toHaveLength(4)
      expect(updatedRoof.area.points[1][0]).toBe(200)
    })

    it('should preserve overhang array when updating area', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      // Set different overhangs
      store.actions.updateRoofOverhang(roof.id, 0, 300)
      store.actions.updateRoofOverhang(roof.id, 1, 400)

      const newPolygon: Polygon2D = {
        points: [vec2.fromValues(0, 0), vec2.fromValues(200, 0), vec2.fromValues(200, 200), vec2.fromValues(0, 200)]
      }

      const success = store.actions.updateRoofArea(roof.id, newPolygon)

      expect(success).toBe(true)
      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.overhang).toEqual([300, 400, 500, 500])
    })

    it('should reject update with different point count', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const trianglePolygon = createTrianglePolygon()

      expect(() => {
        store.actions.updateRoofArea(roof.id, trianglePolygon)
      }).toThrow('Cannot change roof polygon point count (current: 4, new: 3)')
    })

    it('should normalize polygon to clockwise on update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const newPolygon = createTestPolygon()
      store.actions.updateRoofArea(roof.id, newPolygon)

      expect(ensurePolygonIsClockwiseMock).toHaveBeenCalledWith(newPolygon)
    })

    it('should reject self-intersecting polygon on update', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      wouldClosingPolygonSelfIntersectMock.mockReturnValue(true)
      const badPolygon = createTestPolygon()

      expect(() => {
        store.actions.updateRoofArea(roof.id, badPolygon)
      }).toThrow('Roof polygon must not self-intersect')
    })

    it('should return false for non-existent roof', () => {
      const polygon = createTestPolygon()
      const success = store.actions.updateRoofArea('roof_nonexistent' as any, polygon)
      expect(success).toBe(false)
    })
  })

  describe('getRoofById', () => {
    it('should get roof by ID', () => {
      const polygon = createTestPolygon()
      const roof = store.actions.addRoof(testStoreyId, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)

      const retrieved = store.actions.getRoofById(roof.id)

      expect(retrieved).toBe(roof)
    })

    it('should return null for non-existent roof', () => {
      const retrieved = store.actions.getRoofById('roof_nonexistent' as any)
      expect(retrieved).toBeNull()
    })
  })

  describe('getRoofsByStorey', () => {
    it('should get roofs by storey', () => {
      const polygon = createTestPolygon()
      const storey1 = createStoreyId()
      const storey2 = createStoreyId()

      const roof1 = store.actions.addRoof(storey1, 'gable', polygon, testDirection, 45, 3000, 500, testAssemblyId)
      const roof2 = store.actions.addRoof(storey1, 'shed', polygon, testDirection, 30, 2500, 400, testAssemblyId)
      const roof3 = store.actions.addRoof(storey2, 'gable', polygon, testDirection, 40, 3200, 600, testAssemblyId)

      const storey1Roofs = store.actions.getRoofsByStorey(storey1)
      const storey2Roofs = store.actions.getRoofsByStorey(storey2)

      expect(storey1Roofs).toHaveLength(2)
      expect(storey1Roofs).toContain(roof1)
      expect(storey1Roofs).toContain(roof2)

      expect(storey2Roofs).toHaveLength(1)
      expect(storey2Roofs).toContain(roof3)
    })

    it('should return empty array for storey with no roofs', () => {
      const roofs = store.actions.getRoofsByStorey(createStoreyId())
      expect(roofs).toEqual([])
    })
  })

  describe('Type and referencePerimeter immutability', () => {
    it('should not have methods to update type', () => {
      const actions = store.actions
      expect(actions).not.toHaveProperty('updateRoofType')
    })

    it('should not have methods to update referencePerimeter', () => {
      const actions = store.actions
      expect(actions).not.toHaveProperty('updateRoofReferencePerimeter')
    })

    it('should preserve type and referencePerimeter on property updates', () => {
      const polygon = createTestPolygon()
      const perimeterId = 'perimeter_test' as any
      const roof = store.actions.addRoof(
        testStoreyId,
        'gable',
        polygon,
        testDirection,
        45,
        3000,
        500,
        testAssemblyId,
        perimeterId
      )

      store.actions.updateRoofProperties(roof.id, {
        slope: 30,
        ridgeHeight: 2500
      })

      const updatedRoof = store.roofs[roof.id]
      expect(updatedRoof.type).toBe('gable')
      expect(updatedRoof.referencePerimeter).toBe(perimeterId)
    })
  })
})
