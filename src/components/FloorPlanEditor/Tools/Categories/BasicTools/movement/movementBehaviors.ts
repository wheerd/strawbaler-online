import type { EntityType } from '@/types/ids'
import type { MovementBehavior } from './MovementBehavior'
import { OuterWallPolygonMovementBehavior } from './behaviors/OuterWallPolygonMovementBehavior'
import { WallSegmentMovementBehavior } from './behaviors/WallSegmentMovementBehavior'
import { OuterCornerMovementBehavior } from './behaviors/OuterCornerMovementBehavior'
import { OpeningMovementBehavior } from './behaviors/OpeningMovementBehavior'

const MOVEMENT_BEHAVIORS: Record<EntityType, MovementBehavior | null> = {
  'outer-wall': new OuterWallPolygonMovementBehavior(),
  'wall-segment': new WallSegmentMovementBehavior(),
  'outer-corner': new OuterCornerMovementBehavior(),
  opening: new OpeningMovementBehavior(),
  floor: null // Not implemented yet
}

export function getMovementBehavior(entityType: EntityType): MovementBehavior | null {
  return MOVEMENT_BEHAVIORS[entityType] || null
}
