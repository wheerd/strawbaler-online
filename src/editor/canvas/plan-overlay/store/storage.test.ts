import { IDBFactory } from 'fake-indexeddb'
import { openDB } from 'idb'
import { Blob } from 'node:buffer'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { StoreyId } from '@/building/model/ids'
import type { FloorPlanOverlay } from '@/editor/canvas/plan-overlay/types'

import { FloorPlanStorage } from './storage'
import type { FloorPlanStoreState } from './types'

const DB_NAME = 'strawbuild-floor-plans'
const IMAGES_STORE = 'images'
const STORAGE_KEY = 'test-floor-plans'

const floorId = 'floor-1' as StoreyId
const floorId2 = 'floor-2' as StoreyId

function createTestBlob(content = 'blueprint-data'): Blob {
  return new Blob([content], { type: 'image/png' })
}

function createTestPlan(overrides: Partial<FloorPlanOverlay> = {}): FloorPlanOverlay {
  return {
    floorId,
    imageMeta: { hash: 'abc123', type: 'image/png', width: 800, height: 600 },
    image: createTestBlob(),
    calibration: {
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      pixelDistance: 100,
      realDistanceMm: 1000,
      mmPerPixel: 10
    },
    origin: { image: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
    placement: 'over',
    opacity: 0.45,
    ...overrides
  }
}

function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
  // eslint-disable-next-line no-new
  new IDBFactory()
}

