import { type IDBPDatabase, openDB } from 'idb'

import type { StoreyId } from '@/building/model/ids'
import type { ProjectId } from '@/projects/types'

import {
  FLOOR_PLANS_STORE_VERSION,
  type FloorPlanImageData,
  type LocalFloorPlanSettings,
  type LocalFloorPlansSettingsRecord,
  createLocalFloorPlansSettings
} from './persistedTypes'
import type { FloorPlanPlacement } from './types'

const DB_NAME = 'strawbuild-floor-plans'
const DB_VERSION = 1
const IMAGES_STORE = 'images'
const SETTINGS_STORAGE_KEY = 'strawbuild-floor-plan-settings'

interface FloorPlansDB {
  images: {
    key: string
    value: Blob
  }
}

let dbPromise: Promise<IDBPDatabase<FloorPlansDB>> | null = null

function getDB(): Promise<IDBPDatabase<FloorPlansDB>> {
  dbPromise ??= openDB<FloorPlansDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE)
      }
    }
  })
  return dbPromise
}

function makeImageKey(projectId: ProjectId, storeyId: StoreyId): string {
  return `${projectId}/${storeyId}`
}

export async function saveImageToLocal(
  projectId: ProjectId,
  storeyId: StoreyId,
  imageData: FloorPlanImageData
): Promise<void> {
  const db = await getDB()
  const key = makeImageKey(projectId, storeyId)
  await db.put(IMAGES_STORE, imageData.blob, key)
}

export async function loadImageFromLocal(projectId: ProjectId, storeyId: StoreyId): Promise<Blob | null> {
  const db = await getDB()
  const key = makeImageKey(projectId, storeyId)
  const blob = (await db.get(IMAGES_STORE, key)) as Blob | undefined
  return blob ?? null
}

export async function deleteImageFromLocal(projectId: ProjectId, storeyId: StoreyId): Promise<void> {
  const db = await getDB()
  const key = makeImageKey(projectId, storeyId)
  await db.delete(IMAGES_STORE, key)
}

export async function deleteAllImagesForProject(projectId: ProjectId): Promise<void> {
  const db = await getDB()
  const allKeys = await db.getAllKeys(IMAGES_STORE)
  const projectPrefix = `${projectId}/`

  for (const key of allKeys) {
    if (typeof key === 'string' && key.startsWith(projectPrefix)) {
      await db.delete(IMAGES_STORE, key)
    }
  }
}

export function saveSettingsToLocal(
  projectId: ProjectId,
  storeyId: StoreyId,
  placement: FloorPlanPlacement,
  opacity: number
): void {
  const allSettings = loadAllSettingsFromLocal()
  const projectSettings = allSettings[projectId] ?? {}

  projectSettings[storeyId] = {
    placement,
    opacity
  }

  allSettings[projectId] = projectSettings

  const record: LocalFloorPlansSettingsRecord = {
    version: FLOOR_PLANS_STORE_VERSION,
    settings: allSettings
  }

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(record))
  } catch {
    console.error('Failed to save floor plan settings to localStorage')
  }
}

export function loadSettingsFromLocal(projectId: ProjectId, storeyId: StoreyId): LocalFloorPlanSettings | null {
  const allSettings = loadAllSettingsFromLocal()
  if (!(projectId in allSettings)) return null
  return allSettings[projectId][storeyId] ?? null
}

export function deleteSettingsFromLocal(projectId: ProjectId, storeyId: StoreyId): void {
  const allSettings = loadAllSettingsFromLocal()
  if (projectId in allSettings) {
    const projectSettings = allSettings[projectId]
    delete projectSettings[storeyId]
    if (Object.keys(projectSettings).length === 0) {
      delete allSettings[projectId]
    }
  }

  const record = createLocalFloorPlansSettings(allSettings)
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(record))
  } catch {
    console.error('Failed to delete floor plan settings from localStorage')
  }
}

export function deleteAllSettingsForProject(projectId: ProjectId): void {
  const allSettings = loadAllSettingsFromLocal()
  delete allSettings[projectId]

  const record = createLocalFloorPlansSettings(allSettings)
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(record))
  } catch {
    console.error('Failed to delete floor plan settings from localStorage')
  }
}

interface AllSettingsRecord {
  version: number
  settings: Record<ProjectId, Record<StoreyId, LocalFloorPlanSettings>>
}

function loadAllSettingsFromLocal(): Record<ProjectId, Record<StoreyId, LocalFloorPlanSettings>> {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed === 'object' && parsed !== null && 'version' in parsed && 'settings' in parsed) {
      const record = parsed as AllSettingsRecord
      if (record.version === FLOOR_PLANS_STORE_VERSION) {
        return record.settings
      }
    }
    return {}
  } catch {
    return {}
  }
}
