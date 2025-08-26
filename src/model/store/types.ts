import type { WallsActions, WallsState } from './slices/wallsSlice'
import type { PointsActions, PointsState } from './slices/pointsSlice'
import type { RoomsActions, RoomsState } from './slices/roomsSlice'
import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { CornersActions, CornersState } from './slices/cornersSlice'

export interface StoreState extends WallsState, PointsState, RoomsState, FloorsState, CornersState {}

export interface StoreActions extends
  WallsActions,
  PointsActions,
  RoomsActions,
  FloorsActions,
  CornersActions {

  reset: () => void
}

export type Store = StoreState & StoreActions
