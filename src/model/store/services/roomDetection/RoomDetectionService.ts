import type { WallId, FloorId } from '@/types/ids'
import type { Point2D } from '@/types/geometry'
import type { Store } from '../../types'

export interface IRoomDetectionService {
  // Room detection operations
  detectRooms: (floorId: FloorId) => void
  detectRoomAtPoint: (floorId: FloorId, point: Point2D) => void

  // Room merging and splitting
  updateRoomsAfterWallRemoval: (floorId: FloorId, removedWallId: WallId) => void
  updateRoomsAfterWallAddition: (floorId: FloorId, addedWallId: WallId) => void

  // Configuration
  setAutoDetectionEnabled: (enabled: boolean) => void
  isAutoDetectionEnabled: () => boolean
}

export class RoomDetectionService implements IRoomDetectionService {
  private autoDetectionEnabled: boolean = true
  private store: Store

  constructor (store: Store) {
    this.store = store
  }

  setAutoDetectionEnabled (enabled: boolean): void {
    this.autoDetectionEnabled = enabled
  }

  isAutoDetectionEnabled (): boolean {
    return this.autoDetectionEnabled
  }

  detectRooms (floorId: FloorId): void {
    if (!this.autoDetectionEnabled) return

    // Basic room detection implementation
    console.log('Room detection for floor:', floorId)
    
    // TODO: Implement advanced room detection algorithm
    // For now, this is a placeholder that maintains the interface
  }

  detectRoomAtPoint (_floorId: FloorId, _point: Point2D): void {
    if (!this.autoDetectionEnabled) return

    // TODO: Implement point-based room detection
    console.log('Point-based room detection not yet implemented')
  }

  updateRoomsAfterWallRemoval (floorId: FloorId, removedWallId: WallId): void {
    if (!this.autoDetectionEnabled) return

    // Handle room updates after wall removal
    const affectedRooms = this.store.getRoomsContainingWall(removedWallId)
    
    for (const room of affectedRooms) {
      if (room.floorId !== floorId) continue

      // Check if the wall is part of the room's boundary
      if (room.outerBoundary.wallIds.has(removedWallId)) {
        const remainingWallIds = Array.from(room.outerBoundary.wallIds).filter(id => id !== removedWallId)
        
        // If room has too few walls left, remove it
        if (remainingWallIds.length < 3) {
          this.store.removeRoom(room.id)
          continue
        }

        // Update the room boundary
        const remainingPointIds = room.outerBoundary.pointIds.filter(pointId => {
          // Keep points that are still connected to remaining walls
          return this.isPointConnectedToWalls(pointId, remainingWallIds)
        })

        if (remainingPointIds.length >= 3) {
          this.store.updateRoomBoundary(room.id, remainingPointIds, remainingWallIds)
        } else {
          this.store.removeRoom(room.id)
        }
      }

      // Check if it's an interior wall
      if (room.interiorWallIds.has(removedWallId)) {
        this.store.removeInteriorWallFromRoom(room.id, removedWallId)
      }

      // Check holes
      for (let holeIndex = 0; holeIndex < room.holes.length; holeIndex++) {
        const hole = room.holes[holeIndex]
        if (hole.wallIds.has(removedWallId)) {
          this.store.removeHoleFromRoom(room.id, holeIndex)
          break
        }
      }
    }
  }

  updateRoomsAfterWallAddition (floorId: FloorId, addedWallId: WallId): void {
    if (!this.autoDetectionEnabled) return

    const wall = this.store.walls.get(addedWallId)
    if (!wall || wall.floorId !== floorId) return

    // TODO: Implement sophisticated room splitting/creation logic
    // For now, just log the operation
    console.log('Wall addition room update:', addedWallId)
  }

  private isPointConnectedToWalls (pointId: string, wallIds: string[]): boolean {
    return wallIds.some(wallId => {
      const wall = this.store.walls.get(wallId as WallId)
      return wall && (wall.startPointId === pointId || wall.endPointId === pointId)
    })
  }
}

// Create a default singleton instance factory
export const createRoomDetectionService = (store: Store) => new RoomDetectionService(store)