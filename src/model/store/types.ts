import type { WallsActions, WallsState } from './slices/wallsSlice'
import type { PointsActions, PointsState } from './slices/pointsSlice'
import type { RoomsActions, RoomsState } from './slices/roomsSlice'
import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { CornersActions, CornersState } from './slices/cornersSlice'
import type { WallsPointsActions } from './slices/wallsPointsSlice'
import type { OuterWallsActions, OuterWallsState } from './slices/outerWallsSlice'

export interface StoreState extends WallsState, PointsState, RoomsState, FloorsState, CornersState, OuterWallsState {}

export interface StoreActions
  extends WallsActions,
    PointsActions,
    RoomsActions,
    FloorsActions,
    CornersActions,
    WallsPointsActions,
    OuterWallsActions {
  reset: () => void
}

export type Store = StoreState & StoreActions
