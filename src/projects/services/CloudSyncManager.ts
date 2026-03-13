import { useAuthStore } from '@/app/user/store'
import { isSupabaseConfigured } from '@/app/user/supabaseClient'
import type { StoreyId } from '@/building/model/ids'
import {
  MODEL_STORE_VERSION,
  type PartializedStoreState,
  exportModelState,
  getInitialModelState,
  hydrateModelState,
  subscribeToModelChanges
} from '@/building/store'
import {
  CONFIG_STORE_VERSION,
  getConfigState,
  getInitialConfigState,
  hydrateConfigState,
  subscribeToConfigChanges
} from '@/config/store'
import {
  type CloudFloorPlansState,
  FLOOR_PLANS_STORE_VERSION,
  exportFloorPlansState,
  importFloorPlansState,
  subscribeToFloorPlansRecords
} from '@/editor/canvas/plan-overlay/store'
import {
  MATERIALS_STORE_VERSION,
  getInitialMaterialsState,
  getMaterialsState,
  hydrateMaterialsState,
  subscribeToMaterials
} from '@/materials/store'
import {
  PARTS_STORE_VERSION,
  type PartializedPartsState,
  exportPartsState,
  hydratePartsState,
  usePartsStore
} from '@/parts/store'
import { getProjectActions, getProjectMeta, useProjectsStore } from '@/projects/store'
import type { ProjectData, ProjectId, ProjectListItem } from '@/projects/types'
import { createProjectId, parseTimestamp, timestampNow } from '@/projects/types'

import { type ICloudSyncService, type StoreType, getCloudSyncService } from './SupabaseSyncService'
import { getPersistenceActions } from './persistenceStore'

const SYNC_DEBOUNCE_MS = 3000

type SyncQueueItem = StoreType | 'project_meta'

interface SyncSubscriptions {
  model: () => void
  config: () => void
  materials: () => void
  parts: () => void
  projectMeta: () => void
  floorPlans: () => void
}

export class CloudSyncManager {
  private syncService: ICloudSyncService | null = null
  private syncTimeout: ReturnType<typeof setTimeout> | null = null
  private pendingSyncs = new Set<SyncQueueItem>()
  private syncingEnabled = true
  private subscriptions: SyncSubscriptions | null = null
  private authUnsubscribe: (() => void) | null = null

  async initialize(): Promise<void> {
    if (!isSupabaseConfigured() || this.syncService) {
      return
    }

    this.syncService = getCloudSyncService()
    if (!this.syncService) {
      return
    }

    await this.syncService.initialize()

    if (this.syncService.isAuthenticated()) {
      await this.loadProjectsFromCloud()
      this.setupStoreSubscriptions()
    }

    this.authUnsubscribe = useAuthStore.subscribe(() => {
      if (this.syncService?.isAuthenticated()) {
        void this.loadProjectsFromCloud()
        this.setupStoreSubscriptions()
      } else {
        this.cleanupSubscriptions()
      }
    })
  }

  destroy(): void {
    this.cleanupSubscriptions()
    if (this.authUnsubscribe) {
      this.authUnsubscribe()
      this.authUnsubscribe = null
    }
    if (this.syncService) {
      this.syncService.destroy()
      this.syncService = null
    }
  }

  async syncLocalProjectToCloud(): Promise<void> {
    const service = await this.ensureSyncService()
    const userId = service.getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const { setCloudSyncError, setCloudSyncSuccess, setCloudSyncing } = getPersistenceActions()
    setCloudSyncing(true)
    try {
      const projectMeta = getProjectMeta()
      const modelState = exportModelState()
      const configState = getConfigState()
      const materialsState = getMaterialsState()
      const partsState = usePartsStore.getState()
      const partsLabelState = {
        labels: partsState.labels,
        nextLabelIndexByGroup: partsState.nextLabelIndexByGroup
      }
      const floorPlansState = exportFloorPlansState()
      const floorPlansMetadata = this.extractMetadata(floorPlansState)

      await service.upsertProject(userId, {
        projectId: projectMeta.projectId,
        name: projectMeta.name,
        description: projectMeta.description,
        modelState,
        modelVersion: MODEL_STORE_VERSION,
        configState,
        configVersion: CONFIG_STORE_VERSION,
        materialsState,
        materialsVersion: MATERIALS_STORE_VERSION,
        partsState: partsLabelState,
        partsVersion: PARTS_STORE_VERSION,
        floorPlansState: floorPlansMetadata,
        floorPlansVersion: FLOOR_PLANS_STORE_VERSION,
        createdAt: projectMeta.createdAt,
        updatedAt: projectMeta.updatedAt
      })

      for (const plan of Object.values(floorPlansState.plans)) {
        await service.uploadFloorPlanImage(plan.image, plan.imageMeta.hash)
      }

      setCloudSyncSuccess(new Date())
    } catch (error) {
      setCloudSyncError(error instanceof Error ? error.message : 'Sync failed')
    }
  }

