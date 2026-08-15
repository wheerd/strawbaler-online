import type { StoreyId } from '@/building/model/ids'
import type { Bounds2D } from '@/shared/geometry'

import type { ConstraintsActions, ConstraintsState } from './slices/constraintsSlice'
import type { FloorsActions, FloorsState } from './slices/floorsSlice'
import type { IntermediateWallsActions, IntermediateWallsState } from './slices/intermediateWallsSlice'
import type { PerimetersActions, PerimetersState } from './slices/perimeterSlice'
import type { RoofsActions, RoofsState } from './slices/roofsSlice'
import type { StoreysActions, StoreysState } from './slices/storeysSlice'
import type { TimestampsActions, TimestampsState } from './slices/timestampsSlice'
import type { WallEntitiesActions, WallEntitiesState } from './slices/wallEntitiesSlice'

export interface StoreState
  extends
    StoreysState,
    PerimetersState,
    WallEntitiesState,
    FloorsState,
    RoofsState,
    TimestampsState,
    ConstraintsState,
    IntermediateWallsState {}

export interface StoreActions
  extends
    StoreysActions,
    PerimetersActions,
    WallEntitiesActions,
    FloorsActions,
    RoofsActions,
    TimestampsActions,
    ConstraintsActions,
    IntermediateWallsActions {
  reset: () => void
  getBounds: (storeyId: StoreyId) => Bounds2D
}

export type Store = StoreState & { actions: StoreActions }

export type PartializedStoreState = Omit<
  Store,
  | 'actions'
  | '_perimeterGeometry'
  | '_perimeterWallGeometry'
  | '_perimeterCornerGeometry'
  | '_openingGeometry'
  | '_wallPostGeometry'
  | '_constraintsByEntity'
  | '_intermediateWallGeometry'
  | '_wallNodeGeometry'
>
