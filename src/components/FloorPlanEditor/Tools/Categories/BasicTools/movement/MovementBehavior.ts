import type { SnapResult } from '@/model/store/services/snapping/types'
import type { Vec2 } from '@/types/geometry'
import type { SelectableId, EntityType } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { SnappingService } from '@/model/store/services/snapping/SnappingService'
import type React from 'react'

export interface MovementContext {
  entityId: SelectableId
  entityType: EntityType
  parentIds: SelectableId[]
  startPosition: Vec2
  currentPosition: Vec2
  store: StoreActions
  snappingService: SnappingService
}

export interface MovementState {
  snapResult: SnapResult | null
  isValidPosition: boolean
  finalPosition: Vec2 // The position after constraints/snapping
}

export interface MovementBehavior {
  // Apply constraints and snapping - returns final position and snap info
  constrainAndSnap(targetPosition: Vec2, context: MovementContext): MovementState

  // Validate position using slice logic - behavior constructs geometry, slice validates
  validatePosition(finalPosition: Vec2, context: MovementContext): boolean

  // Generate preview with full state
  generatePreview(movementState: MovementState, context: MovementContext): React.ReactNode[]

  // Commit movement using slice operations
  commitMovement(finalPosition: Vec2, context: MovementContext): boolean
}