  async loadProjectFromCloud(projectId: ProjectId): Promise<void> {
    const service = await this.ensureSyncService()
    try {
      this.syncingEnabled = false // Prevent hydration triggering sync
      const projectData = await service.loadProject(projectId)

      hydrateModelState(projectData.modelState as PartializedStoreState, projectData.modelVersion)
      hydrateConfigState(projectData.configState, projectData.configVersion)
      hydrateMaterialsState(projectData.materialsState, projectData.materialsVersion)
      hydratePartsState(projectData.partsState as PartializedPartsState, projectData.partsVersion)

      getProjectActions().loadProject({
        projectId,
        name: projectData.name,
        description: projectData.description,
        createdAt: parseTimestamp(projectData.createdAt),
        updatedAt: parseTimestamp(projectData.updatedAt)
      })

      const floorPlansState = await this.loadFloorPlansFromCloud(projectData.floorPlansState as CloudFloorPlansMetadata)
      importFloorPlansState(floorPlansState, projectData.floorPlansVersion)
    } finally {
      this.syncingEnabled = true
    }

    getPersistenceActions().setCloudSyncSuccess(new Date())
  }

  async flushSyncQueue(): Promise<void> {
    if (this.pendingSyncs.size === 0) return
    await this.flushSyncQueueInternal()
  }

  async switchProject(projectId: ProjectId): Promise<void> {
    await this.flushSyncQueue()
    await this.loadProjectFromCloud(projectId)
    await this.reloadProjectList()
  }

  async createProject(options: { name: string; description?: string; mode: 'empty' | 'copy' }): Promise<void> {
    const service = await this.ensureSyncService()
    const userId = service.getCurrentUserId()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    await this.flushSyncQueue()

    const newProjectId = createProjectId()
    const now = timestampNow()

    const projectData =
      options.mode === 'empty'
        ? this.getEmptyProjectData(newProjectId, options.name, options.description, now)
        : this.getCurrentProjectData(newProjectId, options.name, options.description, now)

    await service.createProject(userId, projectData)
    await this.loadProjectFromCloud(newProjectId)
    await this.reloadProjectList()
  }

  async deleteProject(projectId: ProjectId): Promise<void> {
    const service = await this.ensureSyncService()
    await service.deleteProject(projectId)

    const actions = getProjectActions()
    actions.removeProject(projectId)
  }

  async reloadProjectList(): Promise<void> {
    const service = await this.ensureSyncService()
    const actions = getProjectActions()
    actions.setLoading(true)

    try {
      const projects = await service.loadProjectList()
      actions.setProjects(projects)
    } catch (error) {
      console.error('Failed to reload project list:', error)
    } finally {
      actions.setLoading(false)
    }
  }

  private getEmptyProjectData(
    projectId: ProjectId,
    name: string,
    description: string | undefined,
    now: ReturnType<typeof timestampNow>
  ): ProjectData {
    const modelState = getInitialModelState()
    const configState = getInitialConfigState()
    const materialsState = getInitialMaterialsState()
    const partsState = { labels: {}, nextLabelIndexByGroup: {} }

    return {
      projectId,
      name,
      description,
      modelState,
      modelVersion: MODEL_STORE_VERSION,
      configState,
      configVersion: CONFIG_STORE_VERSION,
      materialsState,
      materialsVersion: MATERIALS_STORE_VERSION,
      partsState,
      partsVersion: PARTS_STORE_VERSION,
      floorPlansState: { plans: {} },
      floorPlansVersion: FLOOR_PLANS_STORE_VERSION,
      createdAt: now,
      updatedAt: now
    }
  }

