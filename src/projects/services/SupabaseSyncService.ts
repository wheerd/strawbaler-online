import type { SupabaseClient, User } from '@supabase/supabase-js'

import { getSupabaseClient, isSupabaseConfigured } from '@/app/user/supabaseClient'
import type { StoreyId } from '@/building/model/ids'
import {
  type ProjectData,
  type ProjectId,
  type ProjectListItem,
  type ProjectMeta,
  type UpdatableProjectMeta,
  parseTimestamp
} from '@/projects/types'

const FLOOR_PLANS_BUCKET = 'floor-plans'

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? (parts.pop() ?? 'png') : 'png'
}

function buildFloorPlanPath(userId: string, projectId: ProjectId, storeyId: StoreyId, fileName: string): string {
  const ext = getFileExtension(fileName)
  return `${userId}/${projectId}/${storeyId}.${ext}`
}

interface CloudProjectRow {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  model_state: unknown
  model_version: number
  config_state: unknown
  config_version: number
  materials_state: unknown
  materials_version: number
  parts_state: unknown
  parts_version: number
  floor_plans_state: unknown
  floor_plans_version: number
}

export type StoreType = 'model' | 'config' | 'materials' | 'parts' | 'floorPlans'

export interface ICloudSyncService {
  initialize(): Promise<void>
  destroy(): void
  isReady(): boolean

  syncStore(projectId: ProjectId, store: StoreType, data: unknown, version: number): Promise<void>
  loadProject(projectId: ProjectId): Promise<ProjectData>
  createProject(userId: string, projectData: ProjectData): Promise<void>
  upsertProject(userId: string, projectData: ProjectData): Promise<void>
  updateProjectMeta(projectId: ProjectId, meta: Partial<Pick<ProjectMeta, 'name' | 'description'>>): Promise<void>
  deleteProject(projectId: ProjectId): Promise<void>

  loadProjectList(): Promise<ProjectListItem[]>

  getCurrentUserId(): string | null
  isAuthenticated(): boolean

  uploadFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, blob: Blob, fileName: string): Promise<string>
  downloadFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<Blob | null>
  deleteFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<void>
}

let syncService: ICloudSyncService | null = null
export function getCloudSyncService(): ICloudSyncService | null {
  if (!isSupabaseConfigured()) {
    return null
  }

  syncService ??= new SupabaseSyncService()
  return syncService
}

export class SupabaseSyncService implements ICloudSyncService {
  private client: SupabaseClient
  private currentUser: User | null = null
  private authSubscription: { unsubscribe: () => void } | null = null

