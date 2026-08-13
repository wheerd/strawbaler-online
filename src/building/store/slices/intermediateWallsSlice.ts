import type { StateCreator } from 'zustand'

import type {
  InnerWallNodeGeometry,
  InnerWallNodeWithGeometry,
  IntermediateWall,
  IntermediateWallGeometry,
  IntermediateWallWithGeometry,
  PerimeterWallNodeGeometry,
  PerimeterWallNodeWithGeometry,
  WallAttachment,
  WallAxis,
  WallNode,
  WallNodeGeometry,
  WallNodeWithGeometry
} from '@/building/model'
import type { IntermediateWallId, PerimeterId, PerimeterWallId, WallEntityId, WallNodeId } from '@/building/model/ids'
import { createIntermediateWallId, createWallNodeId, isOpeningId } from '@/building/model/ids'
import { InvalidOperationError, NotFoundError } from '@/building/store/errors'
import { cleanUpOrphaned } from '@/building/store/slices/cleanup'
import { removeConstraintsForEntityDraft } from '@/building/store/slices/constraintsSlice'
import { removeTimestampDraft, updateTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { StoreState } from '@/building/store/types'
import type { Length, Vec2 } from '@/shared/geometry'
import { copyVec2, dotVec2, lineFromSegment, projectPointOntoLine, projectVec2 } from '@/shared/geometry'

import { updateAllWallNodeGeometry } from './intermediateWallGeometry'

export interface IntermediateWallsState {
  intermediateWalls: Record<IntermediateWallId, IntermediateWall>
  _intermediateWallGeometry: Record<IntermediateWallId, IntermediateWallGeometry>

  wallNodes: Record<WallNodeId, WallNode>
  _wallNodeGeometry: Record<WallNodeId, WallNodeGeometry>
}

export interface IntermediateWallsActions {
  addIntermediateWall: (
    perimeterId: PerimeterId,
    start: WallAttachment,
    end: WallAttachment,
    thickness: Length
  ) => IntermediateWallWithGeometry
  removeIntermediateWall: (wallId: IntermediateWallId) => void
  updateIntermediateWallThickness: (wallId: IntermediateWallId, thickness: Length) => void
  updateIntermediateWallAlignment: (wallId: IntermediateWallId, start: WallAxis, end: WallAxis) => void
  mergeIntermediateWalls: (nodeId: WallNodeId) => IntermediateWallId | null

  addPerimeterWallNode: (
    perimeterId: PerimeterId,
    wallId: PerimeterWallId,
    offsetFromCornerStart: Length
  ) => PerimeterWallNodeWithGeometry
  addInnerWallNode: (perimeterId: PerimeterId, position: Vec2) => InnerWallNodeWithGeometry
  splitIntermediateWallAtPoint: (wallId: IntermediateWallId, point: Vec2) => WallNodeId
  removeWallNode: (nodeId: WallNodeId) => void
  updateInnerWallNodePosition: (nodeId: WallNodeId, position: Vec2) => void
  updatePerimeterWallNodeOffset: (nodeId: WallNodeId, offsetFromCornerStart: Length) => void

  getIntermediateWallById: (wallId: IntermediateWallId) => IntermediateWallWithGeometry
  getIntermediateWallsByPerimeter: (perimeterId: PerimeterId) => IntermediateWallWithGeometry[]
  getAllIntermediateWalls: () => IntermediateWallWithGeometry[]
  getWallNodeById: (nodeId: WallNodeId) => WallNodeWithGeometry
  getWallNodesByPerimeter: (perimeterId: PerimeterId) => WallNodeWithGeometry[]
  getAllWallNodes: () => WallNodeWithGeometry[]
}

export type IntermediateWallsSlice = IntermediateWallsState & { actions: IntermediateWallsActions }

export const createIntermediateWallsSlice: StateCreator<
  IntermediateWallsSlice & StoreState,
  [['zustand/immer', never]],
  [],
  IntermediateWallsSlice
> = (set, get) => ({
  intermediateWalls: {},
  _intermediateWallGeometry: {},
  wallNodes: {},
  _wallNodeGeometry: {},

  actions: {
    addIntermediateWall: (perimeterId: PerimeterId, start: WallAttachment, end: WallAttachment, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      let result!: IntermediateWallWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        const perimeter = state.perimeters[perimeterId]

        const wallId = createIntermediateWallId()
        const wall: IntermediateWall = {
          id: wallId,
          perimeterId,
          entityIds: [],
          start,
          end,
          thickness
        }

        state.intermediateWalls[wallId] = wall
        perimeter.intermediateWallIds.push(wallId)

        if (!(start.nodeId in state.wallNodes) || state.wallNodes[start.nodeId].perimeterId !== perimeterId) {
          throw new NotFoundError('Wall node', start.nodeId)
        }
        state.wallNodes[start.nodeId].connectedWallIds.push(wallId)
        if (!(end.nodeId in state.wallNodes) || state.wallNodes[end.nodeId].perimeterId !== perimeterId) {
          throw new NotFoundError('Wall node', end.nodeId)
        }
        state.wallNodes[end.nodeId].connectedWallIds.push(wallId)

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, wallId)
        result = { ...wall, ...state._intermediateWallGeometry[wallId] }
      })

      return result
    },

    removeIntermediateWall: (wallId: IntermediateWallId) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) return

        const wall = state.intermediateWalls[wallId]
        const perimeter = state.perimeters[wall.perimeterId]

        perimeter.intermediateWallIds = perimeter.intermediateWallIds.filter(id => id !== wallId)

        delete state.intermediateWalls[wallId]
        delete state._intermediateWallGeometry[wallId]

        removeTimestampDraft(state, wallId)
        cleanUpOrphaned(state)

        updateAllWallNodeGeometry(state, wall.perimeterId)
      })
    },

    updateIntermediateWallThickness: (wallId: IntermediateWallId, thickness: Length) => {
      if (thickness <= 0) {
        throw new Error('Wall thickness must be greater than 0')
      }

      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]

        wall.thickness = thickness
        updateAllWallNodeGeometry(state, wall.perimeterId)
        updateTimestampDraft(state, wallId)
      })
    },

    updateIntermediateWallAlignment: (wallId: IntermediateWallId, start: WallAxis, end: WallAxis) => {
      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]

        wall.start.axis = start
        wall.end.axis = end

        updateAllWallNodeGeometry(state, wall.perimeterId)
        updateTimestampDraft(state, wallId)
      })
    },

    addPerimeterWallNode: (perimeterId: PerimeterId, wallId: PerimeterWallId, offsetFromCornerStart: Length) => {
      let result!: PerimeterWallNodeWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        if (!(wallId in state.perimeterWalls)) {
          throw new NotFoundError('Perimeter wall', wallId)
        }

        const perimeter = state.perimeters[perimeterId]

        const nodeId = createWallNodeId()
        const node: WallNode = {
          id: nodeId,
          perimeterId,
          type: 'perimeter',
          wallId,
          offsetFromCornerStart,
          connectedWallIds: []
        }

        state.wallNodes[nodeId] = node
        perimeter.wallNodeIds.push(nodeId)
        state.perimeterWalls[wallId].wallNodeIds.push(nodeId)

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, nodeId)
        const geometry = state._wallNodeGeometry[nodeId] as PerimeterWallNodeGeometry
        result = { ...node, ...geometry }
      })

      return result
    },

    addInnerWallNode: (perimeterId: PerimeterId, position: Vec2) => {
      let result!: InnerWallNodeWithGeometry
      set(state => {
        if (!(perimeterId in state.perimeters)) {
          throw new NotFoundError('Perimeter', perimeterId)
        }

        const perimeter = state.perimeters[perimeterId]

        const nodeId = createWallNodeId()
        const node: WallNode = {
          id: nodeId,
          perimeterId,
          type: 'inner',
          position: copyVec2(position),
          connectedWallIds: []
        }

        state.wallNodes[nodeId] = node
        perimeter.wallNodeIds.push(nodeId)

        updateAllWallNodeGeometry(state, perimeterId)

        updateTimestampDraft(state, nodeId)
        const geometry = state._wallNodeGeometry[nodeId] as InnerWallNodeGeometry
        result = { ...node, ...geometry }
      })

      return result
    },

    splitIntermediateWallAtPoint: (wallId: IntermediateWallId, point: Vec2) => {
      let newNodeId!: WallNodeId
      set(state => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }

        const originalWall = state.intermediateWalls[wallId]
        const originalGeometry = state._intermediateWallGeometry[wallId]
        const perimeter = state.perimeters[originalWall.perimeterId]

        const projectedPoint = projectPointOntoLine(point, lineFromSegment(originalGeometry.leftLine))
        const splitPosition = projectVec2(originalGeometry.leftLine.start, projectedPoint, originalGeometry.direction)

        if (splitPosition <= 0 || splitPosition >= originalGeometry.wallLength) {
          throw new InvalidOperationError('Intermediate wall split point must be inside the wall')
        }

        const wallAId = createIntermediateWallId()
        const wallBId = createIntermediateWallId()
        const firstWallEntities: WallEntityId[] = []
        const secondWallEntities: WallEntityId[] = []
        for (const entityId of originalWall.entityIds) {
          let entity
          if (isOpeningId(entityId)) {
            if (!(entityId in state.openings)) {
              throw new NotFoundError('Wall entity', entityId)
            }
            entity = state.openings[entityId]
          } else {
            if (!(entityId in state.wallPosts)) {
              throw new NotFoundError('Wall entity', entityId)
            }
            entity = state.wallPosts[entityId]
          }
          const entityStart = entity.centerOffsetFromWallStart - entity.width / 2
          const entityEnd = entity.centerOffsetFromWallStart + entity.width / 2
          if (entityStart < splitPosition && entityEnd > splitPosition) {
            throw new InvalidOperationError('Cannot split intermediate wall through a wall entity')
          }
          if (entityEnd <= splitPosition) {
            firstWallEntities.push(entityId)
          } else {
            secondWallEntities.push(entityId)
          }
        }

        const newNodeIdInner = createWallNodeId()
        const newNode: WallNode = {
          id: newNodeIdInner,
          perimeterId: originalWall.perimeterId,
          type: 'inner',
          position: projectedPoint,
          connectedWallIds: [wallAId, wallBId]
        }
        state.wallNodes[newNodeIdInner] = newNode
        perimeter.wallNodeIds.push(newNodeIdInner)

        for (const entityId of secondWallEntities) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          entity.wallId = wallBId
          entity.centerOffsetFromWallStart -= splitPosition
        }

        const wallA: IntermediateWall = {
          id: wallAId,
          perimeterId: originalWall.perimeterId,
          entityIds: firstWallEntities,
          start: originalWall.start,
          end: { nodeId: newNodeIdInner, axis: 'left' },
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId
        }

        const wallB: IntermediateWall = {
          id: wallBId,
          perimeterId: originalWall.perimeterId,
          entityIds: secondWallEntities,
          start: { nodeId: newNodeIdInner, axis: 'left' },
          end: originalWall.end,
          thickness: originalWall.thickness,
          wallAssemblyId: originalWall.wallAssemblyId
        }

        state.intermediateWalls[wallAId] = wallA
        state.intermediateWalls[wallBId] = wallB

        perimeter.intermediateWallIds.push(wallAId)
        perimeter.intermediateWallIds.push(wallBId)
        perimeter.intermediateWallIds = perimeter.intermediateWallIds.filter(id => id !== wallId)

        const originalStartNode = state.wallNodes[originalWall.start.nodeId]
        originalStartNode.connectedWallIds = originalStartNode.connectedWallIds
          .filter(id => id !== wallId)
          .concat(wallAId)

        const originalEndNode = state.wallNodes[originalWall.end.nodeId]
        originalEndNode.connectedWallIds = originalEndNode.connectedWallIds.filter(id => id !== wallId).concat(wallBId)

        delete state.intermediateWalls[wallId]
        delete state._intermediateWallGeometry[wallId]
        removeTimestampDraft(state, wallId)

        updateTimestampDraft(state, wallAId)
        updateTimestampDraft(state, wallBId)
        updateTimestampDraft(state, newNodeIdInner)

        updateAllWallNodeGeometry(state, originalWall.perimeterId)

        newNodeId = newNodeIdInner
      })

      return newNodeId
    },

    mergeIntermediateWalls: (nodeId: WallNodeId): IntermediateWallId | null => {
      let mergedWallId: IntermediateWallId | null = null
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'inner') return
        if (node.connectedWallIds.length !== 2) return

        const wallA = state.intermediateWalls[node.connectedWallIds[0]]
        const wallB = state.intermediateWalls[node.connectedWallIds[1]]

        if (!wallA || !wallB) return // eslint-disable-line @typescript-eslint/no-unnecessary-condition

        const geomA = state._intermediateWallGeometry[wallA.id]
        const geomB = state._intermediateWallGeometry[wallB.id]

        if (Math.abs(dotVec2(geomA.direction, geomB.direction)) < 0.999) return

        const firstWall = wallA.end.nodeId === nodeId ? wallA : wallB
        const secondWall = wallA.end.nodeId === nodeId ? wallB : wallA
        const firstWallGeometry = state._intermediateWallGeometry[firstWall.id]
        const mergedThickness = Math.max(firstWall.thickness, secondWall.thickness)

        const mergedEntities: { id: WallEntityId; offset: Length; start: Length; end: Length }[] = []
        for (const entityId of firstWall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          if (!(entityId in (isOpeningId(entityId) ? state.openings : state.wallPosts))) {
            throw new NotFoundError('Wall entity', entityId)
          }
          mergedEntities.push({
            id: entityId,
            offset: entity.centerOffsetFromWallStart,
            start: entity.centerOffsetFromWallStart - entity.width / 2,
            end: entity.centerOffsetFromWallStart + entity.width / 2
          })
        }
        for (const entityId of secondWall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          if (!(entityId in (isOpeningId(entityId) ? state.openings : state.wallPosts))) {
            throw new NotFoundError('Wall entity', entityId)
          }
          const offset = entity.centerOffsetFromWallStart + firstWallGeometry.wallLength
          mergedEntities.push({
            id: entityId,
            offset,
            start: offset - entity.width / 2,
            end: offset + entity.width / 2
          })
        }

        mergedEntities.sort((a, b) => a.start - b.start)
        for (let i = 1; i < mergedEntities.length; i++) {
          if (mergedEntities[i - 1].end > mergedEntities[i].start) {
            throw new InvalidOperationError('Cannot merge intermediate walls with overlapping entities')
          }
        }

        const newId = createIntermediateWallId()

        const mergedEntityIds: WallEntityId[] = [...firstWall.entityIds]
        for (const entityId of secondWall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          entity.wallId = newId
          entity.centerOffsetFromWallStart += firstWallGeometry.wallLength
          updateTimestampDraft(state, entityId)
          mergedEntityIds.push(entityId)
        }
        for (const entityId of firstWall.entityIds) {
          const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
          entity.wallId = newId
          updateTimestampDraft(state, entityId)
        }

        const mergedWall: IntermediateWall = {
          id: newId,
          perimeterId: firstWall.perimeterId,
          entityIds: mergedEntityIds,
          start: firstWall.start,
          end: secondWall.end,
          thickness: mergedThickness,
          wallAssemblyId: firstWall.wallAssemblyId
        }

        const perimeter = state.perimeters[firstWall.perimeterId]

        perimeter.intermediateWallIds = perimeter.intermediateWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        const startNode = state.wallNodes[firstWall.start.nodeId]
        startNode.connectedWallIds = startNode.connectedWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        const endNode = state.wallNodes[secondWall.end.nodeId]
        endNode.connectedWallIds = endNode.connectedWallIds
          .filter(id => id !== wallA.id && id !== wallB.id)
          .concat(newId)

        state.intermediateWalls[newId] = mergedWall

        delete state.intermediateWalls[wallA.id]
        delete state._intermediateWallGeometry[wallA.id]
        delete state.intermediateWalls[wallB.id]
        delete state._intermediateWallGeometry[wallB.id]
        delete state.wallNodes[nodeId]
        delete state._wallNodeGeometry[nodeId]

        removeConstraintsForEntityDraft(state, wallA.id)
        removeConstraintsForEntityDraft(state, wallB.id)
        removeConstraintsForEntityDraft(state, nodeId)
        perimeter.wallNodeIds = perimeter.wallNodeIds.filter(id => id !== nodeId)

        removeTimestampDraft(state, wallA.id, wallB.id, nodeId)
        updateTimestampDraft(state, newId)

        updateAllWallNodeGeometry(state, firstWall.perimeterId)

        mergedWallId = newId
      })

      return mergedWallId
    },

    removeWallNode: (nodeId: WallNodeId) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) return

        const node = state.wallNodes[nodeId]

        delete state.wallNodes[nodeId]
        delete state._wallNodeGeometry[nodeId]

        cleanUpOrphaned(state)
        removeTimestampDraft(state, nodeId)
        removeConstraintsForEntityDraft(state, nodeId)

        updateAllWallNodeGeometry(state, node.perimeterId)
      })
    },

    updateInnerWallNodePosition: (nodeId: WallNodeId, position: Vec2) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'inner') {
          throw new Error('Cannot update position of perimeter wall node')
        }

        node.position = copyVec2(position)

        const connectedWalls = Object.values(state.intermediateWalls).filter(
          wall => wall.start.nodeId === nodeId || wall.end.nodeId === nodeId
        )

        for (const wall of connectedWalls) {
          updateTimestampDraft(state, wall.id)
        }

        updateAllWallNodeGeometry(state, node.perimeterId)
        updateTimestampDraft(state, nodeId)
      })
    },

    updatePerimeterWallNodeOffset: (nodeId: WallNodeId, offsetFromCornerStart: Length) => {
      set(state => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }

        const node = state.wallNodes[nodeId]
        if (node.type !== 'perimeter') {
          throw new Error('Cannot update offset of inner wall node')
        }

        node.offsetFromCornerStart = offsetFromCornerStart

        const connectedWalls = Object.values(state.intermediateWalls).filter(
          wall => wall.start.nodeId === nodeId || wall.end.nodeId === nodeId
        )

        for (const wall of connectedWalls) {
          updateTimestampDraft(state, wall.id)
        }

        updateAllWallNodeGeometry(state, node.perimeterId)
        updateTimestampDraft(state, nodeId)
      })
    },

    getIntermediateWallById: (wallId: IntermediateWallId) => {
      const state = get()
      if (!(wallId in state.intermediateWalls)) {
        throw new NotFoundError('Intermediate wall', wallId)
      }
      const wall = state.intermediateWalls[wallId]
      const geometry = state._intermediateWallGeometry[wallId]
      return { ...wall, ...geometry }
    },

    getIntermediateWallsByPerimeter: (perimeterId: PerimeterId) => {
      const state = get()
      if (!(perimeterId in state.perimeters)) {
        throw new NotFoundError('Perimeter', perimeterId)
      }
      const perimeter = state.perimeters[perimeterId]
      return perimeter.intermediateWallIds.map(wallId => {
        if (!(wallId in state.intermediateWalls)) {
          throw new NotFoundError('Intermediate wall', wallId)
        }
        const wall = state.intermediateWalls[wallId]
        const geometry = state._intermediateWallGeometry[wallId]
        return { ...wall, ...geometry }
      })
    },

    getAllIntermediateWalls: () => {
      const state = get()
      return Object.values(state.intermediateWalls).map(wall => ({
        ...wall,
        ...state._intermediateWallGeometry[wall.id]
      }))
    },

    getWallNodeById: (nodeId: WallNodeId) => {
      const state = get()
      if (!(nodeId in state.wallNodes)) {
        throw new NotFoundError('Wall node', nodeId)
      }
      const node = state.wallNodes[nodeId]
      const geometry = state._wallNodeGeometry[nodeId]

      return node.type === 'inner'
        ? { ...node, ...(geometry as InnerWallNodeGeometry) }
        : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
    },

    getWallNodesByPerimeter: (perimeterId: PerimeterId) => {
      const state = get()
      if (!(perimeterId in state.perimeters)) {
        throw new NotFoundError('Perimeter', perimeterId)
      }
      const perimeter = state.perimeters[perimeterId]
      return perimeter.wallNodeIds.map(nodeId => {
        if (!(nodeId in state.wallNodes)) {
          throw new NotFoundError('Wall node', nodeId)
        }
        const node = state.wallNodes[nodeId]
        const geometry = state._wallNodeGeometry[nodeId]
        return node.type === 'inner'
          ? { ...node, ...(geometry as InnerWallNodeGeometry) }
          : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
      })
    },

    getAllWallNodes: () => {
      const state = get()
      return Object.values(state.wallNodes).map(node => {
        const geometry = state._wallNodeGeometry[node.id]
        return node.type === 'inner'
          ? { ...node, ...(geometry as InnerWallNodeGeometry) }
          : { ...node, ...(geometry as PerimeterWallNodeGeometry) }
      })
    }
  }
})
