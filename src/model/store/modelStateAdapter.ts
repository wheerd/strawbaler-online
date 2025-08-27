import type { Store } from './types'
import type { Wall, Room, Point, Floor } from '@/types/model'
import type { WallId, RoomId, PointId, FloorId } from '@/types/ids'

/**
 * ModelState interface that the room detection engine expects
 * This matches what the legacy room detection service was designed for
 */
export interface ModelState {
  floors: Map<FloorId, Floor>
  walls: Map<WallId, Wall>
  points: Map<PointId, Point>
  rooms: Map<RoomId, Room>
}

/**
 * Adapter to convert the sliced store state to the ModelState interface
 * that the room detection engine expects
 */
export function createModelState(store: Store): ModelState {
  return {
    floors: store.floors,
    walls: store.walls,
    points: store.points,
    rooms: store.rooms
  }
}