  constructor() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured')
    }
    this.client = getSupabaseClient()
  }

  async initialize(): Promise<void> {
    const {
      data: { user }
    } = await this.client.auth.getUser()
    this.currentUser = user

    this.authSubscription = this.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser = session?.user ?? null
    }).data.subscription
  }

  destroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
      this.authSubscription = null
    }
  }

  isReady(): boolean {
    return isSupabaseConfigured() && this.currentUser !== null
  }

  getCurrentUserId(): string | null {
    return this.currentUser?.id ?? null
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null
  }

  async syncStore(projectId: ProjectId, column: StoreType, data: unknown, version: number): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const dbColumn = column === 'floorPlans' ? 'floor_plans' : column
    const { error } = await this.client
      .from('projects')
      .update({
        [`${dbColumn}_state`]: data,
        [`${dbColumn}_version`]: version,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to sync ${column}: ${error.message}`)
    }
  }

  async loadProject(projectId: ProjectId): Promise<ProjectData> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const result = await this.client.from('projects').select('*').eq('id', projectId).single()

    if (result.error) {
      throw new Error(`Failed to load project: ${result.error.message}`)
    }

    const row = result.data as CloudProjectRow

    return {
      projectId: row.id as ProjectId,
      modelState: row.model_state,
      modelVersion: row.model_version,
      configState: row.config_state,
      configVersion: row.config_version,
      materialsState: row.materials_state,
      materialsVersion: row.materials_version,
      partsState: row.parts_state,
      partsVersion: row.parts_version,
      floorPlansState: row.floor_plans_state,
      floorPlansVersion: row.floor_plans_version,
      name: row.name,
      description: row.description ?? undefined,
      createdAt: parseTimestamp(row.created_at),
      updatedAt: parseTimestamp(row.updated_at)
    }
  }

  async createProject(userId: string, projectData: ProjectData): Promise<void> {
    const row: Partial<CloudProjectRow> = {
      id: projectData.projectId,
      user_id: userId,
      name: projectData.name,
      description: projectData.description ?? null,
      model_state: projectData.modelState,
      model_version: projectData.modelVersion,
      config_state: projectData.configState,
      config_version: projectData.configVersion,
      materials_state: projectData.materialsState,
      materials_version: projectData.materialsVersion,
      parts_state: projectData.partsState,
      parts_version: projectData.partsVersion,
      floor_plans_state: projectData.floorPlansState,
      floor_plans_version: projectData.floorPlansVersion,
      created_at: projectData.createdAt,
      updated_at: projectData.updatedAt
    }
    const { error } = await this.client.from('projects').insert(row)

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`)
    }
  }

  async upsertProject(userId: string, projectData: ProjectData): Promise<void> {
    const row = {
      id: projectData.projectId,
      user_id: userId,
      name: projectData.name,
      description: projectData.description ?? null,
      model_state: projectData.modelState,
      model_version: projectData.modelVersion,
      config_state: projectData.configState,
      config_version: projectData.configVersion,
      materials_state: projectData.materialsState,
      materials_version: projectData.materialsVersion,
      parts_state: projectData.partsState,
      parts_version: projectData.partsVersion,
      floor_plans_state: projectData.floorPlansState,
      floor_plans_version: projectData.floorPlansVersion,
      created_at: projectData.createdAt,
      updated_at: projectData.updatedAt
    }

    const { error } = await this.client.from('projects').upsert(row, { onConflict: 'id' })

    if (error) {
      throw new Error(`Failed to upsert project: ${error.message}`)
    }
  }

  async updateProjectMeta(projectId: ProjectId, meta: Partial<UpdatableProjectMeta>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const { error } = await this.client
      .from('projects')
      .update({
        ...meta,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (error) {
      throw new Error(`Failed to update project meta: ${error.message}`)
    }
  }

  async deleteProject(projectId: ProjectId): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    await this.deleteAllFloorPlansForProject(projectId)

    const { error } = await this.client.from('projects').delete().eq('id', projectId)

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`)
    }
  }

  async uploadFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, blob: Blob, fileName: string): Promise<string> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const path = buildFloorPlanPath(this.currentUser.id, projectId, storeyId, fileName)

    const { error } = await this.client.storage.from(FLOOR_PLANS_BUCKET).upload(path, blob, {
      upsert: true,
      contentType: blob.type
    })

    if (error) {
      throw new Error(`Failed to upload floor plan image: ${error.message}`)
    }

    return path
  }

  async downloadFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<Blob | null> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const path = buildFloorPlanPath(this.currentUser.id, projectId, storeyId, fileName)

    const { data, error } = await this.client.storage.from(FLOOR_PLANS_BUCKET).download(path)

    if (error) {
      return null
    }

    return data
  }

  async deleteFloorPlanImage(projectId: ProjectId, storeyId: StoreyId, fileName: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const path = buildFloorPlanPath(this.currentUser.id, projectId, storeyId, fileName)

    const { error } = await this.client.storage.from(FLOOR_PLANS_BUCKET).remove([path])

    if (error) {
      console.error(`Failed to delete floor plan image: ${error.message}`)
    }
  }

  private async deleteAllFloorPlansForProject(projectId: ProjectId): Promise<void> {
    if (!this.currentUser) {
      return
    }

    const folderPath = `${this.currentUser.id}/${projectId}`

    const { data, error } = await this.client.storage.from(FLOOR_PLANS_BUCKET).list(folderPath)

    if (error) {
      console.error(`Failed to list floor plan images: ${error.message}`)
      return
    }

    if (data.length === 0) {
      return
    }

    const filesToDelete = data.map(file => `${folderPath}/${file.name}`)

    const { error: deleteError } = await this.client.storage.from(FLOOR_PLANS_BUCKET).remove(filesToDelete)

    if (deleteError) {
      console.error(`Failed to delete floor plan images: ${deleteError.message}`)
    }
  }

  async loadProjectList(): Promise<ProjectListItem[]> {
    if (!this.currentUser) {
      throw new Error('Not authenticated')
    }

    const result = await this.client
      .from('projects')
      .select('id, name, description, updated_at')
      .order('updated_at', { ascending: false })

    if (result.error) {
      throw new Error(`Failed to load project list: ${result.error.message}`)
    }

    return result.data.map(row => ({
      id: row.id as ProjectId,
      name: row.name as string,
      description: (row.description ?? undefined) as string | undefined,
      updatedAt: parseTimestamp(row.updated_at as string)
    }))
  }
}
