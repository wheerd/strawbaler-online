import { describe, it, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  createPoint,
  createWall,
  findSnapPoint,
  generateSnapLines,
  findIntersectionSnapPositions
} from '@/model/operations'
import { createPoint2D, createLength, lineIntersection } from '@/types/geometry'

describe('Intersection Snapping', () => {
  it('should calculate line intersection correctly', () => {
    const line1 = {
      point: createPoint2D(0, 0),
      direction: createPoint2D(1, 0) // Horizontal line through origin
    }

    const line2 = {
      point: createPoint2D(0, 0),
      direction: createPoint2D(0, 1) // Vertical line through origin
    }

    const intersection = lineIntersection(line1, line2)
    expect(intersection).toEqual(createPoint2D(0, 0))
  })

  it('should detect parallel lines and return null', () => {
    const line1 = {
      point: createPoint2D(0, 0),
      direction: createPoint2D(1, 0) // Horizontal line
    }

    const line2 = {
      point: createPoint2D(0, 1),
      direction: createPoint2D(1, 0) // Parallel horizontal line
    }

    const intersection = lineIntersection(line1, line2)
    expect(intersection).toBeNull()
  })

  it('should find intersection between perpendicular snap lines', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    // Create a simple L-shape with two perpendicular walls
    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(1000, 0))
    const point3 = createPoint(createPoint2D(1000, 1000))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)
    updatedState = addPointToFloor(updatedState, point3, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200))
    const wall2 = createWall(point2.id, point3.id, createLength(2500), createLength(2500), createLength(200))

    updatedState = addWallToFloor(updatedState, wall1, floorId)
    updatedState = addWallToFloor(updatedState, wall2, floorId)

    // Test from the corner point
    const startPoint = createPoint2D(1000, 1000) // From corner

    // Generate snap lines - should include horizontal and vertical lines through points
    const snapLines = generateSnapLines(updatedState, startPoint, floorId, false)

    // Target a point that should be near an intersection
    const targetPoint = createPoint2D(100, 100) // Should be close to intersection at (0, 0)

    const intersectionSnaps = findIntersectionSnapPositions(targetPoint, startPoint, snapLines)

    expect(intersectionSnaps.length).toBeGreaterThan(0)
  })

  it('should return intersection result when target is far from existing points', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    // Create two separate walls
    const point1 = createPoint(createPoint2D(0, 500))
    const point2 = createPoint(createPoint2D(1000, 500))
    const point3 = createPoint(createPoint2D(500, 0))
    const point4 = createPoint(createPoint2D(500, 1000))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)
    updatedState = addPointToFloor(updatedState, point3, floorId)
    updatedState = addPointToFloor(updatedState, point4, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200)) // Horizontal at y=500
    const wall2 = createWall(point3.id, point4.id, createLength(2500), createLength(2500), createLength(200)) // Vertical at x=500

    updatedState = addWallToFloor(updatedState, wall1, floorId)
    updatedState = addWallToFloor(updatedState, wall2, floorId)

    // Start from far away from existing walls
    const startPoint = createPoint2D(2000, 2000)

    // Target very close to intersection at (500, 500) where the two walls cross
    // but far from the existing endpoints
    const targetPoint = createPoint2D(520, 520) // Close to intersection at (500, 500)

    const snapResult = findSnapPoint(updatedState, targetPoint, startPoint, floorId, false)

    expect(snapResult).toBeDefined()
    expect(snapResult?.snapType).toBe('intersection')
    expect(snapResult?.intersectionLines).toBeDefined()
    expect(snapResult?.intersectionLines).toHaveLength(2)
  })

  it('should respect minimum wall length for intersection snapping', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(1000, 0))

    let updatedState = addPointToFloor(state, point1, floorId)
    updatedState = addPointToFloor(updatedState, point2, floorId)

    const wall1 = createWall(point1.id, point2.id, createLength(2500), createLength(2500), createLength(200))
    updatedState = addWallToFloor(updatedState, wall1, floorId)

    // Start point very close to an intersection point (should be rejected due to min wall length)
    const startPoint = createPoint2D(10, 0)
    const targetPoint = createPoint2D(20, 20) // Very close to start point

    const snapResult = findSnapPoint(updatedState, targetPoint, startPoint, floorId, false)

    // Should not snap to intersection because it would create a wall shorter than minimum length
    expect(snapResult?.snapType).not.toBe('intersection')
  })

  it('should generate snap lines with proper Line2D geometry', () => {
    const state = createEmptyModelState()
    const floorId = Array.from(state.floors.keys())[0]

    const point1 = createPoint(createPoint2D(500, 500))
    const updatedState = addPointToFloor(state, point1, floorId)

    const snapLines = generateSnapLines(updatedState, createPoint2D(100, 100), floorId, true)

    expect(snapLines.length).toBeGreaterThan(0)

    // Check that each snap line has a valid Line2D representation
    for (const snapLine of snapLines) {
      expect(snapLine.line2D).toBeDefined()
      expect(snapLine.line2D.point).toBeDefined()
      expect(snapLine.line2D.direction).toBeDefined()

      // Direction should be normalized (length close to 1)
      const dirLength = Math.sqrt(
        snapLine.line2D.direction.x * snapLine.line2D.direction.x +
        snapLine.line2D.direction.y * snapLine.line2D.direction.y
      )
      expect(dirLength).toBeCloseTo(1, 5)
    }
  })
})