describe('FloorPlanStorage', () => {
  let storage: FloorPlanStorage

  beforeEach(() => {
    storage = new FloorPlanStorage()
    clearStorage()
  })

  afterEach(() => {
    clearStorage()
  })

  describe('getItem', () => {
    it('returns null when localStorage has no data', async () => {
      const result = await storage.getItem(STORAGE_KEY)
      expect(result).toBeNull()
    })

    it('returns null when JSON is malformed', async () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json')

      const result = await storage.getItem(STORAGE_KEY)
      expect(result).toBeNull()
    })

    it('returns state with empty plans when image not found in IndexedDB', async () => {
      const partialized = {
        version: 1,
        state: {
          plans: {
            [floorId]: {
              floorId,
              imageMeta: { hash: 'non-existent-hash', type: 'image/png', width: 800, height: 600 },
              calibration: {
                referencePoints: [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 }
                ],
                pixelDistance: 100,
                realDistanceMm: 1000,
                mmPerPixel: 10
              },
              origin: { image: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
              placement: 'over' as const,
              opacity: 0.45
            }
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partialized))

      const result = await storage.getItem(STORAGE_KEY)
      expect(result).not.toBeNull()
      expect(result!.version).toBe(1)
      expect(result!.state.plans).toEqual({})
    })

    it('returns hydrated state with images from IndexedDB', async () => {
      const blob = createTestBlob('test-image-content')
      const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IMAGES_STORE)) {
            db.createObjectStore(IMAGES_STORE)
          }
        }
      })
      const hash = 'abc123hash'
      await db.put(IMAGES_STORE, blob, hash)

      const partialized = {
        version: 1,
        state: {
          plans: {
            [floorId]: {
              floorId,
              imageMeta: { hash: 'abc123hash', type: 'image/png', width: 800, height: 600 },
              calibration: {
                referencePoints: [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 }
                ],
                pixelDistance: 100,
                realDistanceMm: 1000,
                mmPerPixel: 10
              },
              origin: { image: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
              placement: 'over' as const,
              opacity: 0.45
            }
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partialized))

      const result = await storage.getItem(STORAGE_KEY)
      expect(result).not.toBeNull()
      expect(result!.version).toBe(1)
      expect(result!.state.plans[floorId]).toBeTruthy()
      expect(result!.state.plans[floorId].imageMeta.hash).toBe('abc123hash')
    })

    it('handles multiple plans correctly', async () => {
      const blob1 = createTestBlob('image-1')
      const blob2 = createTestBlob('image-2')
      const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IMAGES_STORE)) {
            db.createObjectStore(IMAGES_STORE)
          }
        }
      })
      await db.put(IMAGES_STORE, blob1, 'hash1')
      await db.put(IMAGES_STORE, blob2, 'hash2')

      const partialized = {
        version: 1,
        state: {
          plans: {
            [floorId]: {
              floorId,
              imageMeta: { hash: 'hash1', type: 'image/png', width: 800, height: 600 },
              calibration: {
                referencePoints: [
                  { x: 0, y: 0 },
                  { x: 100, y: 0 }
                ],
                pixelDistance: 100,
                realDistanceMm: 1000,
                mmPerPixel: 10
              },
              origin: { image: { x: 0, y: 0 }, world: { x: 0, y: 0 } },
              placement: 'over' as const,
              opacity: 0.45
            },
            [floorId2]: {
              floorId: floorId2,
              imageMeta: { hash: 'hash2', type: 'image/png', width: 600, height: 400 },
              calibration: {
                referencePoints: [
                  { x: 0, y: 0 },
                  { x: 50, y: 0 }
                ],
                pixelDistance: 50,
                realDistanceMm: 500,
                mmPerPixel: 10
              },
              origin: { image: { x: 10, y: 20 }, world: { x: 0, y: 0 } },
              placement: 'under' as const,
              opacity: 0.85
            }
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(partialized))

      const result = await storage.getItem(STORAGE_KEY)
      expect(result!.state.plans[floorId]).toBeTruthy()
      expect(result!.state.plans[floorId2]).toBeTruthy()
      expect(result!.state.plans[floorId].imageMeta.hash).toBe('hash1')
      expect(result!.state.plans[floorId2].imageMeta.hash).toBe('hash2')
    })
  })

  describe('setItem', () => {
    it('stores partialized JSON to localStorage without Blob', async () => {
      const value = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan()
          }
        }
      }

      await storage.setItem(STORAGE_KEY, value)

      const stored = localStorage.getItem(STORAGE_KEY)
      expect(stored).not.toBeNull()
      const parsed = JSON.parse(stored!)
      expect(parsed.version).toBe(1)
      expect(parsed.state.plans[floorId].imageMeta.hash).toBeTruthy()
      expect(parsed.state.plans[floorId].image).toBeUndefined()
    })

    it('stores images to IndexedDB with hash from imageMeta as key', async () => {
      const value = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan()
          }
        }
      }

      await storage.setItem(STORAGE_KEY, value)

      const stored = localStorage.getItem(STORAGE_KEY)
      const parsed = JSON.parse(stored!)
      const hash = parsed.state.plans[floorId].imageMeta.hash

      const db = await openDB(DB_NAME, 1)
      const storedBlob = await db.get(IMAGES_STORE, hash)
      expect(storedBlob).toBeTruthy()
    })

    it('produces same hash for same content (deduplication)', async () => {
      const blob = createTestBlob('same-content')
      const value1 = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan({ image: blob })
          }
        }
      }
      const value2 = {
        version: 1,
        state: {
          plans: {
            [floorId2]: createTestPlan({ floorId: floorId2, image: blob })
          }
        }
      }

      await storage.setItem(STORAGE_KEY, value1)
      const stored1 = localStorage.getItem(STORAGE_KEY)
      const parsed1 = JSON.parse(stored1!)
      const hash1 = parsed1.state.plans[floorId].imageMeta.hash

      await storage.setItem(STORAGE_KEY, value2)
      const stored2 = localStorage.getItem(STORAGE_KEY)
      const parsed2 = JSON.parse(stored2!)
      const hash2 = parsed2.state.plans[floorId2].imageMeta.hash

      expect(hash1).toBe(hash2)
    })

    it('clears IndexedDB when plans object is empty', async () => {
      const blob = createTestBlob('to-be-cleared')
      const valueWithPlan = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan({ image: blob })
          }
        }
      }
      await storage.setItem(STORAGE_KEY, valueWithPlan)

      const emptyValue = {
        version: 1,
        state: {
          plans: {} as Record<StoreyId, FloorPlanOverlay>
        }
      }
      await storage.setItem(STORAGE_KEY, emptyValue)

      const db = await openDB(DB_NAME, 1)
      const count = await db.count(IMAGES_STORE)
      expect(count).toBe(0)
    })

    it('prunes orphaned images when a plan is removed but others remain', async () => {
      const blob1 = createTestBlob('image-1')
      const blob2 = createTestBlob('image-2')
      const valueWithTwoPlans = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan({
              image: blob1,
              imageMeta: { hash: 'hash1', type: 'image/png', width: 800, height: 600 }
            }),
            [floorId2]: createTestPlan({
              floorId: floorId2,
              image: blob2,
              imageMeta: { hash: 'hash2', type: 'image/png', width: 800, height: 600 }
            })
          }
        }
      }
      await storage.setItem(STORAGE_KEY, valueWithTwoPlans)

      const db = await openDB(DB_NAME, 1)
      expect(await db.count(IMAGES_STORE)).toBe(2)

      const valueWithOnePlan = {
        version: 1,
        state: {
          plans: {
            [floorId]: createTestPlan({
              image: blob1,
              imageMeta: { hash: 'hash1', type: 'image/png', width: 800, height: 600 }
            })
          }
        }
      }
      await storage.setItem(STORAGE_KEY, valueWithOnePlan)

      expect(await db.count(IMAGES_STORE)).toBe(1)
      expect(await db.get(IMAGES_STORE, 'hash1')).toBeTruthy()
    })
  })

  describe('removeItem', () => {
    it('removes key from localStorage', async () => {
      localStorage.setItem(STORAGE_KEY, 'some-data')

      await storage.removeItem(STORAGE_KEY)

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('clears IndexedDB images store', async () => {
      const blob = createTestBlob('to-remove')
      const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(IMAGES_STORE)) {
            db.createObjectStore(IMAGES_STORE)
          }
        }
      })
      await db.put(IMAGES_STORE, blob, 'some-hash')
      expect(await db.count(IMAGES_STORE)).toBe(1)

      await storage.removeItem(STORAGE_KEY)

      expect(await db.count(IMAGES_STORE)).toBe(0)
    })
  })

  describe('roundtrip', () => {
    it('preserves data through setItem and getItem cycle', async () => {
      const originalValue = {
        version: 2,
        state: {
          plans: {
            [floorId]: createTestPlan({
              imageMeta: { hash: 'roundtrip-hash', type: 'image/png', width: 1920, height: 1080 },
              image: createTestBlob('roundtrip-content'),
              calibration: {
                referencePoints: [
                  { x: 100, y: 200 },
                  { x: 300, y: 200 }
                ],
                pixelDistance: 200,
                realDistanceMm: 5000,
                mmPerPixel: 25
              },
              origin: { image: { x: 50, y: 75 }, world: { x: 1000, y: 2000 } },
              placement: 'under',
              opacity: 0.85
            })
          }
        } satisfies FloorPlanStoreState
      }

      await storage.setItem(STORAGE_KEY, originalValue)
      const result = await storage.getItem(STORAGE_KEY)

      expect(result).not.toBeNull()
      expect(result!.version).toBe(2)
      const plan = result!.state.plans[floorId]
      expect(plan.imageMeta.hash).toBe('roundtrip-hash')
      expect(plan.imageMeta.width).toBe(1920)
      expect(plan.calibration.mmPerPixel).toBe(25)
      expect(plan.origin.image).toEqual({ x: 50, y: 75 })
      expect(plan.placement).toBe('under')
      expect(plan.opacity).toBe(0.85)

      const imageBuffer = await plan.image.arrayBuffer()
      const imageContent = Buffer.from(imageBuffer).toString('utf-8')
      expect(imageContent).toBe('roundtrip-content')
    })
  })
})
