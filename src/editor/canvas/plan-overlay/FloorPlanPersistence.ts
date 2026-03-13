import { useAuthStore } from '@/app/user/store'
import { isSupabaseConfigured } from '@/app/user/supabaseClient'
import type { StoreyId } from '@/building/model/ids'
import type { ProjectId } from '@/projects/types'

import { getFloorPlanCloudStorage } from './FloorPlanCloudStorage'
import {
  deleteAllImagesForProject,
  deleteAllSettingsForProject,
  deleteImageFromLocal,
  deleteSettingsFromLocal,
  loadImageFromLocal,
  loadSettingsFromLocal,
  saveImageToLocal,
  saveSettingsToLocal
} from './FloorPlanLocalStorage'
import {
  FLOOR_PLANS_STORE_VERSION,
  type FloorPlanImageData,
  type PersistedFloorPlanMetadata,
  type PersistedFloorPlansState,
  createPersistedFloorPlansState,
  serializeFloorPlanMetadata
} from './persistedTypes'
import type { FloorPlanCalibration, FloorPlanOrigin, FloorPlanPlacement } from './types'

export interface FloorPlanLoadResult {
  metadata: PersistedFloorPlanMetadata
  imageBlob: Blob
  placement: FloorPlanPlacement
  opacity: number
}

export class FloorPlanPersistence {
  async saveFloorPlan(
    projectId: ProjectId,
    storeyId: StoreyId,
    imageData: FloorPlanImageData,
    calibration: FloorPlanCalibration,
    origin: FloorPlanOrigin,
    placement: FloorPlanPlacement,
    opacity: number
  ): Promise<void> {
    await saveImageToLocal(projectId, storeyId, imageData)
    saveSettingsToLocal(projectId, storeyId, placement, opacity)

    if (isSupabaseConfigured()) {
      const cloudStorage = getFloorPlanCloudStorage()
      const userId = useAuthStore.getState().user?.id

      if (cloudStorage && userId) {
        try {
          await cloudStorage.uploadImage(userId, projectId, storeyId, imageData)

          const existingMetadata = await this.loadAllMetadataFromCloud(projectId)
          const metadata = serializeFloorPlanMetadata(
            storeyId,
            imageData.fileName,
            imageData.blob.size,
            imageData.blob.size,
            calibration,
            origin
          )

          const updatedPlans = {
            ...existingMetadata?.plans,
            [storeyId]: metadata
          }

          await cloudStorage.syncMetadata(
            projectId,
            createPersistedFloorPlansState(updatedPlans),
            FLOOR_PLANS_STORE_VERSION
          )
        } catch (error) {
          console.error('Failed to sync floor plan to cloud:', error)
        }
      }
    }
  }

  async loadFloorPlansForProject(projectId: ProjectId): Promise<FloorPlanLoadResult[]> {
    const results: FloorPlanLoadResult[] = []

    const cloudMetadata = await this.loadAllMetadataFromCloud(projectId)

    if (cloudMetadata) {
      for (const [storeyId, metadata] of Object.entries(cloudMetadata.plans)) {
        const typedStoreyId = storeyId as StoreyId
        const imageBlob = await this.loadImage(projectId, typedStoreyId, metadata.imageFileName)

        if (imageBlob) {
          const settings = loadSettingsFromLocal(projectId, typedStoreyId)

          results.push({
            metadata,
            imageBlob,
            placement: settings?.placement ?? 'over',
            opacity: settings?.opacity ?? 0.45
          })
        }
      }
    }

    return results
  }

  private async loadImage(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<Blob | null> {
    let imageBlob = await loadImageFromLocal(projectId, storeyId)

    if (!imageBlob && isSupabaseConfigured()) {
      const cloudStorage = getFloorPlanCloudStorage()
      const userId = useAuthStore.getState().user?.id

      if (cloudStorage && userId) {
        imageBlob = await cloudStorage.downloadImage(userId, projectId, storeyId, fileName)

        if (imageBlob) {
          await saveImageToLocal(projectId, storeyId, { blob: imageBlob, fileName })
        }
      }
    }

    return imageBlob
  }

  async deleteFloorPlan(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<void> {
    await deleteImageFromLocal(projectId, storeyId)
    deleteSettingsFromLocal(projectId, storeyId)

    if (isSupabaseConfigured()) {
      const cloudStorage = getFloorPlanCloudStorage()
      const userId = useAuthStore.getState().user?.id

      if (cloudStorage && userId) {
        try {
          await cloudStorage.deleteImage(userId, projectId, storeyId, fileName)

          const existingMetadata = await this.loadAllMetadataFromCloud(projectId)
          if (existingMetadata) {
            const { [storeyId]: _, ...remainingPlans } = existingMetadata.plans
            await cloudStorage.syncMetadata(
              projectId,
              createPersistedFloorPlansState(remainingPlans as Record<StoreyId, PersistedFloorPlanMetadata>),
              FLOOR_PLANS_STORE_VERSION
            )
          }
        } catch (error) {
          console.error('Failed to delete floor plan from cloud:', error)
        }
      }
    }
  }

  async deleteAllFloorPlansForProject(projectId: ProjectId): Promise<void> {
    await deleteAllImagesForProject(projectId)
    deleteAllSettingsForProject(projectId)

    if (isSupabaseConfigured()) {
      const cloudStorage = getFloorPlanCloudStorage()
      const userId = useAuthStore.getState().user?.id

      if (cloudStorage && userId) {
        try {
          await cloudStorage.deleteAllImagesForProject(userId, projectId)
        } catch (error) {
          console.error('Failed to delete floor plans from cloud:', error)
        }
      }
    }
  }

  private async loadAllMetadataFromCloud(projectId: ProjectId): Promise<PersistedFloorPlansState | null> {
    if (!isSupabaseConfigured()) {
      return null
    }

    const cloudStorage = getFloorPlanCloudStorage()
    if (!cloudStorage) {
      return null
    }

    try {
      const result = await cloudStorage.loadMetadata(projectId)
      return result.metadata
    } catch (error) {
      console.error('Failed to load floor plans metadata from cloud:', error)
      return null
    }
  }
}

let persistenceInstance: FloorPlanPersistence | null = null

export function getFloorPlanPersistence(): FloorPlanPersistence {
  persistenceInstance ??= new FloorPlanPersistence()
  return persistenceInstance
}
