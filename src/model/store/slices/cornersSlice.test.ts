import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { WallId, PointId } from '@/types/ids'
import { createCornersSlice, type CornersSlice } from './cornersSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('CornersSlice', () => {
  let store: CornersSlice
  let pointId1: PointId
  let pointId2: PointId
  let wallId1: WallId
  let wallId2: WallId
  let wallId3: WallId
  let wallId4: WallId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createCornersSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    pointId1 = 'point_1' as PointId
    pointId2 = 'point_2' as PointId
    wallId1 = 'wall_1' as WallId
    wallId2 = 'wall_2' as WallId
    wallId3 = 'wall_3' as WallId
    wallId4 = 'wall_4' as WallId

    // Mock the get function to return current state
    mockGet.mockImplementation(() => store)
    
    // Mock the set function to actually update the store
    mockSet.mockImplementation((updater) => {
      if (typeof updater === 'function') {
        const newState = updater(store)
        Object.assign(store, newState)
      } else {
        Object.assign(store, updater)
      }
    })
  })

  describe('addCorner', () => {
    it('should add a corner with required walls only', () => {
      const corner = store.addCorner(pointId1, wallId1, wallId2)
      
      expect(store.corners.size).toBe(1)
      expect(store.corners.has(pointId1)).toBe(true)
      
      const addedCorner = store.corners.get(pointId1)
      expect(addedCorner).toBeDefined()
      expect(addedCorner?.pointId).toBe(pointId1)
      expect(addedCorner?.wall1Id).toBe(wallId1)
      expect(addedCorner?.wall2Id).toBe(wallId2)
      expect(addedCorner?.otherWallIds).toBeUndefined()
      
      // Should return the corner
      expect(corner.pointId).toBe(pointId1)
      expect(corner.wall1Id).toBe(wallId1)
      expect(corner.wall2Id).toBe(wallId2)
    })

    it('should add a corner with other walls', () => {
      const corner = store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId4])
      
      const addedCorner = store.corners.get(pointId1)
      expect(addedCorner).toBeDefined()
      expect(addedCorner?.otherWallIds).toEqual([wallId3, wallId4])
      
      // Should return the corner
      expect(corner.otherWallIds).toEqual([wallId3, wallId4])
    })

    it('should replace existing corner at same point', () => {
      // Add first corner
      store.addCorner(pointId1, wallId1, wallId2)
      expect(store.corners.size).toBe(1)
      
      // Add second corner at same point
      store.addCorner(pointId1, wallId3, wallId4)
      
      expect(store.corners.size).toBe(1) // Should still be 1
      
      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId3)
      expect(corner?.wall2Id).toBe(wallId4)
    })

    it('should throw error when main wall IDs are the same', () => {
      expect(() => {
        store.addCorner(pointId1, wallId1, wallId1)
      }).toThrow('Corner main walls must be distinct, got duplicate: wall_1')
    })

    it('should throw error when wall IDs are not distinct in otherWallIds', () => {
      expect(() => {
        store.addCorner(pointId1, wallId1, wallId2, [wallId1, wallId3])
      }).toThrow('All wall IDs must be distinct in corner')
      
      expect(() => {
        store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId3])
      }).toThrow('All wall IDs must be distinct in corner')
    })
  })

  describe('removeCorner', () => {
    it('should remove an existing corner', () => {
      // Add corner first
      store.addCorner(pointId1, wallId1, wallId2)
      expect(store.corners.size).toBe(1)
      
      // Remove it
      store.removeCorner(pointId1)
      
      expect(store.corners.size).toBe(0)
      expect(store.corners.has(pointId1)).toBe(false)
    })

    it('should handle removing non-existent corner gracefully', () => {
      const initialSize = store.corners.size
      
      // Try to remove non-existent corner
      store.removeCorner(pointId1)
      
      expect(store.corners.size).toBe(initialSize)
    })
  })

  describe('updateCornerMainWalls', () => {
    it('should update main walls and rearrange IDs correctly', () => {
      // Add corner with: wall1Id: 1, wall2Id: 2, otherWallIds: [3, 4]
      store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId4])
      
      // Update with new main walls (4, 3) - should result in: wall1Id: 4, wall2Id: 3, otherWallIds: [1, 2]
      store.updateCornerMainWalls(pointId1, wallId4, wallId3)
      
      const corner = store.corners.get(pointId1)
      expect(corner).toBeDefined()
      expect(corner?.wall1Id).toBe(wallId4)
      expect(corner?.wall2Id).toBe(wallId3)
      expect(corner?.otherWallIds).toEqual([wallId1, wallId2])
    })

    it('should validate that new main walls are already connected', () => {
      // Add corner with only 2 walls
      store.addCorner(pointId1, wallId1, wallId2)
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Try to set unconnected wall as main wall
      store.updateCornerMainWalls(pointId1, wallId3, wallId4)
      
      const corner = store.corners.get(pointId1)
      
      // Should remain unchanged
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        `Cannot set main walls ${wallId3}, ${wallId4} - they must already be connected to corner at point ${pointId1}`
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle cases where one new main wall is valid', () => {
      // Add corner with: wall1Id: 1, wall2Id: 2, otherWallIds: [3]
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Try to set one connected and one unconnected wall
      store.updateCornerMainWalls(pointId1, wallId3, wallId4)
      
      const corner = store.corners.get(pointId1)
      
      // Should remain unchanged
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toEqual([wallId3])
      
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should reject duplicate main wall IDs', () => {
      // Add corner with multiple walls
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      // Try to set same wall as both main walls
      store.updateCornerMainWalls(pointId1, wallId3, wallId3)
      
      const corner = store.corners.get(pointId1)
      
      // Should remain unchanged
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toEqual([wallId3])
      
      expect(consoleSpy).toHaveBeenCalledWith(
        `Cannot set main walls - they must be distinct, got duplicate: ${wallId3}`
      )
      
      consoleSpy.mockRestore()
    })

    it('should do nothing if corner does not exist', () => {
      const initialCorners = new Map(store.corners)
      
      // Try to update non-existent corner
      store.updateCornerMainWalls(pointId1, wallId1, wallId2)
      
      expect(store.corners).toEqual(initialCorners)
    })
  })

  describe('addWallToCorner', () => {
    it('should add wall to corner otherWallIds', () => {
      // Add corner first
      store.addCorner(pointId1, wallId1, wallId2)
      
      // Add wall to corner
      store.addWallToCorner(pointId1, wallId3)
      
      const corner = store.corners.get(pointId1)
      expect(corner).toBeDefined()
      expect(corner?.otherWallIds).toEqual([wallId3])
    })

    it('should add to existing otherWallIds', () => {
      // Add corner with existing otherWallIds
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Add another wall
      store.addWallToCorner(pointId1, wallId4)
      
      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3, wallId4])
    })

    it('should not add duplicate walls', () => {
      // Add corner with existing otherWallIds
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Try to add same wall again
      store.addWallToCorner(pointId1, wallId3)
      
      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3]) // Should not duplicate
    })

    it('should not add main wall IDs to otherWallIds', () => {
      // Add corner
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Try to add main wall1Id to otherWallIds
      store.addWallToCorner(pointId1, wallId1)
      
      let corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3]) // Should remain unchanged
      
      // Try to add main wall2Id to otherWallIds
      store.addWallToCorner(pointId1, wallId2)
      
      corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId3]) // Should remain unchanged
    })

    it('should do nothing if corner does not exist', () => {
      const initialCorners = new Map(store.corners)
      
      // Try to add wall to non-existent corner
      store.addWallToCorner(pointId1, wallId3)
      
      expect(store.corners).toEqual(initialCorners)
    })
  })

  describe('removeWallFromCorner', () => {
    it('should remove wall from otherWallIds', () => {
      // Add corner with otherWallIds
      store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId4])
      
      // Remove one wall from otherWallIds
      store.removeWallFromCorner(pointId1, wallId3)
      
      const corner = store.corners.get(pointId1)
      expect(corner?.otherWallIds).toEqual([wallId4])
    })

    it('should clear otherWallIds when removing last wall from otherWallIds', () => {
      // Add corner with single otherWall
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Remove the only other wall
      store.removeWallFromCorner(pointId1, wallId3)
      
      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toBeUndefined()
    })

    it('should remove main wall and promote from otherWallIds', () => {
      // Add corner with: wall1Id: 1, wall2Id: 2, otherWallIds: [3, 4]
      store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId4])
      
      // Remove wall1 - should promote wall3 to wall1Id
      store.removeWallFromCorner(pointId1, wallId1)
      
      const corner = store.corners.get(pointId1)
      expect(corner).toBeDefined()
      expect(corner?.wall1Id).toBe(wallId3) // Promoted from otherWallIds
      expect(corner?.wall2Id).toBe(wallId2) // Unchanged
      expect(corner?.otherWallIds).toEqual([wallId4]) // Remaining other wall
    })

    it('should remove corner when removing main wall and no others exist', () => {
      // Add corner with only 2 walls
      store.addCorner(pointId1, wallId1, wallId2)
      expect(store.corners.size).toBe(1)
      
      // Remove one main wall - should remove the entire corner
      store.removeWallFromCorner(pointId1, wallId1)
      
      expect(store.corners.size).toBe(0)
      expect(store.corners.has(pointId1)).toBe(false)
    })

    it('should handle removing wall that does not exist in corner', () => {
      // Add corner
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Try to remove wall not connected to corner
      store.removeWallFromCorner(pointId1, wallId4)
      
      const corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toEqual([wallId3]) // Should be unchanged
    })

    it('should do nothing if corner does not exist', () => {
      const initialCorners = new Map(store.corners)
      
      // Try to remove wall from non-existent corner
      store.removeWallFromCorner(pointId1, wallId3)
      
      expect(store.corners).toEqual(initialCorners)
    })
  })

  describe('getCorner', () => {
    it('should return existing corner', () => {
      // Add corner first
      const addedCorner = store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      
      // Get the corner
      const corner = store.getCorner(pointId1)
      
      expect(corner).toBeDefined()
      expect(corner?.pointId).toBe(pointId1)
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId2)
      expect(corner?.otherWallIds).toEqual([wallId3])
      
      // Should be the same object
      expect(corner).toEqual(addedCorner)
    })

    it('should return null for non-existent corner', () => {
      const corner = store.getCorner(pointId1)
      expect(corner).toBeNull()
    })
  })

  describe('getAllCorners', () => {
    it('should return empty array when no corners', () => {
      const corners = store.getAllCorners()
      expect(corners).toEqual([])
    })

    it('should return all corners', () => {
      // Add multiple corners
      const corner1 = store.addCorner(pointId1, wallId1, wallId2)
      const corner2 = store.addCorner(pointId2, wallId3, wallId4, [wallId1])
      
      const corners = store.getAllCorners()
      expect(corners).toHaveLength(2)
      expect(corners).toContain(corner1)
      expect(corners).toContain(corner2)
    })
  })

  describe('complex scenarios', () => {
    it('should handle multiple main wall promotions correctly', () => {
      // Start with corner having 4 walls
      store.addCorner(pointId1, wallId1, wallId2, [wallId3, wallId4])
      
      // Remove wall2Id - should promote wall3 to wall2Id
      store.removeWallFromCorner(pointId1, wallId2)
      
      let corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId1)
      expect(corner?.wall2Id).toBe(wallId3) // Promoted
      expect(corner?.otherWallIds).toEqual([wallId4])
      
      // Remove wall1Id - should promote wall4 to wall1Id
      store.removeWallFromCorner(pointId1, wallId1)
      
      corner = store.corners.get(pointId1)
      expect(corner?.wall1Id).toBe(wallId4) // Promoted
      expect(corner?.wall2Id).toBe(wallId3)
      expect(corner?.otherWallIds).toBeUndefined()
    })

    it('should maintain state immutability when updating corners', () => {
      // Add corner
      store.addCorner(pointId1, wallId1, wallId2, [wallId3])
      const originalCorner = store.corners.get(pointId1)
      
      // Update corner - this should create a new corner object
      store.updateCornerMainWalls(pointId1, wallId3, wallId1)
      
      const updatedCorner = store.corners.get(pointId1)
      
      // The corner object itself should be different (new object)
      expect(updatedCorner).not.toBe(originalCorner)
      expect(updatedCorner?.wall1Id).toBe(wallId3)
      expect(updatedCorner?.wall2Id).toBe(wallId1)
    })
  })
})