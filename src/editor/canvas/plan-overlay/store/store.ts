import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'

import type { StoreyId } from '@/building/model/ids'
import type { FloorPlanOrigin, FloorPlanOverlay, ImagePoint } from '@/editor/canvas/plan-overlay/types'
import { hashBlob } from '@/shared/utils/hash'
import { subscribeRecords } from '@/shared/utils/subscription'

import { calculateMmPerPixel, calculatePixelDistance } from './calibration'
import { FloorPlanStorage } from './storage'
import type { CloudFloorPlan, CloudFloorPlansState, FloorPlanStore, FloorPlanStoreActions } from './types'

export const FLOOR_PLANS_STORE_VERSION = 1

const STORAGE_KEY = 'strawbuild-floor-plans'

const UNDERLAY_OPACITY = 0.85
const OVERLAY_OPACITY = 0.45
const HIDDEN_OPACITY = 0

function getDefaultOrigin(referencePoints: readonly [ImagePoint, ImagePoint]): FloorPlanOrigin {
  return {
    image: referencePoints[0],
    world: { x: 0, y: 0 }
  }
}

const storage = new FloorPlanStorage()

const useFloorPlanStore = create<FloorPlanStore>()(
  subscribeWithSelector(
    persist(
      (set, _get, store) => ({
        plans: {},
        actions: {
          importPlan: async ({ floorId, file, imageSize, referencePoints, realDistanceMm, origin }) => {
            const hash = await hashBlob(file)
            const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
            const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

            const nextPlan: FloorPlanOverlay = {
              floorId,
              imageMeta: {
                hash,
                type: file.type,
                width: imageSize.width,
                height: imageSize.height
              },
              image: file,
              calibration: {
                referencePoints,
                pixelDistance,
                realDistanceMm,
                mmPerPixel
              },
              origin: origin ?? getDefaultOrigin(referencePoints),
              placement: 'over',
              opacity: OVERLAY_OPACITY
            }

            set(state => {
              return {
                plans: {
                  ...state.plans,
                  [floorId]: nextPlan
                }
              }
            })
          },

          setPlacement: (floorId, placement) => {
            set(state => {
              if (!(floorId in state.plans)) {
                return state
              }

              const plan = state.plans[floorId]
              const opacity =
                placement === 'under' ? UNDERLAY_OPACITY : placement === 'over' ? OVERLAY_OPACITY : HIDDEN_OPACITY
              return {
                plans: {
                  ...state.plans,
                  [floorId]: {
                    ...plan,
                    placement,
                    opacity
                  }
                }
              }
            })
          },

          recalibratePlan: ({ floorId, referencePoints, realDistanceMm, originImagePoint }) => {
            set(state => {
              if (!(floorId in state.plans)) {
                return state
              }
              const existing = state.plans[floorId]

              const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
              const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

              return {
                plans: {
                  ...state.plans,
                  [floorId]: {
                    ...existing,
                    calibration: {
                      referencePoints,
                      realDistanceMm,
                      pixelDistance,
                      mmPerPixel
                    },
                    origin: {
                      image: originImagePoint,
                      world: { x: 0, y: 0 }
                    }
                  }
                }
              }
            })
          },

          clearPlan: floorId => {
            set(state => {
              const { [floorId]: _, ...rest } = state.plans
              return {
                plans: rest
              }
            })
          },

          reset: () => {
            set(store.getInitialState())
          }
        }
      }),
      {
        name: STORAGE_KEY,
        version: FLOOR_PLANS_STORE_VERSION,
        storage
      }
    )
  )
)

export const useFloorPlanForStorey = (floorId: StoreyId | null | undefined): FloorPlanOverlay | null =>
  useFloorPlanStore(state => {
    if (!floorId) {
      return null
    }
    return state.plans[floorId] ?? null
  })

export const useFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore(state => state.actions)

export const getFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore.getState().actions

export const getFloorPlanForStorey = (floorId: StoreyId): FloorPlanOverlay | null =>
  useFloorPlanStore.getState().plans[floorId] ?? null
export const getAllFloorPlans = (): FloorPlanOverlay[] => Object.values(useFloorPlanStore.getState().plans)

export function exportFloorPlansState(): CloudFloorPlansState {
  const state = useFloorPlanStore.getState()
  const plans: Record<StoreyId, CloudFloorPlan> = {}

  for (const [storeyId, plan] of Object.entries(state.plans)) {
    plans[storeyId as StoreyId] = {
      storeyId: plan.floorId,
      imageMeta: plan.imageMeta,
      image: plan.image,
      calibration: plan.calibration,
      origin: plan.origin
    }
  }

  return { plans }
}

export function importFloorPlansState(state: CloudFloorPlansState, _version: number): void {
  const currentPlans = useFloorPlanStore.getState().plans
  const hydratedPlans: Record<StoreyId, FloorPlanOverlay> = {}

  for (const [storeyId, metadata] of Object.entries(state.plans)) {
    const typedStoreyId = storeyId as StoreyId

    hydratedPlans[typedStoreyId] = {
      floorId: metadata.storeyId,
      imageMeta: metadata.imageMeta,
      image: metadata.image,
      calibration: metadata.calibration,
      origin: metadata.origin,
      placement: typedStoreyId in currentPlans ? currentPlans[typedStoreyId].placement : 'over',
      opacity: typedStoreyId in currentPlans ? currentPlans[typedStoreyId].opacity : OVERLAY_OPACITY
    }
  }

  useFloorPlanStore.setState({ plans: hydratedPlans })
}

export const subscribeToFloorPlans = useFloorPlanStore.subscribe

export const subscribeToFloorPlansRecords = (
  cb: (id: StoreyId, current?: FloorPlanOverlay, previous?: FloorPlanOverlay) => void
): (() => void) => subscribeRecords(useFloorPlanStore, s => s.plans, cb)

export async function clearFloorPlansPersistence(): Promise<void> {
  await storage.removeItem(STORAGE_KEY)
}
