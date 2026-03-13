import { type DBSchema, type IDBPDatabase, openDB } from 'idb'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

import type { StoreyId } from '@/building/model/ids'

import type { FloorPlanStoreState, PartializedFloorPlanStoreState } from './types'

const DB_NAME = 'strawbuild-floor-plans'
const DB_VERSION = 1
const IMAGES_STORE = 'images'

interface FloorPlansDB extends DBSchema {
  images: {
    key: string
    value: Blob
  }
}

async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer()
  const msgUint8 = new Uint8Array(arrayBuffer)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export class FloorPlanStorage implements PersistStorage<FloorPlanStoreState> {
  async getItem(name: string): Promise<StorageValue<FloorPlanStoreState> | null> {
    const raw = localStorage.getItem(name)
    if (!raw) return null

    try {
      const db = await this.getDB()
      const parsed = JSON.parse(raw) as StorageValue<PartializedFloorPlanStoreState>

      const state: StorageValue<FloorPlanStoreState> = {
        version: parsed.version,
        state: {
          plans: {}
        }
      }

      for (const key in parsed.state.plans) {
        const floorId = key as StoreyId
        const partial = parsed.state.plans[floorId]
        const image = await db.get(IMAGES_STORE, partial.imageId)
        if (image) {
          state.state.plans[floorId] = {
            floorId,
            imageMeta: partial.imageMeta,
            image,
            calibration: partial.calibration,
            origin: partial.origin,
            placement: partial.placement,
            opacity: partial.opacity
          }
        }
      }
      return state
    } catch {
      return null
    }
  }

  async setItem(name: string, value: StorageValue<FloorPlanStoreState>): Promise<void> {
    const partial = {
      version: value.version,
      state: {
        plans: {}
      } as PartializedFloorPlanStoreState
    }

    const db = await this.getDB()
    for (const key in value.state.plans) {
      const floorId = key as StoreyId
      const record = value.state.plans[floorId]
      try {
        const { image, ...partialized } = record
        const imageId = await hashBlob(image)
        await db.put(IMAGES_STORE, image, imageId)
        partial.state.plans[floorId] = { ...partialized, imageId }
      } catch (error) {
        console.error(`Failed to store floor plan image for floor ${floorId}`, error)
      }

      localStorage.setItem(name, JSON.stringify(partial))
    }

    if (Object.keys(value.state.plans).length === 0) {
      await db.clear(IMAGES_STORE)
    }
  }

  async removeItem(name: string): Promise<void> {
    localStorage.removeItem(name)
    const db = await this.getDB()
    await db.clear(IMAGES_STORE)
  }

  private dbPromise: Promise<IDBPDatabase<FloorPlansDB>> | null = null

  private getDB(): Promise<IDBPDatabase<FloorPlansDB>> {
    this.dbPromise ??= openDB<FloorPlansDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE)
        }
      }
    })
    return this.dbPromise
  }
}
