// Strong typing for entity IDs
export type WallId = string & { readonly brand: unique symbol }
export type PointId = string & { readonly brand: unique symbol }
export type RoomId = string & { readonly brand: unique symbol }
export type FloorId = string & { readonly brand: unique symbol }
export type SlabId = string & { readonly brand: unique symbol }
export type RoofId = string & { readonly brand: unique symbol }
export type OuterWallId = string & { readonly brand: unique symbol }

// Sub-entity ID types for hierarchical selection
export type WallSegmentId = string & { readonly brand: unique symbol }
export type OuterCornerId = string & { readonly brand: unique symbol }
export type OpeningId = string & { readonly brand: unique symbol }

export type EntityId = WallId | PointId | RoomId | FloorId | SlabId | RoofId | OuterWallId
export type SubEntityId = WallSegmentId | OuterCornerId | OpeningId
export type SelectableId = EntityId | SubEntityId

// ID generation helpers
export const createWallId = (): WallId => `wall_${Date.now()}_${Math.random()}` as WallId
export const createPointId = (): PointId => `point_${Date.now()}_${Math.random()}` as PointId
export const createRoomId = (): RoomId => `room_${Date.now()}_${Math.random()}` as RoomId
export const createSlabId = (): SlabId => `slab_${Date.now()}_${Math.random()}` as SlabId
export const createFloorId = (): FloorId => `floor_${Date.now()}_${Math.random()}` as FloorId
export const createRoofId = (): RoofId => `roof_${Date.now()}_${Math.random()}` as RoofId
export const createOuterWallId = (): OuterWallId => `outside_${Date.now()}_${Math.random()}` as OuterWallId

// Sub-entity ID generators
export const createWallSegmentId = (): WallSegmentId => `segment_${Date.now()}_${Math.random()}` as WallSegmentId
export const createOuterCornerId = (): OuterCornerId => `outcorner_${Date.now()}_${Math.random()}` as OuterCornerId
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId

// Type guards for runtime ID validation
export const isWallId = (id: string): id is WallId => id.startsWith('wall_')
export const isPointId = (id: string): id is PointId => id.startsWith('point_')
export const isRoomId = (id: string): id is RoomId => id.startsWith('room_')
export const isFloorId = (id: string): id is FloorId => id.startsWith('floor_')
export const isSlabId = (id: string): id is SlabId => id.startsWith('slab_')
export const isRoofId = (id: string): id is SlabId => id.startsWith('roof_')
export const isOuterWallId = (id: string): id is OuterWallId => id.startsWith('outside_')

// Sub-entity type guards
export const isWallSegmentId = (id: string): id is WallSegmentId => id.startsWith('segment_')
export const isOuterCornerId = (id: string): id is OuterCornerId => id.startsWith('outcorner_')
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_')

// Helper functions for selection system
export const getIdType = (id: SelectableId): 'entity' | 'segment' | 'corner' | 'opening' => {
  // Sub-entity types
  if (isWallSegmentId(id)) return 'segment'
  if (isOuterCornerId(id)) return 'corner'
  if (isOpeningId(id)) return 'opening'

  // Main entity types
  if (
    isWallId(id) ||
    isPointId(id) ||
    isRoomId(id) ||
    isOuterWallId(id) ||
    isFloorId(id) ||
    isSlabId(id) ||
    isRoofId(id)
  ) {
    return 'entity'
  }

  throw new Error(`Unknown ID type: ${id}`)
}

export const isEntityId = (id: SelectableId): id is EntityId => {
  return getIdType(id) === 'entity'
}

export const isSubEntityId = (id: SelectableId): id is SubEntityId => {
  return ['segment', 'corner', 'opening'].includes(getIdType(id))
}

// Entity type definitions for hit testing
export type EntityType = 'outer-wall' | 'wall-segment' | 'outer-corner' | 'opening'
