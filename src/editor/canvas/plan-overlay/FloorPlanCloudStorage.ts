import type { SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import type { StoreyId } from '@/building/model/ids'
import type { ProjectId } from '@/projects/types'

import type { FloorPlanImageData, PersistedFloorPlanMetadata, PersistedFloorPlansState } from './persistedTypes'

const BUCKET_NAME = 'floor-plans'

function getExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? (parts.pop() ?? 'png') : 'png'
}

function buildStoragePath(userId: string, projectId: ProjectId, storeyId: StoreyId, fileName: string): string {
  const ext = getExtension(fileName)
  return `${userId}/${projectId}/${storeyId}.${ext}`
}

export class FloorPlanCloudStorage {
  private client: SupabaseClient

  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured')
    }
    this.client = getSupabaseClient()
  }

  async uploadImage(
    userId: string,
    projectId: ProjectId,
    storeyId: StoreyId,
    imageData: FloorPlanImageData
  ): Promise<string> {
    const path = buildStoragePath(userId, projectId, storeyId, imageData.fileName)

    const { error } = await this.client.storage.from(BUCKET_NAME).upload(path, imageData.blob, {
      upsert: true,
      contentType: imageData.blob.type
    })

    if (error) {
      throw new Error(`Failed to upload floor plan image: ${error.message}`)
    }

    return path
  }

  async downloadImage(
    userId: string,
    projectId: ProjectId,
    storeyId: StoreyId,
    fileName: string
  ): Promise<Blob | null> {
    const path = buildStoragePath(userId, projectId, storeyId, fileName)

    const { data, error } = await this.client.storage.from(BUCKET_NAME).download(path)

    if (error) {
      return null
    }

    return data
  }

  async deleteImage(userId: string, projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<void> {
    const path = buildStoragePath(userId, projectId, storeyId, fileName)

    const { error } = await this.client.storage.from(BUCKET_NAME).remove([path])

    if (error) {
      console.error(`Failed to delete floor plan image: ${error.message}`)
    }
  }

  async deleteAllImagesForProject(userId: string, projectId: ProjectId): Promise<void> {
    const folderPath = `${userId}/${projectId}`

    const { data, error } = await this.client.storage.from(BUCKET_NAME).list(folderPath)

    if (error) {
      console.error(`Failed to list floor plan images: ${error.message}`)
      return
    }

    if (data.length === 0) {
      return
    }

    const filesToDelete = data.map(file => `${folderPath}/${file.name}`)

    const { error: deleteError } = await this.client.storage.from(BUCKET_NAME).remove(filesToDelete)

    if (deleteError) {
      console.error(`Failed to delete floor plan images: ${deleteError.message}`)
    }
  }

  async syncMetadata(projectId: ProjectId, metadata: PersistedFloorPlansState, version: number): Promise<void> {
    const { error } = await this.client
      .from('projects')
      .update({
        floor_plans_state: metadata.plans,
        floor_plans_version: version,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to sync floor plans metadata: ${error.message}`)
    }
  }

  async loadMetadata(projectId: ProjectId): Promise<{ metadata: PersistedFloorPlansState | null; version: number }> {
    const { data, error } = await this.client
      .from('projects')
      .select('floor_plans_state, floor_plans_version')
      .eq('id', projectId)
      .single()

    if (error) {
      throw new Error(`Failed to load floor plans metadata: ${error.message}`)
    }

    const floorPlansState = data.floor_plans_state as Record<StoreyId, PersistedFloorPlanMetadata> | null
    if (!floorPlansState || Object.keys(floorPlansState).length === 0) {
      const emptyVersion = (data.floor_plans_version as number | undefined) ?? 1
      return { metadata: null, version: emptyVersion }
    }

    const version = (data.floor_plans_version as number | undefined) ?? 1
    return {
      metadata: {
        version,
        plans: floorPlansState
      },
      version
    }
  }
}

let cloudStorageInstance: FloorPlanCloudStorage | null = null

export function getFloorPlanCloudStorage(): FloorPlanCloudStorage | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  cloudStorageInstance ??= new FloorPlanCloudStorage()
  return cloudStorageInstance
}
