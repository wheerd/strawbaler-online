import type { StoreyId } from '@/building/model/ids'

import type { FloorPlanCalibration, FloorPlanOrigin, FloorPlanPlacement } from './types'

export const FLOOR_PLANS_STORE_VERSION = 1

export interface PersistedFloorPlanMetadata {
  readonly storeyId: StoreyId
  readonly imageFileName: string
  readonly imageWidth: number
  readonly imageHeight: number
  readonly calibration: FloorPlanCalibration
  readonly origin: FloorPlanOrigin
}

export interface LocalFloorPlanSettings {
  readonly placement: FloorPlanPlacement
  readonly opacity: number
}

export interface LocalFloorPlansSettingsRecord {
  readonly version: number
  readonly settings: Record<StoreyId, LocalFloorPlanSettings>
}

export interface PersistedFloorPlansState {
  readonly version: number
  readonly plans: Record<StoreyId, PersistedFloorPlanMetadata>
}

export interface FloorPlanImageData {
  readonly blob: Blob
  readonly fileName: string
}

export function serializeFloorPlanMetadata(
  storeyId: StoreyId,
  imageFileName: string,
  imageWidth: number,
  imageHeight: number,
  calibration: FloorPlanCalibration,
  origin: FloorPlanOrigin
): PersistedFloorPlanMetadata {
  return {
    storeyId,
    imageFileName,
    imageWidth,
    imageHeight,
    calibration,
    origin
  }
}

export function createLocalFloorPlansSettings(
  settings: Record<StoreyId, LocalFloorPlanSettings>
): LocalFloorPlansSettingsRecord {
  return {
    version: FLOOR_PLANS_STORE_VERSION,
    settings
  }
}

export function createPersistedFloorPlansState(
  plans: Record<StoreyId, PersistedFloorPlanMetadata>
): PersistedFloorPlansState {
  return {
    version: FLOOR_PLANS_STORE_VERSION,
    plans
  }
}
