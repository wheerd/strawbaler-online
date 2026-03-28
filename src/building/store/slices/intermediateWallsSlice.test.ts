import { describe, expect, it } from 'vitest'

import { NotFoundError } from '@/building/store/errors'

import {
  expectConsistentIntermediateWallReferences,
  expectNoOrphanedIntermediateEntities,
  setupIntermediateWallsSlice
} from './__tests__/testHelpers'

describe('intermediateWallsSlice', () => {
  describe('addInnerWallNode', () => {
    it('should create an inner wall node and return geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const result = state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)

      expect(result.type).toBe('inner')
      expect(result.position[0]).toBeCloseTo(3000, 0)
      expect(result.position[1]).toBeCloseTo(2500, 0)
      expect(result.perimeterId).toBe(perimeterId)
      expect(result.center).toBeDefined()
      expect(state.wallNodes[result.id]).toBeDefined()
      expect(state._wallNodeGeometry[result.id]).toBeDefined()
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(result.id)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.addInnerWallNode('perimeter_nonexistent' as any, { 0: 0, 1: 0 } as any)).toThrow(
        NotFoundError
      )
    })
  })

  describe('addPerimeterWallNode', () => {
    it('should create a perimeter wall node with correct offset', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const result = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      expect(result.type).toBe('perimeter')
      expect(result.wallId).toBe(wallIds[0])
      expect(result.offsetFromCornerStart).toBe(3000)
      expect(result.perimeterId).toBe(perimeterId)
      expect(state.wallNodes[result.id]).toBeDefined()
      expect(state._wallNodeGeometry[result.id]).toBeDefined()
      expect(state.perimeters[perimeterId].wallNodeIds).toContain(result.id)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.addPerimeterWallNode('perimeter_nonexistent' as any, 'outwall_test' as any, 1000)
      ).toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-existent perimeter wall', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.addPerimeterWallNode(perimeterData.perimeterId, 'outwall_nonexistent' as any, 1000)
      ).toThrow(NotFoundError)
    })
  })

  describe('addIntermediateWall', () => {
    it('should create a wall and update node connections', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      expect(wall.perimeterId).toBe(perimeterId)
      expect(wall.thickness).toBe(120)
      expect(wall.start.nodeId).toBe(nodeA.id)
      expect(wall.end.nodeId).toBe(nodeB.id)
      expect(wall.wallLength).toBeGreaterThan(0)
      expect(wall.boundary.points).toHaveLength(4)

      expect(state.intermediateWalls[wall.id]).toBeDefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
      expect(state.perimeters[perimeterId].intermediateWallIds).toContain(wall.id)
      expect(state.wallNodes[nodeA.id].connectedWallIds).toContain(wall.id)
      expect(state.wallNodes[nodeB.id].connectedWallIds).toContain(wall.id)

      expectConsistentIntermediateWallReferences(state, perimeterId)
    })

    it('should throw NotFoundError for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      const nodeId = 'wallnode_test' as any
      expect(() =>
        state.actions.addIntermediateWall(
          'perimeter_nonexistent' as any,
          { nodeId, axis: 'center' },
          { nodeId, axis: 'center' },
          120
        )
      ).toThrow(NotFoundError)
    })

    it('should throw NotFoundError for non-existent node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()

      const nodeA = state.actions.addInnerWallNode(perimeterData.perimeterId, { 0: 2000, 1: 2500 } as any)

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterData.perimeterId,
          { nodeId: nodeA.id, axis: 'center' },
          { nodeId: 'wallnode_nonexistent' as any, axis: 'center' },
          120
        )
      ).toThrow(NotFoundError)
    })

    it('should throw for thickness <= 0', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterId,
          { nodeId: nodeA.id, axis: 'center' },
          { nodeId: nodeB.id, axis: 'center' },
          0
        )
      ).toThrow('Wall thickness must be greater than 0')

      expect(() =>
        state.actions.addIntermediateWall(
          perimeterId,
          { nodeId: nodeA.id, axis: 'center' },
          { nodeId: nodeB.id, axis: 'center' },
          -50
        )
      ).toThrow('Wall thickness must be greater than 0')
    })
  })

  describe('removeIntermediateWall', () => {
    it('should remove wall and clean up orphaned nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.removeIntermediateWall(wall.id)

      expect(state.intermediateWalls[wall.id]).toBeUndefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeUndefined()
      expect(state.perimeters[perimeterId].intermediateWallIds).not.toContain(wall.id)
      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id]).toBeUndefined()
    })

    it('should remove orphaned nodes after wall removal', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.removeIntermediateWall(wall.id)

      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id]).toBeUndefined()
      expect(state._wallNodeGeometry[nodeA.id]).toBeUndefined()
      expect(state._wallNodeGeometry[nodeB.id]).toBeUndefined()
      expect(state.perimeters[perimeterId].wallNodeIds).not.toContain(nodeA.id)
      expect(state.perimeters[perimeterId].wallNodeIds).not.toContain(nodeB.id)
    })

    it('should only remove orphaned nodes, keeping nodes with other connections', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 5000, 1: 2500 } as any)
      const nodeC = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'center' },
        { nodeId: nodeC.id, axis: 'center' },
        120
      )

      state.actions.removeIntermediateWall(wall2.id)

      expect(state.wallNodes[nodeA.id]).toBeDefined()
      expect(state.wallNodes[nodeB.id]).toBeDefined()
      expect(state.wallNodes[nodeC.id]).toBeUndefined()
      expect(state.wallNodes[nodeB.id].connectedWallIds).toEqual([wall1.id])
    })

    it('should be a no-op for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => { state.actions.removeIntermediateWall('intermediate_nonexistent' as any); }).not.toThrow()
    })

    it('should recompute geometry for remaining walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 5000, 1: 2500 } as any)
      const nodeC = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'center' },
        { nodeId: nodeC.id, axis: 'center' },
        120
      )

      state.actions.removeIntermediateWall(wall2.id)

      const remainingGeo = state._intermediateWallGeometry[wall1.id]
      expect(remainingGeo).toBeDefined()
      expect(remainingGeo.wallLength).toBeCloseTo(3000, 0)
      expectNoOrphanedIntermediateEntities(state)
    })
  })

  describe('updateIntermediateWallThickness', () => {
    it('should update wall thickness and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.updateIntermediateWallThickness(wall.id, 200)

      expect(state.intermediateWalls[wall.id].thickness).toBe(200)
      const geo = state._intermediateWallGeometry[wall.id]
      expect(geo.wallLength).toBeCloseTo(6000, 0)
    })

    it('should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => { state.actions.updateIntermediateWallThickness('intermediate_nonexistent' as any, 200); }).toThrow(
        NotFoundError
      )
    })

    it('should throw for thickness <= 0', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      expect(() => { state.actions.updateIntermediateWallThickness(wall.id, 0); }).toThrow(
        'Wall thickness must be greater than 0'
      )
    })
  })

  describe('updateIntermediateWallAlignment', () => {
    it('should update wall alignment and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.updateIntermediateWallAlignment(wall.id, 'left', 'right')

      expect(state.intermediateWalls[wall.id].start.axis).toBe('left')
      expect(state.intermediateWalls[wall.id].end.axis).toBe('right')
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
    })

    it('should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        { state.actions.updateIntermediateWallAlignment('intermediate_nonexistent' as any, 'left', 'right'); }
      ).toThrow(NotFoundError)
    })
  })

  describe('splitIntermediateWallAtPoint', () => {
    it('should split wall at midpoint into two walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      const newNodeId = state.actions.splitIntermediateWallAtPoint(wall.id, { 0: 5000, 1: 2500 } as any)

      expect(state.intermediateWalls[wall.id]).toBeUndefined()
      expect(state._intermediateWallGeometry[wall.id]).toBeUndefined()

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      expect(remainingWalls).toHaveLength(2)

      const wallA = state.intermediateWalls[remainingWalls[0]]
      const wallB = state.intermediateWalls[remainingWalls[1]]
      expect(wallA).toBeDefined()
      expect(wallB).toBeDefined()

      expect(wallA.start.nodeId).toBe(nodeA.id)
      expect(wallA.end.nodeId).toBe(newNodeId)
      expect(wallB.start.nodeId).toBe(newNodeId)
      expect(wallB.end.nodeId).toBe(nodeB.id)

      expect(wallA.thickness).toBe(120)
      expect(wallB.thickness).toBe(120)

      const splitNode = state.wallNodes[newNodeId]
      expect(splitNode).toBeDefined()
      expect(splitNode.type).toBe('inner')
      expect(splitNode.connectedWallIds).toHaveLength(2)
      expect(splitNode.connectedWallIds).toContain(wallA.id)
      expect(splitNode.connectedWallIds).toContain(wallB.id)

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should preserve wallAssemblyId across split', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.intermediateWalls[wall.id].wallAssemblyId = 'iwa_test' as any

      state.actions.splitIntermediateWallAtPoint(wall.id, { 0: 5000, 1: 2500 } as any)

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      const wallA = state.intermediateWalls[remainingWalls[0]]
      const wallB = state.intermediateWalls[remainingWalls[1]]

      expect(wallA.wallAssemblyId).toBe('iwa_test')
      expect(wallB.wallAssemblyId).toBe('iwa_test')
    })

    it('should split at 1/3 point with correct proportions', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.splitIntermediateWallAtPoint(wall.id, { 0: 4000, 1: 2500 } as any)

      const remainingWalls = state.perimeters[perimeterId].intermediateWallIds.filter(id => id !== wall.id)
      const geoA = state._intermediateWallGeometry[remainingWalls[0]]
      const geoB = state._intermediateWallGeometry[remainingWalls[1]]

      expect(geoA.wallLength).toBeCloseTo(2000, -1)
      expect(geoB.wallLength).toBeCloseTo(4000, -1)
    })

    it('should throw NotFoundError for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        state.actions.splitIntermediateWallAtPoint('intermediate_nonexistent' as any, { 0: 0, 1: 0 } as any)
      ).toThrow(NotFoundError)
    })

    it('should return new node ID and add it to perimeter wallNodeIds', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      const newNodeId = state.actions.splitIntermediateWallAtPoint(wall.id, { 0: 5000, 1: 2500 } as any)

      expect(state.perimeters[perimeterId].wallNodeIds).toContain(newNodeId)
    })
  })

  describe('updateInnerWallNodePosition', () => {
    it('should update position and recompute connected wall geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.updateInnerWallNodePosition(nodeA.id, { 0: 3000, 1: 2500 } as any)

      expect((state.wallNodes[nodeA.id] as any).position[0]).toBeCloseTo(3000, 0)
      const geo = state._intermediateWallGeometry[wall.id]
      expect(geo.wallLength).toBeCloseTo(5000, 0)
    })

    it('should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() =>
        { state.actions.updateInnerWallNodePosition('wallnode_nonexistent' as any, { 0: 0, 1: 0 } as any); }
      ).toThrow(NotFoundError)
    })

    it('should throw when trying to update a perimeter node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      expect(() => { state.actions.updateInnerWallNodePosition(node.id, { 0: 0, 1: 0 } as any); }).toThrow(
        'Cannot update position of perimeter wall node'
      )
    })
  })

  describe('updatePerimeterWallNodeOffset', () => {
    it('should update offset and recompute geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const perimeterNode = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)
      const innerNode = state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: perimeterNode.id, axis: 'center' },
        { nodeId: innerNode.id, axis: 'center' },
        120
      )

      state.actions.updatePerimeterWallNodeOffset(perimeterNode.id, 5000)

      expect((state.wallNodes[perimeterNode.id] as any).offsetFromCornerStart).toBe(5000)
      expect(state._intermediateWallGeometry[wall.id]).toBeDefined()
    })

    it('should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => { state.actions.updatePerimeterWallNodeOffset('wallnode_nonexistent' as any, 1000); }).toThrow(
        NotFoundError
      )
    })

    it('should throw when trying to update an inner node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const node = state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)

      expect(() => { state.actions.updatePerimeterWallNodeOffset(node.id, 1000); }).toThrow(
        'Cannot update offset of inner wall node'
      )
    })
  })

  describe('removeWallNode', () => {
    it('should cascade delete connected walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 5000, 1: 2500 } as any)
      const nodeC = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      const wall1 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )
      const wall2 = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'center' },
        { nodeId: nodeC.id, axis: 'center' },
        120
      )

      state.actions.removeWallNode(nodeB.id)

      expect(state.wallNodes[nodeB.id]).toBeUndefined()
      expect(state.intermediateWalls[wall1.id]).toBeUndefined()
      expect(state.intermediateWalls[wall2.id]).toBeUndefined()
      expect(state.wallNodes[nodeA.id]).toBeUndefined()
      expect(state.wallNodes[nodeC.id]).toBeUndefined()
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should be a no-op for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => { state.actions.removeWallNode('wallnode_nonexistent' as any); }).not.toThrow()
    })
  })

  describe('getters', () => {
    it('getIntermediateWallById should return merged model + geometry', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      const result = state.actions.getIntermediateWallById(wall.id)

      expect(result.id).toBe(wall.id)
      expect(result.perimeterId).toBe(perimeterId)
      expect(result.thickness).toBe(120)
      expect(result.wallLength).toBeGreaterThan(0)
      expect(result.boundary.points).toHaveLength(4)
      expect(result.centerLine).toBeDefined()
    })

    it('getIntermediateWallById should throw for non-existent wall', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getIntermediateWallById('intermediate_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getAllIntermediateWalls should return all walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 5000, 1: 2500 } as any)
      const nodeC = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )
      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeB.id, axis: 'center' },
        { nodeId: nodeC.id, axis: 'center' },
        120
      )

      const allWalls = state.actions.getAllIntermediateWalls()
      expect(allWalls).toHaveLength(2)
      allWalls.forEach(w => {
        expect(w.wallLength).toBeGreaterThan(0)
        expect(w.boundary.points).toBeDefined()
      })
    })

    it('getIntermediateWallsByPerimeter should return filtered walls', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)

      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      const walls = state.actions.getIntermediateWallsByPerimeter(perimeterId)
      expect(walls).toHaveLength(1)
    })

    it('getIntermediateWallsByPerimeter should throw for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getIntermediateWallsByPerimeter('perimeter_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getWallNodeById should return merged model + geometry for inner node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const node = state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)

      const result = state.actions.getWallNodeById(node.id)

      expect(result.id).toBe(node.id)
      expect(result.type).toBe('inner')
      expect(result.position[0]).toBeCloseTo(3000, 0)
      expect(result.center).toBeDefined()
    })

    it('getWallNodeById should return merged model + geometry for perimeter node', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      const node = state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 3000)

      const result = state.actions.getWallNodeById(node.id)

      expect(result.id).toBe(node.id)
      expect(result.type).toBe('perimeter')
      expect(result.center).toBeDefined()
    })

    it('getWallNodeById should throw for non-existent node', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getWallNodeById('wallnode_nonexistent' as any)).toThrow(NotFoundError)
    })

    it('getAllWallNodes should return all nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)
      state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 5000)

      const nodes = state.actions.getAllWallNodes()
      expect(nodes).toHaveLength(2)
    })

    it('getWallNodesByPerimeter should return filtered nodes', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId, wallIds } = perimeterData

      state.actions.addInnerWallNode(perimeterId, { 0: 3000, 1: 2500 } as any)
      state.actions.addPerimeterWallNode(perimeterId, wallIds[0], 5000)

      const nodes = state.actions.getWallNodesByPerimeter(perimeterId)
      expect(nodes).toHaveLength(2)
    })

    it('getWallNodesByPerimeter should throw for non-existent perimeter', () => {
      const { state } = setupIntermediateWallsSlice()

      expect(() => state.actions.getWallNodesByPerimeter('perimeter_nonexistent' as any)).toThrow(NotFoundError)
    })
  })

  describe('reference integrity', () => {
    it('should maintain consistent references after add + remove cycle', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.removeIntermediateWall(wall.id)

      expectNoOrphanedIntermediateEntities(state)
    })

    it('should maintain consistent references after split', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      const wall = state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.splitIntermediateWallAtPoint(wall.id, { 0: 5000, 1: 2500 } as any)

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })

    it('should maintain consistent references after node position update', () => {
      const { state, perimeterData } = setupIntermediateWallsSlice()
      const { perimeterId } = perimeterData

      const nodeA = state.actions.addInnerWallNode(perimeterId, { 0: 2000, 1: 2500 } as any)
      const nodeB = state.actions.addInnerWallNode(perimeterId, { 0: 8000, 1: 2500 } as any)
      state.actions.addIntermediateWall(
        perimeterId,
        { nodeId: nodeA.id, axis: 'center' },
        { nodeId: nodeB.id, axis: 'center' },
        120
      )

      state.actions.updateInnerWallNodePosition(nodeA.id, { 0: 3000, 1: 2500 } as any)

      expectConsistentIntermediateWallReferences(state, perimeterId)
      expectNoOrphanedIntermediateEntities(state)
    })
  })
})
