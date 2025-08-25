import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FloorId, WallId, RoomId, PointId } from '@/types/ids'
import { createLength } from '@/types/geometry'
import { createFloorLevel } from '@/types/model'
import { createFloorsSlice, type FloorsSlice } from './floorsSlice'

// Mock Zustand following the official testing guide
vi.mock('zustand')

describe('FloorsSlice', () => {
  let store: FloorsSlice
  let floorId1: FloorId
  let wallId1: WallId
  let wallId2: WallId
  let roomId1: RoomId
  let roomId2: RoomId
  let pointId1: PointId
  let pointId2: PointId

  beforeEach(() => {
    // Create the slice directly without using create()
    const mockSet = vi.fn()
    const mockGet = vi.fn()
    const mockStore = {} as any

    store = createFloorsSlice(mockSet, mockGet, mockStore)

    // Set up test IDs
    floorId1 = 'floor_1' as FloorId
    wallId1 = 'wall_1' as WallId
    wallId2 = 'wall_2' as WallId
    roomId1 = 'room_1' as RoomId
    roomId2 = 'room_2' as RoomId
    pointId1 = 'point_1' as PointId
    pointId2 = 'point_2' as PointId

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

  describe('addFloor', () => {
    it('should add a floor with default height', () => {
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      expect(store.floors.size).toBe(1)
      expect(store.floors.has(floor.id)).toBe(true)
      
      const addedFloor = store.floors.get(floor.id)
      expect(addedFloor).toBeDefined()
      expect(addedFloor?.name).toBe('Ground Floor')
      expect(addedFloor?.level).toBe(level)
      expect(addedFloor?.height).toBe(createLength(3000)) // Default height
      expect(addedFloor?.wallIds).toEqual([])
      expect(addedFloor?.roomIds).toEqual([])
      expect(addedFloor?.pointIds).toEqual([])
      expect(addedFloor?.slabIds).toEqual([])
      expect(addedFloor?.roofIds).toEqual([])
      
      // Should return the floor
      expect(floor.name).toBe('Ground Floor')
      expect(floor.level).toBe(level)
    })

    it('should add a floor with custom height', () => {
      const level = createFloorLevel(1)
      const height = createLength(4000)
      const floor = store.addFloor('First Floor', level, height)
      
      expect(store.floors.size).toBe(1)
      
      const addedFloor = store.floors.get(floor.id)
      expect(addedFloor?.height).toBe(height)
    })

    it('should add multiple floors', () => {
      const groundLevel = createFloorLevel(0)
      const firstLevel = createFloorLevel(1)
      
      const groundFloor = store.addFloor('Ground Floor', groundLevel)
      const firstFloor = store.addFloor('First Floor', firstLevel)
      
      expect(store.floors.size).toBe(2)
      expect(store.floors.has(groundFloor.id)).toBe(true)
      expect(store.floors.has(firstFloor.id)).toBe(true)
      expect(groundFloor.id).not.toBe(firstFloor.id)
    })
  })

  describe('removeFloor', () => {
    it('should remove an existing floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      expect(store.floors.size).toBe(1)
      
      // Remove it
      store.removeFloor(floor.id)
      
      expect(store.floors.size).toBe(0)
      expect(store.floors.has(floor.id)).toBe(false)
    })

    it('should handle removing non-existent floor gracefully', () => {
      const initialSize = store.floors.size
      
      // Try to remove non-existent floor
      store.removeFloor(floorId1)
      
      expect(store.floors.size).toBe(initialSize)
    })

    it('should not affect other floors when removing one', () => {
      // Add two floors
      const groundLevel = createFloorLevel(0)
      const firstLevel = createFloorLevel(1)
      const groundFloor = store.addFloor('Ground Floor', groundLevel)
      const firstFloor = store.addFloor('First Floor', firstLevel)
      
      expect(store.floors.size).toBe(2)
      
      // Remove one
      store.removeFloor(groundFloor.id)
      
      expect(store.floors.size).toBe(1)
      expect(store.floors.has(firstFloor.id)).toBe(true)
      expect(store.floors.has(groundFloor.id)).toBe(false)
    })
  })

  describe('updateFloorName', () => {
    it('should update floor name', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Update name
      store.updateFloorName(floor.id, 'Basement')
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.name).toBe('Basement')
      expect(updatedFloor?.level).toBe(level) // Other properties unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to update non-existent floor
      store.updateFloorName(floorId1, 'New Name')
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('updateFloorLevel', () => {
    it('should update floor level', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Update level
      const newLevel = createFloorLevel(1)
      store.updateFloorLevel(floor.id, newLevel)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.level).toBe(newLevel)
      expect(updatedFloor?.name).toBe('Ground Floor') // Other properties unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to update non-existent floor
      store.updateFloorLevel(floorId1, createFloorLevel(1))
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('updateFloorHeight', () => {
    it('should update floor height', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Update height
      const newHeight = createLength(3500)
      store.updateFloorHeight(floor.id, newHeight)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.height).toBe(newHeight)
      expect(updatedFloor?.name).toBe('Ground Floor') // Other properties unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to update non-existent floor
      store.updateFloorHeight(floorId1, createLength(4000))
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('getFloorById', () => {
    it('should return existing floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const addedFloor = store.addFloor('Ground Floor', level)
      
      // Get the floor
      const floor = store.getFloorById(addedFloor.id)
      
      expect(floor).toBeDefined()
      expect(floor?.name).toBe('Ground Floor')
      expect(floor?.level).toBe(level)
      
      // Should be the same object
      expect(floor).toEqual(addedFloor)
    })

    it('should return null for non-existent floor', () => {
      const floor = store.getFloorById(floorId1)
      expect(floor).toBeNull()
    })
  })

  describe('getFloorsOrderedByLevel', () => {
    it('should return empty array when no floors', () => {
      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toEqual([])
    })

    it('should return single floor', () => {
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toHaveLength(1)
      expect(floors[0]).toEqual(floor)
    })

    it('should return floors ordered by level ascending', () => {
      // Add floors in random order
      const floor2 = store.addFloor('Second Floor', createFloorLevel(2))
      const floor0 = store.addFloor('Ground Floor', createFloorLevel(0))
      const floor1 = store.addFloor('First Floor', createFloorLevel(1))
      const basementFloor = store.addFloor('Basement', createFloorLevel(-1))
      
      const floors = store.getFloorsOrderedByLevel()
      expect(floors).toHaveLength(4)
      
      // Should be ordered by level
      expect(floors[0].level).toBe(createFloorLevel(-1))
      expect(floors[1].level).toBe(createFloorLevel(0))
      expect(floors[2].level).toBe(createFloorLevel(1))
      expect(floors[3].level).toBe(createFloorLevel(2))
      
      expect(floors[0]).toEqual(basementFloor)
      expect(floors[1]).toEqual(floor0)
      expect(floors[2]).toEqual(floor1)
      expect(floors[3]).toEqual(floor2)
    })
  })

  describe('addWallToFloor', () => {
    it('should add wall to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add wall to floor
      store.addWallToFloor(floor.id, wallId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.wallIds).toEqual([wallId1])
    })

    it('should add multiple walls to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add walls to floor
      store.addWallToFloor(floor.id, wallId1)
      store.addWallToFloor(floor.id, wallId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.wallIds).toEqual([wallId1, wallId2])
    })

    it('should not add duplicate walls', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add same wall twice
      store.addWallToFloor(floor.id, wallId1)
      store.addWallToFloor(floor.id, wallId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.wallIds).toEqual([wallId1]) // Should not duplicate
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to add wall to non-existent floor
      store.addWallToFloor(floorId1, wallId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('removeWallFromFloor', () => {
    it('should remove wall from floor', () => {
      // Add floor and wall first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addWallToFloor(floor.id, wallId1)
      store.addWallToFloor(floor.id, wallId2)
      
      // Remove one wall
      store.removeWallFromFloor(floor.id, wallId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.wallIds).toEqual([wallId2])
    })

    it('should handle removing non-existent wall gracefully', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addWallToFloor(floor.id, wallId1)
      
      // Try to remove wall that's not on the floor
      store.removeWallFromFloor(floor.id, wallId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.wallIds).toEqual([wallId1]) // Should be unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to remove wall from non-existent floor
      store.removeWallFromFloor(floorId1, wallId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('addRoomToFloor', () => {
    it('should add room to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add room to floor
      store.addRoomToFloor(floor.id, roomId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.roomIds).toEqual([roomId1])
    })

    it('should add multiple rooms to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add rooms to floor
      store.addRoomToFloor(floor.id, roomId1)
      store.addRoomToFloor(floor.id, roomId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.roomIds).toEqual([roomId1, roomId2])
    })

    it('should not add duplicate rooms', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add same room twice
      store.addRoomToFloor(floor.id, roomId1)
      store.addRoomToFloor(floor.id, roomId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.roomIds).toEqual([roomId1]) // Should not duplicate
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to add room to non-existent floor
      store.addRoomToFloor(floorId1, roomId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('removeRoomFromFloor', () => {
    it('should remove room from floor', () => {
      // Add floor and rooms first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addRoomToFloor(floor.id, roomId1)
      store.addRoomToFloor(floor.id, roomId2)
      
      // Remove one room
      store.removeRoomFromFloor(floor.id, roomId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.roomIds).toEqual([roomId2])
    })

    it('should handle removing non-existent room gracefully', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addRoomToFloor(floor.id, roomId1)
      
      // Try to remove room that's not on the floor
      store.removeRoomFromFloor(floor.id, roomId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.roomIds).toEqual([roomId1]) // Should be unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to remove room from non-existent floor
      store.removeRoomFromFloor(floorId1, roomId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('addPointToFloor', () => {
    it('should add point to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add point to floor
      store.addPointToFloor(floor.id, pointId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.pointIds).toEqual([pointId1])
    })

    it('should add multiple points to floor', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add points to floor
      store.addPointToFloor(floor.id, pointId1)
      store.addPointToFloor(floor.id, pointId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.pointIds).toEqual([pointId1, pointId2])
    })

    it('should not add duplicate points', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      
      // Add same point twice
      store.addPointToFloor(floor.id, pointId1)
      store.addPointToFloor(floor.id, pointId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.pointIds).toEqual([pointId1]) // Should not duplicate
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to add point to non-existent floor
      store.addPointToFloor(floorId1, pointId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('removePointFromFloor', () => {
    it('should remove point from floor', () => {
      // Add floor and points first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addPointToFloor(floor.id, pointId1)
      store.addPointToFloor(floor.id, pointId2)
      
      // Remove one point
      store.removePointFromFloor(floor.id, pointId1)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.pointIds).toEqual([pointId2])
    })

    it('should handle removing non-existent point gracefully', () => {
      // Add floor first
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      store.addPointToFloor(floor.id, pointId1)
      
      // Try to remove point that's not on the floor
      store.removePointFromFloor(floor.id, pointId2)
      
      const updatedFloor = store.floors.get(floor.id)
      expect(updatedFloor?.pointIds).toEqual([pointId1]) // Should be unchanged
    })

    it('should do nothing if floor does not exist', () => {
      const initialFloors = new Map(store.floors)
      
      // Try to remove point from non-existent floor
      store.removePointFromFloor(floorId1, pointId1)
      
      expect(store.floors).toEqual(initialFloors)
    })
  })

  describe('complex scenarios', () => {
    it('should handle complex floor management correctly', () => {
      // Create multiple floors
      const floor1 = store.addFloor('Ground Floor', createFloorLevel(0))
      const floor2 = store.addFloor('First Floor', createFloorLevel(1))
      
      // Add entities to floors
      store.addWallToFloor(floor1.id, wallId1)
      store.addWallToFloor(floor2.id, wallId2)
      store.addRoomToFloor(floor1.id, roomId1)
      store.addPointToFloor(floor1.id, pointId1)
      
      // Verify floor 1
      let updatedFloor1 = store.floors.get(floor1.id)
      expect(updatedFloor1?.wallIds).toEqual([wallId1])
      expect(updatedFloor1?.roomIds).toEqual([roomId1])
      expect(updatedFloor1?.pointIds).toEqual([pointId1])
      
      // Verify floor 2
      let updatedFloor2 = store.floors.get(floor2.id)
      expect(updatedFloor2?.wallIds).toEqual([wallId2])
      expect(updatedFloor2?.roomIds).toEqual([])
      expect(updatedFloor2?.pointIds).toEqual([])
      
      // Update floor properties
      store.updateFloorName(floor1.id, 'Main Floor')
      store.updateFloorHeight(floor2.id, createLength(3500))
      
      updatedFloor1 = store.floors.get(floor1.id)
      updatedFloor2 = store.floors.get(floor2.id)
      
      expect(updatedFloor1?.name).toBe('Main Floor')
      expect(updatedFloor2?.height).toBe(createLength(3500))
      
      // Verify ordering
      const orderedFloors = store.getFloorsOrderedByLevel()
      expect(orderedFloors[0]).toEqual(updatedFloor1) // Level 0
      expect(orderedFloors[1]).toEqual(updatedFloor2) // Level 1
    })

    it('should maintain state immutability when updating floors', () => {
      // Add floor
      const level = createFloorLevel(0)
      const floor = store.addFloor('Ground Floor', level)
      const originalFloor = store.floors.get(floor.id)
      
      // Update floor - this should create a new floor object
      store.updateFloorName(floor.id, 'Updated Floor')
      
      const updatedFloor = store.floors.get(floor.id)
      
      // The floor object itself should be different (new object)
      expect(updatedFloor).not.toBe(originalFloor)
      expect(updatedFloor?.name).toBe('Updated Floor')
      expect(originalFloor?.name).toBe('Ground Floor') // Original unchanged
    })
  })
})