  private getCurrentProjectData(
    projectId: ProjectId,
    name: string,
    description: string | undefined,
    now: ReturnType<typeof timestampNow>
  ): ProjectData {
    const modelState = exportModelState()
    const configState = getConfigState()
    const materialsState = getMaterialsState()
    const partsState = exportPartsState()
    const floorPlansState = exportFloorPlansState()
    const floorPlansMetadata = this.extractMetadata(floorPlansState)

    return {
      projectId,
      name,
      description,
      modelState,
      modelVersion: MODEL_STORE_VERSION,
      configState,
      configVersion: CONFIG_STORE_VERSION,
      materialsState,
      materialsVersion: MATERIALS_STORE_VERSION,
      partsState,
      partsVersion: PARTS_STORE_VERSION,
      floorPlansState: floorPlansMetadata,
      floorPlansVersion: FLOOR_PLANS_STORE_VERSION,
      createdAt: now,
      updatedAt: now
    }
  }

  private async ensureSyncService(): Promise<ICloudSyncService> {
    if (!this.syncService) {
      this.syncService = getCloudSyncService()
      if (!this.syncService) {
        throw new Error('Cloud sync not available')
      }
      await this.syncService.initialize()
    }
    return this.syncService
  }

  private async loadProjectsFromCloud(): Promise<void> {
    const service = await this.ensureSyncService()
    const actions = getProjectActions()
    actions.setLoading(true)

    try {
      const projects = await service.loadProjectList()
      actions.setProjects(projects)

      await this.syncCurrentProjectState(projects)

      const localProjectId = getProjectMeta().projectId
      if (!projects.some(p => p.id === localProjectId)) {
        const updatedProjects = await service.loadProjectList()
        actions.setProjects(updatedProjects)
      }
    } catch (error) {
      console.error('Failed to sync projects:', error)
      getPersistenceActions().setInitialSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      actions.setLoading(false)
    }
  }

  private async syncCurrentProjectState(cloudProjects: ProjectListItem[]): Promise<void> {
    const localMeta = getProjectMeta()
    const cloudProject = cloudProjects.find(p => p.id === localMeta.projectId)
    const persistenceActions = getPersistenceActions()

    if (cloudProject) {
      const localTime = new Date(localMeta.updatedAt).getTime()
      const cloudTime = new Date(cloudProject.updatedAt).getTime()

      if (cloudTime > localTime) {
        persistenceActions.setInitialSyncing(true)
        try {
          await this.loadProjectFromCloud(localMeta.projectId)
        } finally {
          persistenceActions.setInitialSyncing(false)
        }
      } else if (localTime > cloudTime) {
        await this.syncLocalProjectToCloud()
      } else {
        persistenceActions.setCloudSyncSuccess(new Date())
      }
    } else {
      await this.syncLocalProjectToCloud()
    }
  }

  private setupStoreSubscriptions(): void {
    if (this.subscriptions) return

    this.subscriptions = {
      model: subscribeToModelChanges(() => {
        this.queueSync('model')
      }),

      config: subscribeToConfigChanges(() => {
        this.queueSync('config')
      }),

      materials: subscribeToMaterials(() => {
        this.queueSync('materials')
      }),

      parts: usePartsStore.subscribe(() => {
        this.queueSync('parts')
      }),

      projectMeta: useProjectsStore.subscribe((current, previous) => {
        if (
          current.currentProject.name !== previous.currentProject.name ||
          current.currentProject.description !== previous.currentProject.description
        ) {
          this.queueSync('project_meta')
        }
      }),

      floorPlans: subscribeToFloorPlansRecords((_id, current, previous) => {
        if (this.syncingEnabled && current && current.imageMeta.hash !== previous?.imageMeta.hash) {
          void this.ensureSyncService().then(service =>
            service.uploadFloorPlanImage(current.image, current.imageMeta.hash)
          )
        }

        this.queueSync('floor_plans')
      })
    }
  }

  private cleanupSubscriptions(): void {
    if (this.subscriptions) {
      this.subscriptions.model()
      this.subscriptions.config()
      this.subscriptions.materials()
      this.subscriptions.parts()
      this.subscriptions.projectMeta()
      this.subscriptions.floorPlans()
      this.subscriptions = null
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
      this.syncTimeout = null
    }
    this.pendingSyncs.clear()
  }

