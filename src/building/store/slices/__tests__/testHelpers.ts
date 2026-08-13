import { expect, vi } from 'vitest'

import type {
  Perimeter,
  PerimeterCorner,
  PerimeterCornerGeometry,
  PerimeterWall,
  PerimeterWallGeometry,
  WallPostParams
} from '@/building/model'
import type { PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { createStoreyId, isOpeningId, isWallPostId } from '@/building/model/ids'
import { NotFoundError } from '@/building/store/errors'
import type { ConstraintsState } from '@/building/store/slices/constraintsSlice'
import type { IntermediateWallsSlice, IntermediateWallsState } from '@/building/store/slices/intermediateWallsSlice'
import { createIntermediateWallsSlice } from '@/building/store/slices/intermediateWallsSlice'
import {
  type PerimetersSlice,
  type PerimetersState,
  createPerimetersSlice
} from '@/building/store/slices/perimeterSlice'
import type {
  WallEntitiesActions,
  WallEntitiesSlice,
  WallEntitiesState
} from '@/building/store/slices/wallEntitiesSlice'
import { createWallEntitiesSlice } from '@/building/store/slices/wallEntitiesSlice'
import type { TimestampsState } from '@/config/store/slices/timestampsSlice'
import type { MaterialId } from '@/materials/types'
import type { Polygon2D } from '@/shared/geometry'
import { newVec2 } from '@/shared/geometry'

/**
 * Creates a simple rectangular boundary polygon
 */
export function createRectangularBoundary(width = 10000, height = 5000): Polygon2D {
  return {
    points: [newVec2(0, 0), newVec2(0, height), newVec2(width, height), newVec2(width, 0)]
  }
}

/**
 * Creates a triangular boundary polygon
 */
export function createTriangularBoundary(): Polygon2D {
  return {
    points: [newVec2(0, 0), newVec2(2500, 4000), newVec2(5000, 0)]
  }
}

/**
 * Creates an L-shaped boundary with reflex angles
 */
export function createLShapedBoundary(): Polygon2D {
  return {
    points: [
      newVec2(0, 0),
      newVec2(0, 10000),
      newVec2(5000, 10000),
      newVec2(5000, 5000),
      newVec2(10000, 5000),
      newVec2(10000, 0)
    ]
  }
}

/**
 * Sets up a test perimeter slice with mock zustand methods
 */
export type PerimeterTestSlice = PerimetersSlice & WallEntitiesSlice

export function setupPerimeterSlice() {
  const mockSet = vi.fn()
  const mockGet = vi.fn()
  const mockUpdateTimestamp = vi.fn()
  const mockRemoveTimestamp = vi.fn()

  const mockStore = {} as any
  const testStoreyId = createStoreyId()

  const perimetersSlice = createPerimetersSlice(mockSet, mockGet, mockStore)
  const wallEntitiesSlice = createWallEntitiesSlice(mockSet, mockGet, mockStore)
  const { actions: _perimActions, ...perimState } = perimetersSlice
  const { actions: _entityActions, ...entityState } = wallEntitiesSlice
  const slice: PerimeterTestSlice = {
    ...perimState,
    ...entityState,
    timestamps: {},
    buildingConstraints: {},
    _constraintsByEntity: {},
    intermediateWalls: {},
    wallNodes: {},
    actions: {
      ..._perimActions,
      ..._entityActions
    }
  } as PerimetersSlice & WallEntitiesSlice

  mockGet.mockImplementation(() => slice)

  mockSet.mockImplementation((updater: any) => {
    if (typeof updater === 'function') {
      updater(slice)
    }
  })

  return { slice, mockSet, mockGet, mockUpdateTimestamp, mockRemoveTimestamp, testStoreyId }
}

/**
 * Verifies that all references within a perimeter are consistent
 */
export function expectConsistentPerimeterReferences(state: PerimetersState, perimeterId: PerimeterId): void {
  const perimeter = state.perimeters[perimeterId]
  expect(perimeter).toBeDefined()

  // Verify all walls exist and reference correct perimeter
  perimeter.wallIds.forEach(wallId => {
    const wall = state.perimeterWalls[wallId]
    expect(wall, `Wall ${wallId} should exist`).toBeDefined()
    expect(wall.perimeterId, `Wall ${wallId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    // Verify wall's corners exist
    expect(state.perimeterCorners[wall.startCornerId], `Start corner ${wall.startCornerId} should exist`).toBeDefined()
    expect(state.perimeterCorners[wall.endCornerId], `End corner ${wall.endCornerId} should exist`).toBeDefined()
  })

  // Verify all corners exist and reference correct perimeter
  perimeter.cornerIds.forEach(cornerId => {
    const corner = state.perimeterCorners[cornerId]
    expect(corner, `Corner ${cornerId} should exist`).toBeDefined()
    expect(corner.perimeterId, `Corner ${cornerId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    // Verify corner's walls exist
    expect(
      state.perimeterWalls[corner.previousWallId],
      `Previous wall ${corner.previousWallId} should exist`
    ).toBeDefined()
    expect(state.perimeterWalls[corner.nextWallId], `Next wall ${corner.nextWallId} should exist`).toBeDefined()
  })

  // Verify circular structure: wall.endCorner === next_wall.startCorner
  for (let i = 0; i < perimeter.wallIds.length; i++) {
    const wallId = perimeter.wallIds[i]
    const nextWallId = perimeter.wallIds[(i + 1) % perimeter.wallIds.length]
    const wall = state.perimeterWalls[wallId]
    const nextWall = state.perimeterWalls[nextWallId]

    expect(wall.endCornerId, `Wall ${wallId} end corner should match next wall ${nextWallId} start corner`).toBe(
      nextWall.startCornerId
    )
  }

  // Verify corner references match wall structure
  for (let i = 0; i < perimeter.cornerIds.length; i++) {
    const cornerId = perimeter.cornerIds[i]
    const corner = state.perimeterCorners[cornerId]
    const prevWallIndex = (i - 1 + perimeter.wallIds.length) % perimeter.wallIds.length
    const expectedPreviousWall = perimeter.wallIds[prevWallIndex]
    const expectedNextWall = perimeter.wallIds[i]

    expect(corner.previousWallId, `Corner ${cornerId} previous wall should be ${expectedPreviousWall}`).toBe(
      expectedPreviousWall
    )
    expect(corner.nextWallId, `Corner ${cornerId} next wall should be ${expectedNextWall}`).toBe(expectedNextWall)
  }
}

/**
 * Verifies that geometry exists for all entities in a perimeter
 */
export function expectGeometryExists(state: PerimetersState, perimeterId: PerimeterId): void {
  const perimeter = state.perimeters[perimeterId]

  // Verify perimeter geometry
  expect(state._perimeterGeometry[perimeterId], `Perimeter ${perimeterId} geometry should exist`).toBeDefined()

  // Verify wall geometry
  perimeter.wallIds.forEach(wallId => {
    expect(state._perimeterWallGeometry[wallId], `Wall ${wallId} geometry should exist`).toBeDefined()
  })

  // Verify corner geometry
  perimeter.cornerIds.forEach(cornerId => {
    expect(state._perimeterCornerGeometry[cornerId], `Corner ${cornerId} geometry should exist`).toBeDefined()
  })
}

/**
 * Verifies that there are no orphaned entities or geometry in the state
 */
export function expectNoOrphanedEntities(state: PerimetersState & WallEntitiesState): void {
  const allPerimeterIds = new Set(Object.keys(state.perimeters))
  const allWallIds = new Set<string>()
  const allCornerIds = new Set<string>()
  const allOpeningIds = new Set<string>()
  const allPostIds = new Set<string>()

  // Collect all IDs that should exist
  Object.values(state.perimeters).forEach(perimeter => {
    perimeter.wallIds.forEach(id => allWallIds.add(id))
    perimeter.cornerIds.forEach(id => allCornerIds.add(id))
  })

  Object.values(state.perimeterWalls).forEach(wall => {
    wall.entityIds.forEach(id => {
      if (isOpeningId(id)) allOpeningIds.add(id)
      if (isWallPostId(id)) allPostIds.add(id)
    })
  })

  // Verify no orphaned walls
  Object.keys(state.perimeterWalls).forEach(wallId => {
    expect(allWallIds.has(wallId), `Wall ${wallId} should be referenced by a perimeter`).toBe(true)
  })

  // Verify no orphaned corners
  Object.keys(state.perimeterCorners).forEach(cornerId => {
    expect(allCornerIds.has(cornerId), `Corner ${cornerId} should be referenced by a perimeter`).toBe(true)
  })

  // Verify no orphaned openings
  Object.keys(state.openings).forEach(openingId => {
    expect(allOpeningIds.has(openingId), `Opening ${openingId} should be referenced by a wall`).toBe(true)
  })

  // Verify no orphaned posts
  Object.keys(state.wallPosts).forEach(postId => {
    expect(allPostIds.has(postId), `Post ${postId} should be referenced by a wall`).toBe(true)
  })

  // Verify no orphaned geometry
  Object.keys(state._perimeterGeometry).forEach(id => {
    expect(allPerimeterIds.has(id), `Perimeter geometry for ${id} should have corresponding perimeter`).toBe(true)
  })

  Object.keys(state._perimeterWallGeometry).forEach(id => {
    expect(allWallIds.has(id), `Wall geometry for ${id} should have corresponding wall`).toBe(true)
  })

  Object.keys(state._perimeterCornerGeometry).forEach(id => {
    expect(allCornerIds.has(id), `Corner geometry for ${id} should have corresponding corner`).toBe(true)
  })

  Object.keys(state._openingGeometry).forEach(id => {
    expect(allOpeningIds.has(id), `Opening geometry for ${id} should have corresponding opening`).toBe(true)
  })

  Object.keys(state._wallPostGeometry).forEach(id => {
    expect(allPostIds.has(id), `Post geometry for ${id} should have corresponding post`).toBe(true)
  })
}

/**
 * Verifies that a getter throws for an invalid ID
 */
export function expectThrowsForInvalidId(getter: () => unknown, expectedMessage?: string): void {
  expect(() => getter()).toThrow(NotFoundError)
  if (expectedMessage) {
    expect(() => getter()).toThrow(expectedMessage)
  }
}

export function mockPost(params: Partial<WallPostParams>): WallPostParams {
  return {
    centerOffsetFromWallStart: 0,
    postType: 'center',
    replacesPosts: true,
    thickness: 42,
    width: 23,
    material: 'postMaterial' as MaterialId,
    infillMaterial: 'infillMaterial' as MaterialId,
    ...params
  }
}

// ---------------------------------------------------------------------------
// Intermediate wall test helpers
// ---------------------------------------------------------------------------

interface MockPerimeterData {
  perimeterId: PerimeterId
  wallIds: PerimeterWallId[]
  cornerIds: PerimeterCornerId[]
}

export function createMockPerimeterState(
  width = 10000,
  height = 5000,
  thickness = 420
): {
  perimetersState: PerimetersState
  wallEntitiesState: WallEntitiesState
  perimeterData: MockPerimeterData
} {
  const w = width
  const h = height
  const t = thickness

  const wallIds: PerimeterWallId[] = [
    'outwall_bottom' as PerimeterWallId,
    'outwall_right' as PerimeterWallId,
    'outwall_top' as PerimeterWallId,
    'outwall_left' as PerimeterWallId
  ]
  const cornerIds: PerimeterCornerId[] = [
    'outcorner_bl' as PerimeterCornerId,
    'outcorner_br' as PerimeterCornerId,
    'outcorner_tr' as PerimeterCornerId,
    'outcorner_tl' as PerimeterCornerId
  ]
  const perimeterId = 'perimeter_test' as PerimeterId

  const perimeter: Perimeter = {
    id: perimeterId,
    storeyId: 'storey_test' as any,
    wallIds,
    cornerIds,
    roomIds: [],
    wallNodeIds: [],
    intermediateWallIds: [],
    referenceSide: 'inside'
  }

  const perimeterWalls: Record<PerimeterWallId, PerimeterWall> = {
    [wallIds[0]]: {
      id: wallIds[0],
      perimeterId,
      startCornerId: cornerIds[0],
      endCornerId: cornerIds[1],
      entityIds: [],
      wallNodeIds: [],
      thickness: t,
      wallAssemblyId: 'wa_test' as any
    },
    [wallIds[1]]: {
      id: wallIds[1],
      perimeterId,
      startCornerId: cornerIds[1],
      endCornerId: cornerIds[2],
      entityIds: [],
      wallNodeIds: [],
      thickness: t,
      wallAssemblyId: 'wa_test' as any
    },
    [wallIds[2]]: {
      id: wallIds[2],
      perimeterId,
      startCornerId: cornerIds[2],
      endCornerId: cornerIds[3],
      entityIds: [],
      wallNodeIds: [],
      thickness: t,
      wallAssemblyId: 'wa_test' as any
    },
    [wallIds[3]]: {
      id: wallIds[3],
      perimeterId,
      startCornerId: cornerIds[3],
      endCornerId: cornerIds[0],
      entityIds: [],
      wallNodeIds: [],
      thickness: t,
      wallAssemblyId: 'wa_test' as any
    }
  }

  const perimeterCorners: Record<PerimeterCornerId, PerimeterCorner> = {
    [cornerIds[0]]: {
      id: cornerIds[0],
      perimeterId,
      previousWallId: wallIds[3],
      nextWallId: wallIds[0],
      referencePoint: newVec2(0, 0),
      constructedByWall: 'previous'
    },
    [cornerIds[1]]: {
      id: cornerIds[1],
      perimeterId,
      previousWallId: wallIds[0],
      nextWallId: wallIds[1],
      referencePoint: newVec2(w, 0),
      constructedByWall: 'previous'
    },
    [cornerIds[2]]: {
      id: cornerIds[2],
      perimeterId,
      previousWallId: wallIds[1],
      nextWallId: wallIds[2],
      referencePoint: newVec2(w, h),
      constructedByWall: 'previous'
    },
    [cornerIds[3]]: {
      id: cornerIds[3],
      perimeterId,
      previousWallId: wallIds[2],
      nextWallId: wallIds[3],
      referencePoint: newVec2(0, h),
      constructedByWall: 'previous'
    }
  }

  const _perimeterGeometry: Record<PerimeterId, any> = {
    [perimeterId]: {
      outerPolygon: {
        points: [newVec2(-t, -t), newVec2(w + t, -t), newVec2(w + t, h + t), newVec2(-t, h + t)]
      },
      innerPolygon: {
        points: [newVec2(0, 0), newVec2(w, 0), newVec2(w, h), newVec2(0, h)]
      }
    }
  }

  const _perimeterWallGeometry: Record<PerimeterWallId, PerimeterWallGeometry> = {
    [wallIds[0]]: {
      insideLine: { start: newVec2(0, 0), end: newVec2(w, 0) },
      outsideLine: { start: newVec2(-t, -t), end: newVec2(w + t, -t) },
      insideLength: w,
      outsideLength: w,
      wallLength: w,
      direction: newVec2(1, 0),
      outsideDirection: newVec2(0, -1),
      polygon: { points: [] }
    },
    [wallIds[1]]: {
      insideLine: { start: newVec2(w, 0), end: newVec2(w, h) },
      outsideLine: { start: newVec2(w + t, -t), end: newVec2(w + t, h + t) },
      insideLength: h,
      outsideLength: h,
      wallLength: h,
      direction: newVec2(0, 1),
      outsideDirection: newVec2(1, 0),
      polygon: { points: [] }
    },
    [wallIds[2]]: {
      insideLine: { start: newVec2(w, h), end: newVec2(0, h) },
      outsideLine: { start: newVec2(w + t, h + t), end: newVec2(-t, h + t) },
      insideLength: w,
      outsideLength: w,
      wallLength: w,
      direction: newVec2(-1, 0),
      outsideDirection: newVec2(0, 1),
      polygon: { points: [] }
    },
    [wallIds[3]]: {
      insideLine: { start: newVec2(0, h), end: newVec2(0, 0) },
      outsideLine: { start: newVec2(-t, h + t), end: newVec2(-t, -t) },
      insideLength: h,
      outsideLength: h,
      wallLength: h,
      direction: newVec2(0, -1),
      outsideDirection: newVec2(-1, 0),
      polygon: { points: [] }
    }
  }

  const _perimeterCornerGeometry: Record<PerimeterCornerId, PerimeterCornerGeometry> = {
    [cornerIds[0]]: {
      insidePoint: newVec2(0, 0),
      outsidePoint: newVec2(-t, -t),
      interiorAngle: 90,
      exteriorAngle: 270,
      polygon: { points: [] }
    },
    [cornerIds[1]]: {
      insidePoint: newVec2(w, 0),
      outsidePoint: newVec2(w + t, -t),
      interiorAngle: 90,
      exteriorAngle: 270,
      polygon: { points: [] }
    },
    [cornerIds[2]]: {
      insidePoint: newVec2(w, h),
      outsidePoint: newVec2(w + t, h + t),
      interiorAngle: 90,
      exteriorAngle: 270,
      polygon: { points: [] }
    },
    [cornerIds[3]]: {
      insidePoint: newVec2(0, h),
      outsidePoint: newVec2(-t, h + t),
      interiorAngle: 90,
      exteriorAngle: 270,
      polygon: { points: [] }
    }
  }

  const perimetersState: PerimetersState = {
    perimeters: { [perimeterId]: perimeter },
    _perimeterGeometry,
    perimeterWalls,
    _perimeterWallGeometry,
    perimeterCorners,
    _perimeterCornerGeometry
  }

  const wallEntitiesState: WallEntitiesState = {
    openings: {},
    _openingGeometry: {},
    wallPosts: {},
    _wallPostGeometry: {}
  }

  return {
    perimetersState,
    wallEntitiesState,
    perimeterData: { perimeterId, wallIds, cornerIds }
  }
}

export type IntermediateWallsTestState = IntermediateWallsSlice &
  PerimetersState &
  WallEntitiesState &
  TimestampsState &
  ConstraintsState & {
    actions: IntermediateWallsSlice['actions'] & WallEntitiesActions
  }

export function setupIntermediateWallsSlice(
  perimeterStateOverrides?: Partial<PerimetersState>,
  intermediateStateOverrides?: Partial<IntermediateWallsState>
) {
  const { perimetersState, wallEntitiesState, perimeterData } = createMockPerimeterState()

  const mergedPerimeters: PerimetersState = { ...perimetersState, ...perimeterStateOverrides }
  const mergedIntermediate: IntermediateWallsState = {
    intermediateWalls: {},
    _intermediateWallGeometry: {},
    wallNodes: {},
    _wallNodeGeometry: {},
    ...intermediateStateOverrides
  }

  const mockSet = vi.fn()
  const mockGet = vi.fn()

  const state: IntermediateWallsTestState = {
    ...mergedPerimeters,
    ...wallEntitiesState,
    ...mergedIntermediate,
    timestamps: {},
    _constraintsByEntity: {},
    buildingConstraints: {},
    actions: null as any
  }

  const wallEntitiesActions = createWallEntitiesSlice(mockSet, mockGet, state as any)
  state.actions = {
    ...createIntermediateWallsSlice(mockSet, mockGet, state as any).actions,
    ...wallEntitiesActions.actions
  }

  mockGet.mockImplementation(() => state)

  mockSet.mockImplementation((updater: any) => {
    if (typeof updater === 'function') {
      updater(state)
    }
  })

  return { state, mockSet, mockGet, perimeterData }
}

export function expectConsistentIntermediateWallReferences(
  state: IntermediateWallsState & { perimeters: Record<PerimeterId, any>; perimeterWalls: Record<string, any> },
  perimeterId: PerimeterId
): void {
  const perimeter = state.perimeters[perimeterId]
  expect(perimeter).toBeDefined()

  for (const wallId of perimeter.intermediateWallIds) {
    const wall = state.intermediateWalls[wallId]
    expect(wall, `Intermediate wall ${wallId} should exist`).toBeDefined()
    expect(wall.perimeterId, `Wall ${wallId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    const startNode = state.wallNodes[wall.start.nodeId]
    expect(startNode, `Start node ${wall.start.nodeId} of wall ${wallId} should exist`).toBeDefined()
    expect(startNode.connectedWallIds, `Start node of wall ${wallId} should reference it`).toContain(wallId)

    const endNode = state.wallNodes[wall.end.nodeId]
    expect(endNode, `End node ${wall.end.nodeId} of wall ${wallId} should exist`).toBeDefined()
    expect(endNode.connectedWallIds, `End node of wall ${wallId} should reference it`).toContain(wallId)
  }

  for (const nodeId of perimeter.wallNodeIds) {
    const node = state.wallNodes[nodeId]
    expect(node, `Wall node ${nodeId} should exist`).toBeDefined()
    expect(node.perimeterId, `Node ${nodeId} should reference perimeter ${perimeterId}`).toBe(perimeterId)

    for (const connectedWallId of node.connectedWallIds) {
      expect(
        state.intermediateWalls[connectedWallId],
        `Connected wall ${connectedWallId} of node ${nodeId} should exist`
      ).toBeDefined()
    }

    // Verify perimeter-wall nodes are tracked in their PerimeterWall.wallNodeIds
    if (node.type === 'perimeter') {
      const perimWall = state.perimeterWalls[node.wallId]
      expect(perimWall, `Perimeter wall ${node.wallId} of node ${nodeId} should exist`).toBeDefined()
      expect(
        perimWall.wallNodeIds,
        `Perimeter wall ${node.wallId} should track node ${nodeId} in wallNodeIds`
      ).toContain(nodeId)
    }
  }
}

export function expectNoOrphanedIntermediateEntities(
  state: IntermediateWallsState & {
    perimeters: Record<PerimeterId, any>
    perimeterWalls: Record<string, any>
    openings: Record<string, any>
    wallPosts: Record<string, any>
    _openingGeometry: Record<string, any>
    _wallPostGeometry: Record<string, any>
  }
): void {
  const allWallIds = new Set<string>()
  const allNodeIds = new Set<string>()
  const allPerimeterWallNodeIds = new Set<string>()

  for (const perimeter of Object.values(state.perimeters)) {
    for (const id of perimeter.intermediateWallIds) allWallIds.add(id)
    for (const id of perimeter.wallNodeIds) allNodeIds.add(id)
  }

  for (const perimWall of Object.values(state.perimeterWalls)) {
    for (const id of perimWall.wallNodeIds) {
      allPerimeterWallNodeIds.add(id)
    }
  }

  for (const wallId of Object.keys(state.intermediateWalls)) {
    expect(allWallIds.has(wallId), `Intermediate wall ${wallId} should be referenced by a perimeter`).toBe(true)
  }

  for (const nodeId of Object.keys(state.wallNodes)) {
    expect(allNodeIds.has(nodeId), `Wall node ${nodeId} should be referenced by a perimeter`).toBe(true)
  }

  for (const wallId of Object.keys(state._intermediateWallGeometry)) {
    expect(allWallIds.has(wallId), `Intermediate wall geometry for ${wallId} should have corresponding wall`).toBe(true)
  }

  for (const nodeId of Object.keys(state._wallNodeGeometry)) {
    expect(allNodeIds.has(nodeId), `Wall node geometry for ${nodeId} should have corresponding node`).toBe(true)
  }

  for (const wall of Object.values(state.intermediateWalls)) {
    for (const entityId of wall.entityIds) {
      const entity = isOpeningId(entityId) ? state.openings[entityId] : state.wallPosts[entityId]
      expect(entity, `Entity ${entityId} should exist`).toBeDefined()
      expect(entity.wallId, `Entity ${entityId} should reference wall ${wall.id}`).toBe(wall.id)
    }
  }

  for (const [entityId, entity] of Object.entries(state.openings)) {
    if (entity.wallId.startsWith('intermediate_')) {
      expect(state.intermediateWalls[entity.wallId]).toBeDefined()
      expect(state._openingGeometry[entityId]).toBeDefined()
    }
  }

  for (const [entityId, entity] of Object.entries(state.wallPosts)) {
    if (entity.wallId.startsWith('intermediate_')) {
      expect(state.intermediateWalls[entity.wallId]).toBeDefined()
      expect(state._wallPostGeometry[entityId]).toBeDefined()
    }
  }

  // Verify perimeter-wall node IDs are consistent with perimeter.wallNodeIds
  for (const nodeId of allPerimeterWallNodeIds) {
    expect(
      allNodeIds.has(nodeId),
      `PerimeterWall.wallNodeIds entry ${nodeId} should be in a perimeter's wallNodeIds`
    ).toBe(true)
  }
}
