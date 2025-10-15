import { vec2 } from 'gl-matrix'
import type React from 'react'

import type { SelectableId } from '@/building/model/ids'
import type { StoreActions } from '@/building/store/types'
import type { SnappingService } from '@/editor/services/snapping/SnappingService'
import type {} from '@/shared/geometry'

export interface MovementContext<T> {
  entityId: SelectableId
  parentIds: SelectableId[]
  entity: T
  store: StoreActions
  snappingService: SnappingService
}

export interface PointerMovementState {
  startPosition: vec2 // Initial pointer position
  currentPosition: vec2 // Current pointer position
  delta: vec2 // pointerCurrentPosition - pointerStartPosition
}

// Base interface that all movement states must implement
export interface MovementState {
  movementDelta: vec2 // The movement delta that represents the actual movement
}

export interface MovementPreviewComponentProps<TEntity, TState> {
  movementState: TState
  isValid: boolean
  context: MovementContext<TEntity>
}

export interface MovementBehavior<TEntity, TState extends MovementState> {
  // Get the entity's actual position for initialization
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): TEntity

  // Called when the movement is started to create an initial state
  initializeState(movementState: PointerMovementState, context: MovementContext<TEntity>): TState

  // Apply constraints and snapping - updates the movement state
  constrainAndSnap(movementState: PointerMovementState, context: MovementContext<TEntity>): TState

  // Validate position using slice logic - behavior constructs geometry, slice validates
  validatePosition(movementState: TState, context: MovementContext<TEntity>): boolean

  // Preview component for rendering movement state
  previewComponent: React.ComponentType<MovementPreviewComponentProps<TEntity, TState>>

  // Commit movement using slice operations
  commitMovement(movementState: TState, context: MovementContext<TEntity>): boolean

  // Apply relative movement based on delta difference from last movement
  // Used for length input to modify last movement with new distance
  applyRelativeMovement(deltaDifference: vec2, context: MovementContext<TEntity>): boolean
}
