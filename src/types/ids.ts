// Strong typing for entity IDs
export type StoreyId = string & { readonly brand: unique symbol }
export type PerimeterId = string & { readonly brand: unique symbol }

// Sub-entity ID types for hierarchical selection
export type WallSegmentId = string & { readonly brand: unique symbol }
export type OuterWallCornerId = string & { readonly brand: unique symbol }
export type OpeningId = string & { readonly brand: unique symbol }

export type EntityId = StoreyId | PerimeterId
export type SelectableId = StoreyId | PerimeterId | WallSegmentId | OuterWallCornerId | OpeningId

// ID generation helpers
export const createStoreyId = (): StoreyId => `storey_${Date.now()}_${Math.random()}` as StoreyId
export const createPerimeterId = (): PerimeterId => `perimeter_${Date.now()}_${Math.random()}` as PerimeterId

// Sub-entity ID generators
export const createWallSegmentId = (): WallSegmentId => `segment_${Date.now()}_${Math.random()}` as WallSegmentId
export const createOuterCornerId = (): OuterWallCornerId =>
  `outcorner_${Date.now()}_${Math.random()}` as OuterWallCornerId
export const createOpeningId = (): OpeningId => `opening_${Date.now()}_${Math.random()}` as OpeningId

// Type guards for runtime ID validation
export const isStoreyId = (id: string): id is StoreyId => id.startsWith('storey_')
export const isPerimeterId = (id: string): id is PerimeterId => id.startsWith('perimeter_')

// Sub-entity type guards
export const isWallSegmentId = (id: string): id is WallSegmentId => id.startsWith('segment_')
export const isOuterCornerId = (id: string): id is OuterWallCornerId => id.startsWith('outcorner_')
export const isOpeningId = (id: string): id is OpeningId => id.startsWith('opening_')

// Entity type definitions for hit testing
export type EntityType = 'storey' | 'perimeter' | 'wall-segment' | 'outer-corner' | 'opening'
