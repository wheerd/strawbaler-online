import { describe, it, expect } from 'vitest'
import { calculateWallCornerInfo, calculateWallConstructionLength } from './corners'
import { createVec2, type Length } from '@/types/geometry'
import type { PerimeterWall, PerimeterCorner, Perimeter } from '@/model'
import { createPerimeterWallId, createPerimeterId } from '@/types/ids'

// Mock data helpers
function createMockWall(wallLength: Length, thickness: Length): PerimeterWall {
  const startPoint = createVec2(0, 0)
  const endPoint = createVec2(wallLength, 0)

  return {
    id: createPerimeterWallId(),
    constructionType: 'infill',
    thickness,
    wallLength,
    insideLength: wallLength,
    outsideLength: (wallLength + thickness * 2) as Length, // Simple assumption for test
    openings: [],
    insideLine: {
      start: startPoint,
      end: endPoint
    },
    outsideLine: {
      start: createVec2(0, thickness),
      end: createVec2(wallLength, thickness)
    },
    direction: createVec2(1, 0),
    outsideDirection: createVec2(0, 1)
  }
}

function createMockCorner(id: string, outsidePoint: [number, number], belongsTo: 'previous' | 'next'): PerimeterCorner {
  return {
    id: id as any,
    outsidePoint: createVec2(outsidePoint[0], outsidePoint[1]),
    belongsTo
  }
}

function createMockPerimeter(walls: PerimeterWall[], corners: PerimeterCorner[]): Perimeter {
  return {
    id: createPerimeterId(),
    storeyId: 'test-storey' as any,
    boundary: [],
    walls,
    corners
  }
}

describe('Corner Calculations', () => {
  const wallLength = 3000 as Length
  const thickness = 300 as Length
  const wallHeight = 2400 as Length

  describe('calculateWallCornerInfo', () => {
    it('should calculate corner info with proper corner assignment', () => {
      // Create a simple rectangular perimeter with 4 walls and 4 corners
      const wall0 = createMockWall(wallLength, thickness) // bottom wall
      const wall1 = createMockWall(wallLength, thickness) // right wall
      const wall2 = createMockWall(wallLength, thickness) // top wall
      const wall3 = createMockWall(wallLength, thickness) // left wall

      // Create corners - for wall[i], corner[i] is start and corner[i+1] is end
      const corner0 = createMockCorner('corner-0', [-150, 450], 'next') // start of wall0, belongs to wall0
      const corner1 = createMockCorner('corner-1', [3150, 450], 'previous') // end of wall0, belongs to wall0
      const corner2 = createMockCorner('corner-2', [3150, 3450], 'next') // start of wall2, belongs to wall2
      const corner3 = createMockCorner('corner-3', [-150, 3450], 'previous') // end of wall3, belongs to wall3

      const walls = [wall0, wall1, wall2, wall3]
      const corners = [corner0, corner1, corner2, corner3]
      const perimeter = createMockPerimeter(walls, corners)

      // Test wall0 - should have corner0 as start (belongs to wall0 = 'next') and corner1 as end (belongs to wall0 = 'previous')
      const result = calculateWallCornerInfo(wall0, perimeter, wallHeight)

      expect(result.startCorner).toBeDefined()
      expect(result.endCorner).toBeDefined()

      expect(result.startCorner?.belongsToThisWall).toBe(true) // corner0 belongs to wall0
      expect(result.endCorner?.belongsToThisWall).toBe(true) // corner1 belongs to wall0
    })
  })

  describe('calculateWallConstructionLength', () => {
    it('should calculate construction length including assigned corners', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [-150, 450], 'next')
      const endCorner = createMockCorner('end-corner', [3150, 450], 'previous')

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should be base length + extensions from both corners
      expect(result.constructionLength).toBeGreaterThan(wallLength)
      expect(result.startExtension).toBeGreaterThan(0)
      expect(result.endExtension).toBeGreaterThan(0)
    })

    it('should not include extensions for corners that do not belong to this wall', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [-150, 450], 'previous') // not this wall's
      const endCorner = createMockCorner('end-corner', [3150, 450], 'next') // not this wall's

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should be just the base wall length
      expect(result.constructionLength).toBe(wallLength)
      expect(result.startExtension).toBe(0)
      expect(result.endExtension).toBe(0)
    })

    it('should handle mixed corner ownership', () => {
      const wall = createMockWall(wallLength, thickness)

      const startCorner = createMockCorner('start-corner', [-150, 450], 'next') // this wall's
      const endCorner = createMockCorner('end-corner', [3150, 450], 'next') // not this wall's

      const result = calculateWallConstructionLength(wall, startCorner, endCorner)

      // Should include only start extension
      expect(result.constructionLength).toBeGreaterThan(wallLength)
      expect(result.startExtension).toBeGreaterThan(0)
      expect(result.endExtension).toBe(0)
    })
  })
})