  private queueSync(item: SyncQueueItem): void {
    if (!this.syncingEnabled) return
    getPersistenceActions().setCloudSyncing(true)
    this.pendingSyncs.add(item)

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout)
    }

    this.syncTimeout = setTimeout(() => {
      void this.flushSyncQueueInternal()
    }, SYNC_DEBOUNCE_MS)
  }

  private async flushSyncQueueInternal(): Promise<void> {
    if (!this.syncingEnabled || !this.syncService || this.pendingSyncs.size === 0) return

    const projectMeta = getProjectMeta()

    try {
      for (const item of this.pendingSyncs) {
        if (item === 'project_meta') {
          await this.syncService.updateProjectMeta(projectMeta.projectId, {
            name: projectMeta.name,
            description: projectMeta.description
          })
          continue
        }

        let data: unknown
        let version: number

        switch (item) {
          case 'model': {
            data = exportModelState()
            version = MODEL_STORE_VERSION
            break
          }
          case 'config': {
            data = getConfigState()
            version = CONFIG_STORE_VERSION
            break
          }
          case 'materials': {
            data = getMaterialsState()
            version = MATERIALS_STORE_VERSION
            break
          }
          case 'parts': {
            data = exportPartsState()
            version = PARTS_STORE_VERSION
            break
          }
          case 'floor_plans': {
            const floorPlansState = exportFloorPlansState()
            data = this.extractMetadata(floorPlansState)
            version = FLOOR_PLANS_STORE_VERSION
            break
          }
        }

        await this.syncService.syncStore(projectMeta.projectId, item, data, version)
      }

      this.pendingSyncs.clear()
      getPersistenceActions().setCloudSyncSuccess(new Date())
    } catch (error) {
      getPersistenceActions().setCloudSyncError(error instanceof Error ? error.message : 'Sync failed')
    }
  }

  private async loadFloorPlansFromCloud(metadata: CloudFloorPlansMetadata): Promise<CloudFloorPlansState> {
    const service = await this.ensureSyncService()

    const state: CloudFloorPlansState = {
      plans: {}
    }

    if ('plans' in metadata) {
      for (const [storeyId, planMeta] of Object.entries(metadata.plans)) {
        const typedStoreyId = storeyId as StoreyId
        const blob = await service.downloadFloorPlanImage(planMeta.imageMeta.hash, planMeta.imageMeta.type)

        if (blob) {
          state.plans[typedStoreyId] = {
            storeyId: planMeta.storeyId,
            imageMeta: planMeta.imageMeta,
            image: blob,
            calibration: planMeta.calibration,
            origin: planMeta.origin
          }
        }
      }
    }

    return state
  }

  private extractMetadata(state: CloudFloorPlansState): CloudFloorPlansMetadata {
    const plans: Record<StoreyId, CloudFloorPlanMetadata> = {}
    for (const [storeyId, plan] of Object.entries(state.plans)) {
      const { image: _image, ...metadata } = plan
      plans[storeyId as StoreyId] = metadata
    }
    return { plans }
  }
}

type CloudFloorPlanMetadata = Omit<CloudFloorPlansState['plans'][StoreyId], 'image'>

export interface CloudFloorPlansMetadata {
  readonly plans: Record<StoreyId, CloudFloorPlanMetadata>
}

let managerInstance: CloudSyncManager | null = null

export function getCloudSyncManager(): CloudSyncManager {
  managerInstance ??= new CloudSyncManager()
  return managerInstance
}

export function destroyCloudSyncManager(): void {
  if (managerInstance) {
    managerInstance.destroy()
    managerInstance = null
  }
}

export async function initializeCloudSync(): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.initialize()
}

export async function syncLocalProjectToCloud(): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.syncLocalProjectToCloud()
}

export async function loadProjectFromCloud(projectId: ProjectId): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.loadProjectFromCloud(projectId)
}

export async function flushSyncQueue(): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.flushSyncQueue()
}

export async function switchProject(projectId: ProjectId): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.switchProject(projectId)
}

export async function createProject(options: {
  name: string
  description?: string
  mode: 'empty' | 'copy'
}): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.createProject(options)
}

export async function deleteProject(projectId: ProjectId): Promise<void> {
  const manager = getCloudSyncManager()
  await manager.deleteProject(projectId)
}

export function destroyCloudSync(): void {
  destroyCloudSyncManager()
}
