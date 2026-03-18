import { File } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreyId } from '@/building/model/ids'

import { getAllFloorPlans, getFloorPlanActions, getFloorPlanForStorey } from './store'

vi.mock('./storage', () => ({
  FloorPlanStorage: vi.fn().mockImplementation(function () {
    return {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined)
    }
  })
}))

const floorId = 'floor-1' as StoreyId
const floorId2 = 'floor-2' as StoreyId

function createTestFile(name = 'plan.png'): File {
  return new File(['blueprint'], name, { type: 'image/png' })
}

describe('floor plan store', () => {
  beforeEach(() => {
    getFloorPlanActions().reset()
  })

  describe('importPlan', () => {
    it('stores a plan with calibration metadata', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 2000, height: 1000 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 5000
      })

      const plan = getFloorPlanForStorey(floorId)
      expect(plan).toBeTruthy()
      expect(plan!.imageMeta.width).toBe(2000)
      expect(plan!.calibration.pixelDistance).toBeCloseTo(100)
      expect(plan!.calibration.mmPerPixel).toBeCloseTo(50)
      expect(plan!.origin.image).toEqual({ x: 0, y: 0 })
    })

    it('stores a plan with custom origin', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 10, y: 20 },
          { x: 110, y: 20 }
        ],
        realDistanceMm: 1000,
        origin: {
          image: { x: 50, y: 50 },
          world: { x: 100, y: 200 }
        }
      })

      const plan = getFloorPlanForStorey(floorId)
      expect(plan!.origin.image).toEqual({ x: 50, y: 50 })
      expect(plan!.origin.world).toEqual({ x: 100, y: 200 })
    })

    it('sets default placement to over with overlay opacity', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      const plan = getFloorPlanForStorey(floorId)
      expect(plan!.placement).toBe('over')
      expect(plan!.opacity).toBe(0.45)
    })
  })

  describe('clearPlan', () => {
    it('clears an existing plan', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
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

      expect(getFloorPlanForStorey(floorId)).toBeNull()
    })

    it('does nothing when clearing non-existent plan', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.clearPlan(floorId2)

      expect(getFloorPlanForStorey(floorId)).toBeTruthy()
      expect(getFloorPlanForStorey(floorId2)).toBeNull()
    })
  })

  describe('recalibratePlan', () => {
    it('recalibrates an existing plan without replacing image', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile('original.png'),
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

      const plan = getFloorPlanForStorey(floorId)
      expect(plan!.calibration.mmPerPixel).toBeCloseTo(20)
      expect(plan!.origin.image).toEqual({ x: 10, y: 20 })
    })

    it('does nothing when recalibrating non-existent plan', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.recalibratePlan({
        floorId: floorId2,
        referencePoints: [
          { x: 0, y: 0 },
          { x: 50, y: 0 }
        ],
        realDistanceMm: 500,
        originImagePoint: { x: 10, y: 20 }
      })

      expect(getFloorPlanForStorey(floorId2)).toBeNull()
    })
  })

  describe('setPlacement', () => {
    it('sets placement to under with underlay opacity', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.setPlacement(floorId, 'under')

      const plan = getFloorPlanForStorey(floorId)
      expect(plan!.placement).toBe('under')
      expect(plan!.opacity).toBe(0.85)
    })

    it('sets placement to over with overlay opacity', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.setPlacement(floorId, 'under')
      actions.setPlacement(floorId, 'over')

      const plan = getFloorPlanForStorey(floorId)
      expect(plan!.placement).toBe('over')
      expect(plan!.opacity).toBe(0.45)
    })

    it('does nothing when setting placement for non-existent plan', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.setPlacement(floorId2, 'under')

      expect(getFloorPlanForStorey(floorId2)).toBeNull()
    })
  })

  describe('reset', () => {
    it('clears all plans', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      await actions.importPlan({
        floorId: floorId2,
        file: createTestFile(),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      actions.reset()

      expect(getFloorPlanForStorey(floorId)).toBeNull()
      expect(getFloorPlanForStorey(floorId2)).toBeNull()
    })
  })

  describe('getFloorPlanForStorey', () => {
    it('returns null when plan does not exist', () => {
      expect(getFloorPlanForStorey(floorId)).toBeNull()
    })

    it('returns plan when it exists', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile('test.png'),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      const plan = getFloorPlanForStorey(floorId)
      expect(plan).toBeTruthy()
      expect(plan!.imageMeta.hash).toBeTruthy()
    })
  })

  describe('getAllFloorPlans', () => {
    it('returns empty array when no plans exist', () => {
      expect(getAllFloorPlans()).toEqual([])
    })

    it('returns all plans', async () => {
      const actions = getFloorPlanActions()

      await actions.importPlan({
        floorId,
        file: createTestFile('plan1.png'),
        imageSize: { width: 800, height: 600 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 100, y: 0 }
        ],
        realDistanceMm: 1000
      })

      await actions.importPlan({
        floorId: floorId2,
        file: createTestFile('plan2.png'),
        imageSize: { width: 600, height: 400 },
        referencePoints: [
          { x: 0, y: 0 },
          { x: 50, y: 0 }
        ],
        realDistanceMm: 500
      })

      const plans = getAllFloorPlans()
      expect(plans).toHaveLength(2)
      expect(plans[0].imageMeta.hash).toBeTruthy()
      expect(plans[1].imageMeta.hash).toBeTruthy()
    })
  })
})
