import { describe, expect, it } from 'vitest'

import { createIntermediateWallId, createWallNodeId } from '@/building/model/ids'
import { computeWallLines, updateAllWallNodeGeometry } from '@/building/store/slices/intermediateWallGeometry'
import { distVec2, dotVec2, newVec2, perpendicularCCW } from '@/shared/geometry'

import { setupIntermediateWallsSlice } from './__tests__/testHelpers'

describe('intermediateWallGeometry', () => {
  describe('computeWallLines', () => {
    const start = newVec2(0, 0)
    const end = newVec2(1000, 0)
    const thickness = 100

    describe('same axis alignment (startAxis === endAxis)', () => {
      it('should create parallel left/right lines for center/center on horizontal segment', () => {
        const result = computeWallLines(start, 'center', end, 'center', thickness)

        expect(result.left.direction).toEqual(newVec2(1, 0))
        expect(result.right.direction).toEqual(newVec2(1, 0))

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(leftPerpDir, result.right.point) - dotVec2(leftPerpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should create parallel left/right lines for center/center on vertical segment', () => {
        const vStart = newVec2(0, 0)
        const vEnd = newVec2(0, 1000)

        const result = computeWallLines(vStart, 'center', vEnd, 'center', thickness)

        expect(result.left.direction).toEqual(newVec2(0, 1))
        expect(result.right.direction).toEqual(newVec2(0, 1))

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(leftPerpDir, result.right.point) - dotVec2(leftPerpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should place left line through start point for left/left', () => {
        const result = computeWallLines(start, 'left', end, 'left', thickness)

        expect(result.left.point).toEqual(start)
      })

      it('should place right line through start point for right/right', () => {
        const result = computeWallLines(start, 'right', end, 'right', thickness)

        expect(result.right.point).toEqual(start)
      })

      it('should offset left and right equally for center/center', () => {
        const result = computeWallLines(start, 'center', end, 'center', thickness)

        const midX = (start[0] + end[0]) / 2
        const midY = (start[1] + end[1]) / 2
        const midPoint = newVec2(midX, midY)

        const leftPerpDist = dotVec2(perpendicularCCW(result.left.direction), result.left.point)
        const rightPerpDist = dotVec2(perpendicularCCW(result.right.direction), result.right.point)

        const centerPerpDist = dotVec2(perpendicularCCW(result.left.direction), midPoint)

        expect(leftPerpDist).toBeCloseTo(centerPerpDist + thickness / 2, 1)
        expect(rightPerpDist).toBeCloseTo(centerPerpDist - thickness / 2, 1)
      })

      it('should work correctly on a diagonal segment (45 degrees)', () => {
        const dStart = newVec2(0, 0)
        const dEnd = newVec2(1000, 1000)

        const result = computeWallLines(dStart, 'center', dEnd, 'center', thickness)

        const dir = result.left.direction
        const expectedDirLen = Math.sqrt(2)
        expect(dir[0]).toBeCloseTo(1 / expectedDirLen, 5)
        expect(dir[1]).toBeCloseTo(1 / expectedDirLen, 5)

        const perpDir = perpendicularCCW(dir)
        const distance = Math.abs(dotVec2(perpDir, result.right.point) - dotVec2(perpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })

      it('should have left/right distance equal to thickness for center/center', () => {
        const result = computeWallLines(start, 'center', end, 'center', thickness)

        const perpDir = perpendicularCCW(result.left.direction)
        const distance = Math.abs(dotVec2(perpDir, result.right.point) - dotVec2(perpDir, result.left.point))
        expect(distance).toBeCloseTo(thickness, 1)
      })
    })

    describe('different axis alignment (startAxis !== endAxis)', () => {
      it('should use start point as left base for left/right', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        expect(result.left.point).toEqual(start)
      })

      it('should offset right base by -thickness from left for left/right', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        const leftPerpDir = perpendicularCCW(result.left.direction)
        const leftDist = dotVec2(leftPerpDir, result.left.point)
        const rightDist = dotVec2(leftPerpDir, result.right.point)
        expect(Math.abs(leftDist - rightDist)).toBeCloseTo(thickness, 1)
      })

      it('should have parallel left/right line directions', () => {
        const result = computeWallLines(start, 'left', end, 'right', thickness)

        const cross =
          result.left.direction[0] * result.right.direction[1] - result.left.direction[1] * result.right.direction[0]
        expect(Math.abs(cross)).toBeLessThan(1e-10)
      })

      it('should throw when thickness exceeds distance between points', () => {
        const closeStart = newVec2(0, 0)
        const closeEnd = newVec2(99, 0)

        expect(() => computeWallLines(closeStart, 'left', closeEnd, 'right', 100)).toThrow(
          'Wall thickness larger than distance between points'
        )
      })

      it('should succeed when thickness is just under distance', () => {
        const closeStart = newVec2(0, 0)
        const closeEnd = newVec2(100, 0)

        expect(() => computeWallLines(closeStart, 'left', closeEnd, 'right', 99.9)).not.toThrow()
      })
    })
  })

  describe('updateAllWallNodeGeometry', () => {
    it('should compute geometry for a single wall between two inner nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'center' },
        end: { nodeId: nodeBId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const wallGeometry = state._intermediateWallGeometry[wallId]
      expect(wallGeometry).toBeDefined()
      expect(wallGeometry.wallLength).toBeCloseTo(6000, 0)
      expect(wallGeometry.boundary.points).toHaveLength(4)
      expect(wallGeometry.centerLine.start).toBeDefined()
      expect(wallGeometry.centerLine.end).toBeDefined()

      const centerLen = distVec2(wallGeometry.centerLine.start, wallGeometry.centerLine.end)
      expect(centerLen).toBeCloseTo(6000, 0)
      expect(centerLen).toBeCloseTo(wallGeometry.wallLength, 0)
    })

    it('should compute node geometry for wall end node (1 connected wall)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'center' },
        end: { nodeId: nodeBId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeAGeometry = state._wallNodeGeometry[nodeAId]
      expect(nodeAGeometry).toBeDefined()
      expect(nodeAGeometry.boundary).toBeUndefined()

      const nodeBGeometry = state._wallNodeGeometry[nodeBId]
      expect(nodeBGeometry).toBeDefined()
      expect(nodeBGeometry.boundary).toBeUndefined()
    })

    it('should compute node boundary with 4 points for simple 90-degree corner (2 walls)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeId = createWallNodeId()
      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallAId = createIntermediateWallId()
      const wallBId = createIntermediateWallId()

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 2500),
        connectedWallIds: [wallAId, wallBId]
      }
      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallAId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 4500),
        connectedWallIds: [wallBId]
      }
      state.intermediateWalls[wallAId] = {
        id: wallAId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'center' },
        end: { nodeId, axis: 'center' },
        thickness: 120
      }
      state.intermediateWalls[wallBId] = {
        id: wallBId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'center' },
        end: { nodeId: nodeBId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallAId, wallBId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.boundary?.points).toHaveLength(4)
    })

    it('should handle colinear walls meeting at a node (180-degree junction)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeId = createWallNodeId()
      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallAId = createIntermediateWallId()
      const wallBId = createIntermediateWallId()

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(5000, 2500),
        connectedWallIds: [wallAId, wallBId]
      }
      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallAId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallBId]
      }
      state.intermediateWalls[wallAId] = {
        id: wallAId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'center' },
        end: { nodeId, axis: 'center' },
        thickness: 120
      }
      state.intermediateWalls[wallBId] = {
        id: wallBId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'center' },
        end: { nodeId: nodeBId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallAId, wallBId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.boundary?.points).toHaveLength(4)

      const wallAGeometry = state._intermediateWallGeometry[wallAId]
      const wallBGeometry = state._intermediateWallGeometry[wallBId]
      expect(wallAGeometry).toBeDefined()
      expect(wallBGeometry).toBeDefined()
      expect(wallAGeometry.wallLength + wallBGeometry.wallLength).toBeCloseTo(6000, 0)
    })

    it('should compute position for perimeter wall node from offset', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const nodeId = createWallNodeId()
      const innerNodeId = createWallNodeId()
      const wallId = createIntermediateWallId()
      const offset = 3000

      state.wallNodes[nodeId] = {
        id: nodeId,
        perimeterId,
        type: 'perimeter',
        wallId: wallIds[0],
        offsetFromCornerStart: offset,
        connectedWallIds: [wallId]
      }
      state.wallNodes[innerNodeId] = {
        id: innerNodeId,
        perimeterId,
        type: 'inner',
        position: newVec2(3000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId, axis: 'center' },
        end: { nodeId: innerNodeId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeId, innerNodeId)

      updateAllWallNodeGeometry(state, perimeterId)

      const nodeGeometry = state._wallNodeGeometry[nodeId]
      expect(nodeGeometry).toBeDefined()
      expect(nodeGeometry.center[0]).toBeCloseTo(3000, 0)
      expect(nodeGeometry.center[1]).toBeCloseTo(-210, 0)
    })

    it('should return early for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => {
        updateAllWallNodeGeometry(state, 'perimeter_nonexistent' as any)
      }).not.toThrow()
    })

    it('should return without error for empty perimeter (no walls/nodes)', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      state.perimeters[perimeterData.perimeterId].intermediateWallIds = []
      state.perimeters[perimeterData.perimeterId].wallNodeIds = []

      expect(() => {
        updateAllWallNodeGeometry(state, perimeterData.perimeterId)
      }).not.toThrow()
    })

    it('should have centerLine between leftLine and rightLine for center/center wall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeAId = createWallNodeId()
      const nodeBId = createWallNodeId()
      const wallId = createIntermediateWallId()

      state.wallNodes[nodeAId] = {
        id: nodeAId,
        perimeterId,
        type: 'inner',
        position: newVec2(2000, 2500),
        connectedWallIds: [wallId]
      }
      state.wallNodes[nodeBId] = {
        id: nodeBId,
        perimeterId,
        type: 'inner',
        position: newVec2(8000, 2500),
        connectedWallIds: [wallId]
      }
      state.intermediateWalls[wallId] = {
        id: wallId,
        perimeterId,
        entityIds: [],
        start: { nodeId: nodeAId, axis: 'center' },
        end: { nodeId: nodeBId, axis: 'center' },
        thickness: 120
      }
      state.perimeters[perimeterId].intermediateWallIds.push(wallId)
      state.perimeters[perimeterId].wallNodeIds.push(nodeAId, nodeBId)

      updateAllWallNodeGeometry(state, perimeterId)

      const geo = state._intermediateWallGeometry[wallId]
      expect(geo).toBeDefined()

      const perpDir = perpendicularCCW(geo.direction)

      const centerStartPerp = dotVec2(perpDir, geo.centerLine.start)
      const leftStartPerp = dotVec2(perpDir, geo.leftLine.start)
      const rightStartPerp = dotVec2(perpDir, geo.rightLine.start)

      expect(centerStartPerp).toBeGreaterThan(Math.min(leftStartPerp, rightStartPerp))
      expect(centerStartPerp).toBeLessThan(Math.max(leftStartPerp, rightStartPerp))
    })
  })
})
