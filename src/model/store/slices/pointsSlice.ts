import type { StateCreator } from 'zustand'
import type { Point } from '@/types/model'
import type { PointId, RoomId } from '@/types/ids'
import { createPointId } from '@/types/ids'
import type { Point2D, Length } from '@/types/geometry'
import { distanceSquared } from '@/types/geometry'

export interface PointsState {
  points: Map<PointId, Point>
}

export interface PointsActions {
  // CRUD operations
  addPoint: (position: Point2D) => Point
  removePoint: (pointId: PointId) => void

  // Point modifications
  movePoint: (pointId: PointId, position: Point2D) => void

  // Point queries
  getPointById: (pointId: PointId) => Point | null
  findNearestPoint: (target: Point2D, maxDistance?: Length) => Point | null
  getPoints: () => Point[]

  // Floor entity management
  addRoomToPoint: (pointId: PointId, roomId: RoomId) => void
  removeRoomFromPoint: (pointId: PointId, roomId: RoomId) => void
}

export type PointsSlice = PointsState & PointsActions

export const createPointsSlice: StateCreator<
PointsSlice,
[],
[],
PointsSlice
> = (set, get) => ({
  points: new Map<PointId, Point>(),

  // CRUD operations
  addPoint: (position: Point2D) => {
    const pointId = createPointId()

    const point: Point = {
      id: pointId,
      position,
      roomIds: new Set<RoomId>()
    }

    set((state) => ({
      ...state,
      points: new Map(state.points).set(pointId, point)
    }))

    return point
  },

  removePoint: (pointId: PointId) => {
    set((state) => {
      const newPoints = new Map(state.points)
      newPoints.delete(pointId)
      return {
        ...state,
        points: newPoints
      }
    })
  },

  // Point modifications
  movePoint: (pointId: PointId, position: Point2D) => {
    set((state) => {
      const point = state.points.get(pointId)
      if (point == null) return state

      const updatedPoint: Point = {
        ...point,
        position
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  },

  // Point queries
  getPointById: (pointId: PointId) => {
    const state = get()
    return state.points.get(pointId) ?? null
  },

  findNearestPoint: (target: Point2D, maxDistance?: Length) => {
    const state = get()

    let nearestPoint: Point | null = null
    let minDistanceSquared = maxDistance !== undefined ? maxDistance * maxDistance : Infinity

    for (const point of state.points.values()) {
      const distSquared = distanceSquared(point.position, target)

      // Update nearest if this is closer
      if (distSquared < minDistanceSquared) {
        minDistanceSquared = distSquared
        nearestPoint = point
      }
    }

    return nearestPoint
  },

  getPoints: () => {
    const state = get()
    return Array.from(state.points.values())
  },

  // Floor entity management
  addRoomToPoint: (pointId: PointId, roomId: RoomId) => {
    set((state) => {
      const point = state.points.get(pointId)
      if (point == null) return state

      // Don't add if already present
      if (point.roomIds.has(roomId)) return state

      const updatedPoint: Point = {
        ...point,
        roomIds: new Set(point.roomIds).add(roomId)
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  },

  removeRoomFromPoint: (pointId: PointId, roomId: RoomId) => {
    set((state) => {
      const point = state.points.get(pointId)
      if (point == null) return state

      const newRoomIds = new Set(point.roomIds)
      newRoomIds.delete(roomId)

      const updatedPoint: Point = {
        ...point,
        roomIds: newRoomIds
      }

      return {
        ...state,
        points: new Map(state.points).set(pointId, updatedPoint)
      }
    })
  }
})
