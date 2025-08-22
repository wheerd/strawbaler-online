import { describe, test, expect } from 'vitest'
import {
  createEmptyModelState,
  addPointToFloor,
  addWallToFloor,
  createPoint,
  createWall,
  findSnapPoint,
  generateSnapLines,
  SNAP_CONFIG
} from '@/model/operations'
import { createPoint2D, createLength } from '@/types/geometry'

describe('Snapping System Improvements', () => {
  test('should only consider points on active floor for point snapping', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add point on ground floor
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test point snapping within range on active floor
    const target = createPoint2D(120, 100) // 20mm away
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).toBeDefined()
    expect(snapResult?.position).toEqual(point1.position)
  })

  test('should only generate extension/perpendicular lines for walls connected to start point', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Create two points
    const point1 = createPoint(createPoint2D(0, 0))
    const point2 = createPoint(createPoint2D(100, 0))
    const point3 = createPoint(createPoint2D(200, 100))

    let newState = addPointToFloor(state, point1, groundFloorId)
    newState = addPointToFloor(newState, point2, groundFloorId)
    newState = addPointToFloor(newState, point3, groundFloorId)

    // Create wall between point1 and point2
    const wall = createWall(
      point1.id,
      point2.id,
      createLength(3000),
      createLength(3000),
      createLength(200)
    )
    newState = addWallToFloor(newState, wall, groundFloorId)

    // Generate snap lines from point1 (connected to wall)
    const fromPoint1 = point1.position
    const snapLinesFromPoint1 = generateSnapLines(newState, fromPoint1, groundFloorId, false)

    // Should include extension and perpendicular lines since point1 is connected to wall
    const extensionLines = snapLinesFromPoint1.filter(line => line.type === 'extension')
    const perpendicularLines = snapLinesFromPoint1.filter(line => line.type === 'perpendicular')
    expect(extensionLines.length).toBeGreaterThan(0)
    expect(perpendicularLines.length).toBeGreaterThan(0)

    // Generate snap lines from point3 (NOT connected to wall)
    const fromPoint3 = point3.position
    const snapLinesFromPoint3 = generateSnapLines(newState, fromPoint3, groundFloorId, false)

    // Should NOT include extension and perpendicular lines since point3 is not connected to any wall
    const extensionLinesFromPoint3 = snapLinesFromPoint3.filter(line => line.type === 'extension')
    const perpendicularLinesFromPoint3 = snapLinesFromPoint3.filter(line => line.type === 'perpendicular')
    expect(extensionLinesFromPoint3).toHaveLength(0)
    expect(perpendicularLinesFromPoint3).toHaveLength(0)
  })

  test('should use squared distances for performance', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test with target just outside point snap distance
    const snapDistanceValue = Number(SNAP_CONFIG.pointSnapDistance)
    const target = createPoint2D(100 + snapDistanceValue + 1, 100) // Just outside point snap range
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    // Should not do point snapping (would be line snapping if anything), so no direct position match
    expect(snapResult?.position).not.toEqual(point1.position)

    // Test with target just inside snap distance - should snap directly to point
    const targetInside = createPoint2D(100 + snapDistanceValue - 1, 100) // Just inside range
    const snapResultInside = findSnapPoint(stateWithPoint, targetInside, fromPoint, groundFloorId, false)
    expect(snapResultInside).toBeDefined() // Should snap
    expect(snapResultInside?.position).toEqual(point1.position) // Should snap to exact point
  })

  test('should prevent snapping end point to start point', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point that will be the start point
    const startPoint = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, startPoint, groundFloorId)

    // Try to snap to the same position (end point snapping to start point)
    const target = createPoint2D(101, 100) // Very close to start point
    const fromPoint = startPoint.position

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).toBeNull() // Should not snap to itself
  })

  test('should work with complete findSnapPoint function', () => {
    const state = createEmptyModelState()
    const groundFloorId = Array.from(state.floors.keys())[0]

    // Add a point
    const point1 = createPoint(createPoint2D(100, 100))
    const stateWithPoint = addPointToFloor(state, point1, groundFloorId)

    // Test point snapping (should have priority)
    const target = createPoint2D(120, 100) // Close to point1
    const fromPoint = createPoint2D(0, 0)

    const snapResult = findSnapPoint(stateWithPoint, target, fromPoint, groundFloorId, false)
    expect(snapResult).not.toBeNull()
    // Point snapping should result in no lines array (direct point snap)
    expect(snapResult!.lines).toBeUndefined()
    expect(snapResult!.position).toEqual(point1.position)
  })
})
