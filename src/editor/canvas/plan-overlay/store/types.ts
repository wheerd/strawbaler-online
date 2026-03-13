import type { StoreyId } from '@/building/model'
import type {
  FloorPlanCalibration,
  FloorPlanImageMetadata,
  FloorPlanOrigin,
  FloorPlanOverlay,
  FloorPlanPlacement,
  PlanImportPayload,
  PlanRecalibrationPayload
} from '@/editor/canvas/plan-overlay/types'

export interface FloorPlanStoreState {
  plans: Record<StoreyId, FloorPlanOverlay>
}

export interface PartializedFloorPlanStoreState {
  plans: Record<StoreyId, PartializedFloorPlanOverlay>
}

export interface PartializedFloorPlanOverlay {
  readonly floorId: StoreyId
  readonly imageMeta: FloorPlanImageMetadata
  readonly calibration: FloorPlanCalibration
  readonly origin: FloorPlanOrigin
  readonly placement: FloorPlanPlacement
  readonly opacity: number
}

export interface FloorPlanStoreActions {
  importPlan: (payload: PlanImportPayload) => Promise<void>
  setPlacement: (floorId: StoreyId, placement: FloorPlanPlacement) => void
  recalibratePlan: (payload: PlanRecalibrationPayload) => void
  clearPlan: (floorId: StoreyId) => void
  reset: () => void
}

export type FloorPlanStore = FloorPlanStoreState & { actions: FloorPlanStoreActions }

export interface CloudFloorPlan {
  readonly storeyId: StoreyId
  readonly imageMeta: FloorPlanImageMetadata
  readonly image: Blob
  readonly calibration: FloorPlanCalibration
  readonly origin: FloorPlanOrigin
}

export interface CloudFloorPlansState {
  readonly plans: Record<StoreyId, CloudFloorPlan>
}
