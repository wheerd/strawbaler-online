import { beforeEach, describe, expect, it } from 'vitest'

import type { StoreyId } from '@/building/model/ids'

import { getFloorPlanActions, useFloorPlanStore } from './store'

const floorId = 'floor-1' as StoreyId

function createTestFile(name = 'plan.png'): File {
  return new File(['blueprint'], name, { type: 'image/png' })
}

function resetStore(): void {
  useFloorPlanStore.setState({ plans: {} })
}

describe('floor plan store', () => {
  beforeEach(() => {
    resetStore()
  })

  it('stores a plan with calibration metadata', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 2000, height: 1000 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      realDistanceMm: 5000
    })

    const plan = useFloorPlanStore.getState().plans[floorId]
    expect(plan).toBeTruthy()
    expect(plan.imageMeta.width).toBe(2000)
    expect(plan.calibration.pixelDistance).toBeCloseTo(100)
    expect(plan.calibration.mmPerPixel).toBeCloseTo(50)
    expect(plan.origin.image).toEqual({ x: 0, y: 0 })
  })

  it('clears plans', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 800, height: 600 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      ],
      realDistanceMm: 1000
    })

    actions.clearPlan(floorId)

    expect(useFloorPlanStore.getState().plans[floorId]).toBeUndefined()
  })

  it('recalibrates an existing plan without replacing image', () => {
    const actions = getFloorPlanActions()

    actions.importPlan({
      floorId,
      file: createTestFile(),
      imageSize: { width: 1000, height: 500 },
      referencePoints: [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ],
      realDistanceMm: 2000
    })

    actions.recalibratePlan({
      floorId,
      referencePoints: [
        { x: 0, y: 0 },
        { x: 50, y: 0 }
      ],
      realDistanceMm: 1000,
      originImagePoint: { x: 10, y: 20 }
    })

    const plan = useFloorPlanStore.getState().plans[floorId]
    expect(plan.calibration.mmPerPixel).toBeCloseTo(20)
    expect(plan.origin.image).toEqual({ x: 10, y: 20 })
  })
})
