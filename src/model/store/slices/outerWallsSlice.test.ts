import { describe, it, expect, beforeEach } from 'vitest'
import { createOuterWallsSlice, type OuterWallsSlice } from './outerWallsSlice'
import { createFloorId, createOuterWallId } from '@/types/ids'
import { createLength, createVec2, type Polygon2D } from '@/types/geometry'
import type { Opening } from '@/types/model'

describe('OuterWallsSlice', () => {
  let store: OuterWallsSlice
  let testFloorId: ReturnType<typeof createFloorId>
  let testBoundary: Polygon2D

  beforeEach(() => {
    const set = (updater: any) => {
      if (typeof updater === 'function') {
        Object.assign(store, updater(store))
      } else {
        Object.assign(store, updater)
      }
    }
    const get = () => store

    store = createOuterWallsSlice(set, get, {
      setState: set,
      getState: get,
      subscribe: () => () => {},
      destroy: () => {}
    } as any)

    testFloorId = createFloorId()
    testBoundary = {
      points: [createVec2(0, 0), createVec2(1000, 0), createVec2(1000, 1000), createVec2(0, 1000)]
    }
  })

  describe('addOuterWallPolygon', () => {
    it('should create an outer wall with default thickness', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')

      const walls = store.getOuterWallsByFloor(testFloorId)
      expect(walls).toHaveLength(1)

      const wall = walls[0]
      expect(wall.floorId).toBe(testFloorId)
      expect(wall.boundary).toEqual(testBoundary.points)
      expect(wall.segments).toHaveLength(4) // One segment per side

      const segment = wall.segments[0]
      expect(segment.constructionType).toBe('cells-under-tension')
      expect(segment.thickness).toBe(440) // Default thickness
      expect(segment.openings).toHaveLength(0)

      // Check geometric properties are computed
      expect(segment.insideLength).toBe(1000) // Distance from (0,0) to (1000,0)
      expect(segment.outsideLength).toBe(1000)
      expect(segment.insideLine.start).toEqual(createVec2(0, 0))
      expect(segment.insideLine.end).toEqual(createVec2(1000, 0))
      expect(segment.direction[0]).toBe(1)
      expect(segment.direction[1]).toBe(0)
      expect(segment.outsideDirection[0]).toBeCloseTo(0)
      expect(segment.outsideDirection[1]).toBeCloseTo(1) // Should be pointing "up" for horizontal segment
    })

    it('should create an outer wall with custom thickness', () => {
      const customThickness = createLength(600)

      store.addOuterWallPolygon(testFloorId, testBoundary, 'infill', customThickness)

      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]
      expect(wall.segments[0].thickness).toBe(600)
      expect(wall.segments[0].constructionType).toBe('infill')
    })

    it('should throw error for invalid boundary', () => {
      const invalidBoundary: Polygon2D = {
        points: [createVec2(0, 0), createVec2(1000, 0)] // Only 2 points
      }

      expect(() => store.addOuterWallPolygon(testFloorId, invalidBoundary, 'cells-under-tension')).toThrow(
        'Outer wall boundary must have at least 3 points'
      )
    })

    it('should throw error for zero or negative thickness', () => {
      expect(() =>
        store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', createLength(0))
      ).toThrow('Wall thickness must be greater than 0')

      expect(() =>
        store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', createLength(-100))
      ).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('removeOuterWall', () => {
    it('should remove an outer wall', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      store.removeOuterWall(wallId)

      expect(store.getOuterWallById(wallId)).toBeNull()
      expect(store.getOuterWallsByFloor(testFloorId)).toHaveLength(0)
    })
  })

  describe('updateOuterWallConstructionType', () => {
    it('should update construction type for a specific segment', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      store.updateOuterWallConstructionType(wallId, 0, 'infill')

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.constructionType).toBe('infill')

      // Other segments should remain unchanged
      const segment1 = store.getOuterWallSegment(wallId, 1)
      expect(segment1?.constructionType).toBe('cells-under-tension')
    })
  })

  describe('updateOuterWallThickness', () => {
    it('should update thickness for a specific segment', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id
      const newThickness = createLength(500)

      store.updateOuterWallThickness(wallId, 0, newThickness)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.thickness).toBe(500)

      // Check that geometry was recomputed with new thickness
      expect(segment?.outsideLine.start[0]).toBe(0)
      expect(segment?.outsideLine.start[1]).toBe(500) // Offset by new thickness
      expect(segment?.outsideLine.end[0]).toBe(1000)
      expect(segment?.outsideLine.end[1]).toBe(500)
    })

    it('should throw error for zero or negative thickness', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      expect(() => store.updateOuterWallThickness(wallId, 0, createLength(0))).toThrow(
        'Wall thickness must be greater than 0'
      )
    })
  })

  describe('opening operations', () => {
    it('should add opening to wall segment', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      const opening: Opening = {
        type: 'door',
        offsetFromStart: createLength(500),
        width: createLength(800),
        height: createLength(2100)
      }

      store.addOpeningToOuterWall(wallId, 0, opening)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.openings).toHaveLength(1)
      expect(segment?.openings[0]).toEqual(opening)
    })

    it('should remove opening from wall segment', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      const opening: Opening = {
        type: 'window',
        offsetFromStart: createLength(1000),
        width: createLength(1200),
        height: createLength(1000),
        sillHeight: createLength(900)
      }

      store.addOpeningToOuterWall(wallId, 0, opening)
      store.removeOpeningFromOuterWall(wallId, 0, 0)

      const segment = store.getOuterWallSegment(wallId, 0)
      expect(segment?.openings).toHaveLength(0)
    })

    it('should validate opening parameters', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      // Test negative offset
      const invalidOpening1: Opening = {
        type: 'door',
        offsetFromStart: createLength(-100),
        width: createLength(800),
        height: createLength(2100)
      }
      expect(() => store.addOpeningToOuterWall(wallId, 0, invalidOpening1)).toThrow(
        'Opening offset from start must be non-negative'
      )

      // Test zero width
      const invalidOpening2: Opening = {
        type: 'door',
        offsetFromStart: createLength(500),
        width: createLength(0),
        height: createLength(2100)
      }
      expect(() => store.addOpeningToOuterWall(wallId, 0, invalidOpening2)).toThrow(
        'Opening width must be greater than 0'
      )
    })
  })

  describe('geometric computation', () => {
    it('should compute correct geometry for all wall segments', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', createLength(100))
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]

      // Test each segment of the square
      const segments = wall.segments

      // Bottom wall (0,0) -> (1000,0)
      expect(segments[0].direction[0]).toBe(1)
      expect(segments[0].direction[1]).toBeCloseTo(0)
      expect(segments[0].outsideDirection[0]).toBeCloseTo(0)
      expect(segments[0].outsideDirection[1]).toBe(1)
      expect(segments[0].insideLength).toBe(1000)

      // Right wall (1000,0) -> (1000,1000)
      expect(segments[1].direction[0]).toBeCloseTo(0)
      expect(segments[1].direction[1]).toBe(1)
      expect(segments[1].outsideDirection[0]).toBe(-1)
      expect(segments[1].outsideDirection[1]).toBeCloseTo(0)
      expect(segments[1].insideLength).toBe(1000)

      // Top wall (1000,1000) -> (0,1000)
      expect(segments[2].direction[0]).toBe(-1)
      expect(segments[2].direction[1]).toBeCloseTo(0)
      expect(segments[2].outsideDirection[0]).toBeCloseTo(0)
      expect(segments[2].outsideDirection[1]).toBe(-1)
      expect(segments[2].insideLength).toBe(1000)

      // Left wall (0,1000) -> (0,0)
      expect(segments[3].direction[0]).toBeCloseTo(0)
      expect(segments[3].direction[1]).toBe(-1)
      expect(segments[3].outsideDirection[0]).toBe(1)
      expect(segments[3].outsideDirection[1]).toBeCloseTo(0)
      expect(segments[3].insideLength).toBe(1000)
    })

    it('should compute outside lines with correct offsets', () => {
      const thickness = createLength(200)
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', thickness)
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]

      // Bottom wall outside line should be offset down (positive Y)
      const bottomSegment = wall.segments[0]
      expect(bottomSegment.outsideLine.start[0]).toBe(0)
      expect(bottomSegment.outsideLine.start[1]).toBe(200)
      expect(bottomSegment.outsideLine.end[0]).toBe(1000)
      expect(bottomSegment.outsideLine.end[1]).toBe(200)

      // Right wall outside line should be offset right (negative X from inside)
      const rightSegment = wall.segments[1]
      expect(rightSegment.outsideLine.start[0]).toBe(800) // 1000 - 200
      expect(rightSegment.outsideLine.start[1]).toBe(0)
      expect(rightSegment.outsideLine.end[0]).toBe(800)
      expect(rightSegment.outsideLine.end[1]).toBe(1000)
    })
  })

  describe('getters', () => {
    it('should return null for non-existent wall', () => {
      const fakeId = createOuterWallId()
      expect(store.getOuterWallById(fakeId)).toBeNull()
    })

    it('should return null for invalid segment index', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      expect(store.getOuterWallSegment(wallId, -1)).toBeNull()
      expect(store.getOuterWallSegment(wallId, 10)).toBeNull()
    })

    it('should filter walls by floor', () => {
      const floor1Id = createFloorId()
      const floor2Id = createFloorId()

      store.addOuterWallPolygon(floor1Id, testBoundary, 'cells-under-tension')
      store.addOuterWallPolygon(floor2Id, testBoundary, 'infill')

      expect(store.getOuterWallsByFloor(floor1Id)).toHaveLength(1)
      expect(store.getOuterWallsByFloor(floor2Id)).toHaveLength(1)
      expect(store.getOuterWallsByFloor(createFloorId())).toHaveLength(0)
    })
  })

  describe('corner functionality', () => {
    it('should create corners with default belongsTo when adding outer wall', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]

      expect(wall.corners).toHaveLength(4)
      expect(wall.corners[0].belongsTo).toBe('next')
      expect(wall.corners[1].belongsTo).toBe('next')
      expect(wall.corners[2].belongsTo).toBe('next')
      expect(wall.corners[3].belongsTo).toBe('next')
    })

    it('should calculate corner outside points', () => {
      const thickness = createLength(200)
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', thickness)
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wall = walls[0]

      // Each corner should have an outside point that's not at the boundary point
      for (const corner of wall.corners) {
        expect(corner.outsidePoint).toBeDefined()
        expect(corner.outsidePoint[0]).toBeTypeOf('number')
        expect(corner.outsidePoint[1]).toBeTypeOf('number')
      }
    })

    it('should update corner belongsTo by index', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      store.updateCornerBelongsTo(wallId, 0, 'previous')
      store.updateCornerBelongsTo(wallId, 2, 'previous')

      const updatedWalls = store.getOuterWallsByFloor(testFloorId)
      const updatedWall = updatedWalls[0]

      expect(updatedWall.corners[0].belongsTo).toBe('previous')
      expect(updatedWall.corners[1].belongsTo).toBe('next')
      expect(updatedWall.corners[2].belongsTo).toBe('previous')
      expect(updatedWall.corners[3].belongsTo).toBe('next')
    })

    it('should ignore invalid corner index when updating belongsTo', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id
      const originalCorners = [...walls[0].corners]

      store.updateCornerBelongsTo(wallId, -1, 'previous')
      store.updateCornerBelongsTo(wallId, 10, 'previous')

      const unchangedWalls = store.getOuterWallsByFloor(testFloorId)
      const unchangedWall = unchangedWalls[0]

      // Corners should remain unchanged
      expect(unchangedWall.corners[0].belongsTo).toBe(originalCorners[0].belongsTo)
      expect(unchangedWall.corners[1].belongsTo).toBe(originalCorners[1].belongsTo)
      expect(unchangedWall.corners[2].belongsTo).toBe(originalCorners[2].belongsTo)
      expect(unchangedWall.corners[3].belongsTo).toBe(originalCorners[3].belongsTo)
    })

    it('should recalculate corners when thickness changes', () => {
      const initialThickness = createLength(200)
      const newThickness = createLength(400)

      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension', initialThickness)
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id
      const originalCorners = walls[0].corners.map(c => ({ ...c, outsidePoint: [...c.outsidePoint] }))

      store.updateOuterWallThickness(wallId, 0, newThickness)

      const updatedWalls = store.getOuterWallsByFloor(testFloorId)
      const updatedWall = updatedWalls[0]

      // At least one corner should have changed due to thickness change
      const cornersChanged = updatedWall.corners.some(
        (corner, index) =>
          corner.outsidePoint[0] !== originalCorners[index].outsidePoint[0] ||
          corner.outsidePoint[1] !== originalCorners[index].outsidePoint[1]
      )

      expect(cornersChanged).toBe(true)
    })

    it('should preserve belongsTo values when recalculating corners', () => {
      store.addOuterWallPolygon(testFloorId, testBoundary, 'cells-under-tension')
      const walls = store.getOuterWallsByFloor(testFloorId)
      const wallId = walls[0].id

      // Set custom belongsTo values
      store.updateCornerBelongsTo(wallId, 0, 'previous')
      store.updateCornerBelongsTo(wallId, 2, 'previous')

      // Change thickness to trigger corner recalculation
      store.updateOuterWallThickness(wallId, 0, createLength(400))

      const updatedWalls = store.getOuterWallsByFloor(testFloorId)
      const updatedWall = updatedWalls[0]

      // belongsTo values should be preserved
      expect(updatedWall.corners[0].belongsTo).toBe('previous')
      expect(updatedWall.corners[1].belongsTo).toBe('next')
      expect(updatedWall.corners[2].belongsTo).toBe('previous')
      expect(updatedWall.corners[3].belongsTo).toBe('next')
    })
  })
})
