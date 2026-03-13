import { create } from 'zustand'

import type { StoreyId } from '@/building/model/ids'
import { getProjectId } from '@/projects/store'

import { getFloorPlanPersistence } from './FloorPlanPersistence'
import { calculateMmPerPixel, calculatePixelDistance } from './calibration'
import type {
  FloorPlanOrigin,
  FloorPlanOverlay,
  FloorPlanPlacement,
  ImagePoint,
  PlanImportPayload,
  PlanRecalibrationPayload
} from './types'

interface FloorPlanStoreState {
  plans: Record<StoreyId, FloorPlanOverlay | undefined>
}

interface FloorPlanStoreActions {
  importPlan: (payload: PlanImportPayload) => void
  setPlacement: (floorId: StoreyId, placement: FloorPlanPlacement) => void
  togglePlacement: (floorId: StoreyId) => void
  recalibratePlan: (payload: PlanRecalibrationPayload) => void
  clearPlan: (floorId: StoreyId) => void
}

type FloorPlanStore = FloorPlanStoreState & { actions: FloorPlanStoreActions }

const UNDERLAY_OPACITY = 0.85
const OVERLAY_OPACITY = 0.45

function disposePlan(plan: FloorPlanOverlay | undefined): void {
  if (plan) {
    URL.revokeObjectURL(plan.image.url)
  }
}

function getDefaultOrigin(referencePoints: readonly [ImagePoint, ImagePoint]): FloorPlanOrigin {
  return {
    image: referencePoints[0],
    world: { x: 0, y: 0 }
  }
}

export const useFloorPlanStore = create<FloorPlanStore>()((set, get) => ({
  plans: {},
  actions: {
    importPlan: ({ floorId, file, imageSize, referencePoints, realDistanceMm, origin }) => {
      const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
      const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

      const nextPlan: FloorPlanOverlay = {
        floorId,
        image: {
          url: URL.createObjectURL(file),
          name: file.name,
          width: imageSize.width,
          height: imageSize.height
        },
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
        disposePlan(state.plans[floorId])
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
        const plan = state.plans[floorId]
        if (!plan) {
          return state
        }

        return {
          plans: {
            ...state.plans,
            [floorId]: {
              ...plan,
              placement,
              opacity: placement === 'under' ? UNDERLAY_OPACITY : OVERLAY_OPACITY
            }
          }
        }
      })
    },

    togglePlacement: floorId => {
      const { plans } = get()
      const current = plans[floorId]
      const nextPlacement: FloorPlanPlacement = current?.placement === 'under' ? 'over' : 'under'
      get().actions.setPlacement(floorId, nextPlacement)
    },

    recalibratePlan: ({ floorId, referencePoints, realDistanceMm, originImagePoint }) => {
      set(state => {
        const existing = state.plans[floorId]
        if (!existing) {
          return state
        }

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
        const existing = state.plans[floorId]
        if (!existing) {
          return state
        }

        disposePlan(existing)
        const { [floorId]: _, ...rest } = state.plans
        return {
          plans: rest
        }
      })
    }
  }
}))

export const useFloorPlanForStorey = (floorId: StoreyId | null | undefined): FloorPlanOverlay | null =>
  useFloorPlanStore(state => {
    if (!floorId) {
      return null
    }
    return state.plans[floorId] ?? null
  })

export const useFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore(state => state.actions)

export const getFloorPlanActions = (): FloorPlanStoreActions => useFloorPlanStore.getState().actions

export const getAllFloorPlans = (): Record<StoreyId, FloorPlanOverlay | undefined> => useFloorPlanStore.getState().plans

export function resetFloorPlanStore(): void {
  const { actions } = useFloorPlanStore.getState()
  Object.values(useFloorPlanStore.getState().plans).forEach(disposePlan)
  useFloorPlanStore.setState({ plans: {}, actions })
}

