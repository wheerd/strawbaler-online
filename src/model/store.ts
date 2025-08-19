import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ModelState, Wall, Room, ConnectionPoint, Opening, Floor, Point2D, Bounds } from '../types/model'
import type { WallId, ConnectionPointId, FloorId, RoomId, OpeningId } from '../types/ids'
import {
  createEmptyModelState,
  createFloor,
  createWall,
  createRoom,
  createConnectionPoint,
  createOpening,
  addFloorToState,
  addWallToState,
  addRoomToState,
  addConnectionPointToState,
  addConnectionPointToFloor,
  addOpeningToState,
  removeWallFromState,
  calculateStateBounds,
  calculateFloorBounds,
  calculateRoomArea
} from './operations'

interface ModelActions {
  reset: () => void

  addFloor: (name: string, level: number, height?: number) => Floor
  addWall: (startPointId: ConnectionPointId, endPointId: ConnectionPointId, thickness?: number, height?: number) => Wall
  addRoom: (name: string, wallIds?: WallId[]) => Room
  addConnectionPoint: (position: Point2D, floorId?: FloorId) => ConnectionPoint
  addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number) => Opening
  removeWall: (wallId: WallId) => void
  getActiveFloorBounds: () => Bounds | null
}

type ModelStore = ModelState & ModelActions

function createInitialState (): ModelState {
  return createEmptyModelState()
}

export const useModelStore = create<ModelStore>()(
  devtools(
    (set, get) => ({
      ...createInitialState(),

      reset: () => {
        const newState = createEmptyModelState()
        set(newState, false, 'reset')
      },

      addFloor: (name: string, level: number, height: number = 3000): Floor => {
        const state = get()
        const floor = createFloor(name, level, height)
        const updatedState = addFloorToState(state, floor)

        set(updatedState, false, 'addFloor')
        return floor
      },

      addWall: (startPointId: ConnectionPointId, endPointId: ConnectionPointId, thickness: number = 200, height: number = 3000): Wall => {
        const state = get()
        const wall = createWall(startPointId, endPointId, thickness, height)
        let updatedState = addWallToState(state, wall)

        const bounds = calculateStateBounds(updatedState)
        updatedState = { ...updatedState, bounds: bounds ?? undefined }

        set(updatedState, false, 'addWall')
        return wall
      },

      addRoom: (name: string, wallIds: WallId[] = []): Room => {
        const state = get()
        const room = createRoom(name, wallIds)

        const area = calculateRoomArea(room, state)
        const roomWithArea = { ...room, area }

        const updatedState = addRoomToState(state, roomWithArea)

        set(updatedState, false, 'addRoom')
        return roomWithArea
      },

      addConnectionPoint: (position: Point2D, floorId?: FloorId): ConnectionPoint => {
        const state = get()
        const connectionPoint = createConnectionPoint(position)
        
        // If no floorId provided, use the first available floor
        const targetFloorId = floorId || Array.from(state.floors.keys())[0]
        
        let updatedState: ModelState
        if (targetFloorId) {
          updatedState = addConnectionPointToFloor(state, connectionPoint, targetFloorId)
        } else {
          updatedState = addConnectionPointToState(state, connectionPoint)
        }

        set(updatedState, false, 'addConnectionPoint')
        return connectionPoint
      },

      addOpening: (wallId: WallId, type: Opening['type'], offsetFromStart: number, width: number, height: number, sillHeight?: number): Opening => {
        const state = get()
        const opening = createOpening(wallId, type, offsetFromStart, width, height, sillHeight)
        const updatedState = addOpeningToState(state, opening)

        set(updatedState, false, 'addOpening')
        return opening
      },

      removeWall: (wallId: WallId) => {
        const state = get()
        let updatedState = removeWallFromState(state, wallId)

        const bounds = calculateStateBounds(updatedState)
        updatedState = { ...updatedState, bounds: bounds ?? undefined }

        set(updatedState, false, 'removeWall')
      },

      getActiveFloorBounds: (): Bounds | null => {
        const state = get()
        // We need to get the active floor ID from the editor store
        // For now, just return bounds from the first floor
        const firstFloorId = Array.from(state.floors.keys())[0]
        if (firstFloorId) {
          return calculateFloorBounds(firstFloorId, state)
        }
        return null
      }
    }),
    {
      name: 'strawbaler-model-store'
    }
  )
)

export const useFloors = (): Map<FloorId, Floor> => useModelStore(state => state.floors)
export const useWalls = (): Map<WallId, Wall> => useModelStore(state => state.walls)
export const useRooms = (): Map<RoomId, Room> => useModelStore(state => state.rooms)
export const useConnectionPoints = (): Map<ConnectionPointId, ConnectionPoint> => useModelStore(state => state.connectionPoints)
export const useOpenings = (): Map<OpeningId, Opening> => useModelStore(state => state.openings)

export const getActiveFloor = (floors: Map<FloorId, Floor>, activeFloorId: FloorId): Floor | null => {
  const floor = floors.get(activeFloorId)
  return floor ?? null
}