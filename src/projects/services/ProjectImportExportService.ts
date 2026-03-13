import type { StoreyId } from '@/building/model/ids'
import { MODEL_STORE_VERSION, type PartializedStoreState, exportModelState, hydrateModelState } from '@/building/store'
import { CONFIG_STORE_VERSION, type ConfigState, getConfigState, hydrateConfigState } from '@/config/store'
import { exportFloorPlansState, getFloorPlanActions, importFloorPlansState } from '@/editor/canvas/plan-overlay/store'
import type { CloudFloorPlan, CloudFloorPlansState } from '@/editor/canvas/plan-overlay/store/types'
import type { FloorPlanCalibration, FloorPlanImageMetadata, FloorPlanOrigin } from '@/editor/canvas/plan-overlay/types'
import {
  MATERIALS_STORE_VERSION,
  type MaterialsState,
  getMaterialsState,
  hydrateMaterialsState
} from '@/materials/store'
import { PARTS_STORE_VERSION, type PartializedPartsState, exportPartsState, hydratePartsState } from '@/parts/store'
import {
  type ExportedProjectMeta,
  PROJECTS_STORE_VERSION,
  exportProjectMeta,
  hydrateProjectMeta
} from '@/projects/store'

import { LegacyProjectImportService } from './LegacyProjectImportService'
import { base64ToBlob, blobToBase64 } from './blobSerialization'

export interface StoreExport<T> {
  state: T
  version: number
}

export interface ExportableFloorPlan {
  storeyId: StoreyId
  imageMeta: FloorPlanImageMetadata
  imageBase64: string
  calibration: FloorPlanCalibration
  origin: FloorPlanOrigin
}

export interface ExportableFloorPlansState {
  plans: Record<StoreyId, ExportableFloorPlan>
}

export interface ExportDataV2 {
  version: '2.0.0'
  timestamp: string
  stores: {
    project: StoreExport<ExportedProjectMeta>
    model: StoreExport<PartializedStoreState>
    config: StoreExport<ConfigState>
    materials: StoreExport<MaterialsState>
    parts: StoreExport<PartializedPartsState>
    floorPlans?: StoreExport<ExportableFloorPlansState>
  }
}

export interface ExportOptions {
  includeFloorPlans: boolean
}

export interface IProjectImportExportService {
  exportToString(options?: ExportOptions): Promise<string>
  importFromString(content: string): void
}

async function convertFloorPlansToExportable(state: CloudFloorPlansState): Promise<ExportableFloorPlansState> {
  const plans: Record<StoreyId, ExportableFloorPlan> = {}

  for (const [storeyId, plan] of Object.entries(state.plans)) {
    const typedStoreyId = storeyId as StoreyId
    const imageBase64 = await blobToBase64(plan.image)
    plans[typedStoreyId] = {
      storeyId: plan.storeyId,
      imageMeta: plan.imageMeta,
      imageBase64,
      calibration: plan.calibration,
      origin: plan.origin
    }
  }

  return { plans }
}

function convertExportableToFloorPlansState(state: ExportableFloorPlansState): CloudFloorPlansState {
  const plans: Record<StoreyId, CloudFloorPlan> = {}

  for (const [storeyId, plan] of Object.entries(state.plans)) {
    const typedStoreyId = storeyId as StoreyId
    const image = base64ToBlob(plan.imageBase64, plan.imageMeta.type)
    plans[typedStoreyId] = {
      storeyId: plan.storeyId,
      imageMeta: plan.imageMeta,
      image,
      calibration: plan.calibration,
      origin: plan.origin
    }
  }

  return { plans }
}

const FLOOR_PLANS_STORE_VERSION = 1

class ProjectJSONService implements IProjectImportExportService {
  async exportToString(options?: ExportOptions): Promise<string> {
    const includeFloorPlans = options?.includeFloorPlans ?? false

    const data: ExportDataV2 = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      stores: {
        project: {
          state: exportProjectMeta(),
          version: PROJECTS_STORE_VERSION
        },
        model: {
          state: exportModelState(),
          version: MODEL_STORE_VERSION
        },
        config: {
          state: getConfigState(),
          version: CONFIG_STORE_VERSION
        },
        materials: {
          state: getMaterialsState(),
          version: MATERIALS_STORE_VERSION
        },
        parts: {
          state: exportPartsState(),
          version: PARTS_STORE_VERSION
        }
      }
    }

    if (includeFloorPlans) {
      const floorPlansState = exportFloorPlansState()
      if (Object.keys(floorPlansState.plans).length > 0) {
        const exportableState = await convertFloorPlansToExportable(floorPlansState)
        data.stores.floorPlans = {
          state: exportableState,
          version: FLOOR_PLANS_STORE_VERSION
        }
      }
    }

    return JSON.stringify(data, null, 2)
  }

  importFromString(content: string): void {
    const parsed = JSON.parse(content) as unknown

    if (this.isV2Format(parsed)) {
      this.importV2(parsed)
    } else {
      const result = LegacyProjectImportService.importFromString(content)
      if (!result.success) {
        throw new Error(result.error)
      }
    }
  }

  private isV2Format(data: unknown): data is ExportDataV2 {
    if (typeof data !== 'object' || data === null) return false
    const obj = data as Record<string, unknown>
    return obj.version === '2.0.0'
  }

  private importV2(data: ExportDataV2): void {
    const { stores } = data

    hydrateProjectMeta(stores.project.state)
    hydrateModelState(stores.model.state, stores.model.version)
    hydrateConfigState(stores.config.state, stores.config.version)
    hydrateMaterialsState(stores.materials.state, stores.materials.version)
    hydratePartsState(stores.parts.state, stores.parts.version)

    if (stores.floorPlans) {
      const floorPlansState = convertExportableToFloorPlansState(stores.floorPlans.state)
      importFloorPlansState(floorPlansState, stores.floorPlans.version)
    } else {
      // If no floor plans data is included, clear existing floor plans to avoid stale data
      getFloorPlanActions().reset()
    }
  }
}

export const ProjectImportExportService = new ProjectJSONService()