export async function saveFloorPlanWithPersistence(
  floorId: StoreyId,
  file: File,
  imageSize: { width: number; height: number },
  referencePoints: readonly [ImagePoint, ImagePoint],
  realDistanceMm: number,
  origin: FloorPlanOrigin
): Promise<void> {
  const projectId = getProjectId()
  const persistence = getFloorPlanPersistence()

  const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
  const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

  const plan: FloorPlanOverlay = {
    floorId,
    image: {
      url: URL.createObjectURL(file),
      name: file.name,
      width: imageSize.width,
      height: imageSize.height
    },
    calibration: {
      referencePoints,
      pixelDistance,
      realDistanceMm,
      mmPerPixel
    },
    origin,
    placement: 'over',
    opacity: OVERLAY_OPACITY
  }

  disposePlan(useFloorPlanStore.getState().plans[floorId])
  useFloorPlanStore.setState({
    plans: {
      ...useFloorPlanStore.getState().plans,
      [floorId]: plan
    }
  })

  await persistence.saveFloorPlan(
    projectId,
    floorId,
    { blob: file, fileName: file.name },
    plan.calibration,
    plan.origin,
    plan.placement,
    plan.opacity
  )
}

export async function recalibratePlanWithPersistence(
  floorId: StoreyId,
  referencePoints: readonly [ImagePoint, ImagePoint],
  realDistanceMm: number,
  originImagePoint: ImagePoint
): Promise<void> {
  const projectId = getProjectId()
  const persistence = getFloorPlanPersistence()

  const existing = useFloorPlanStore.getState().plans[floorId]
  if (!existing) {
    return
  }

  const pixelDistance = calculatePixelDistance(referencePoints[0], referencePoints[1])
  const mmPerPixel = calculateMmPerPixel(realDistanceMm, pixelDistance)

  const updatedPlan: FloorPlanOverlay = {
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

  useFloorPlanStore.setState({
    plans: {
      ...useFloorPlanStore.getState().plans,
      [floorId]: updatedPlan
    }
  })

  await persistence.saveFloorPlan(
    projectId,
    floorId,
    { blob: await fetch(existing.image.url).then(r => r.blob()), fileName: existing.image.name },
    updatedPlan.calibration,
    updatedPlan.origin,
    updatedPlan.placement,
    updatedPlan.opacity
  )
}

export async function deleteFloorPlanWithPersistence(floorId: StoreyId): Promise<void> {
  const projectId = getProjectId()
  const persistence = getFloorPlanPersistence()

  const existing = useFloorPlanStore.getState().plans[floorId]
  if (!existing) {
    return
  }

  disposePlan(existing)
  const { [floorId]: _, ...rest } = useFloorPlanStore.getState().plans
  useFloorPlanStore.setState({
    plans: rest
  })

  await persistence.deleteFloorPlan(projectId, floorId, existing.image.name)
}

export async function loadFloorPlansFromPersistence(): Promise<void> {
  const projectId = getProjectId()
  const persistence = getFloorPlanPersistence()

  const loadedPlans = await persistence.loadFloorPlansForProject(projectId)

  Object.values(useFloorPlanStore.getState().plans).forEach(disposePlan)

  const newPlans: Record<StoreyId, FloorPlanOverlay> = {}

  for (const loaded of loadedPlans) {
    const blobUrl = URL.createObjectURL(loaded.imageBlob)

    newPlans[loaded.metadata.storeyId] = {
      floorId: loaded.metadata.storeyId,
      image: {
        url: blobUrl,
        name: loaded.metadata.imageFileName,
        width: loaded.metadata.imageWidth,
        height: loaded.metadata.imageHeight
      },
      calibration: loaded.metadata.calibration,
      origin: loaded.metadata.origin,
      placement: loaded.placement,
      opacity: loaded.opacity
    }
  }

  useFloorPlanStore.setState({ plans: newPlans })
}

export async function deleteAllFloorPlansForCurrentProject(): Promise<void> {
  const projectId = getProjectId()
  const persistence = getFloorPlanPersistence()

  Object.values(useFloorPlanStore.getState().plans).forEach(disposePlan)
  useFloorPlanStore.setState({ plans: {} })

  await persistence.deleteAllFloorPlansForProject(projectId)
}
