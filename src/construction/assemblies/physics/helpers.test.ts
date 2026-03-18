import { describe, expect, it, vi } from 'vitest'

import type { LayerConfig } from '@/construction/assemblies/layers/types'
import {
  layerToPhysicsParallel,
  materialToPhysicsParallel,
  materialToPhysicsSeriesItem
} from '@/construction/assemblies/physics/helpers'
import * as materialsStore from '@/materials/store'
import type { Material, MaterialId } from '@/materials/types'

vi.mock('@/materials/store', () => ({
  getMaterialById: vi.fn()
}))

const createMaterial = (overrides: Partial<Material> = {}): Material =>
  ({
    id: 'test-material' as MaterialId,
    name: 'Test Material',
    type: 'other',
    thermalConductivity: 0.04,
    vaporDiffusionResistance: 1,
    density: 100,
    specificHeatCapacity: 1000,
    ...overrides
  }) as Material

describe('layerToPhysicsParallel', () => {
  it('returns null for monolithic layer when material is missing', () => {
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(null)

    const layer: LayerConfig = {
      type: 'monolithic',
      name: 'Test Layer',
      thickness: 100,
      material: 'missing' as MaterialId
    }

    const result = layerToPhysicsParallel(layer)

    expect(result).toBeNull()
  })

  it('returns PhysicsParallel with single item for monolithic layer', () => {
    const material = createMaterial({ id: 'mat1' as MaterialId })
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(material)

    const layer: LayerConfig = {
      type: 'monolithic',
      name: 'Test Layer',
      thickness: 100,
      material: 'mat1' as MaterialId
    }

    const result = layerToPhysicsParallel(layer)

    expect(result).not.toBeNull()
    expect(result!.items).toHaveLength(1)
    expect(result!.items[0].areaFraction).toBe(1)
    expect(result!.thicknessMm).toBe(100)
  })

  it('returns PhysicsParallel with two items for striped layer', () => {
    const stripeMaterial = createMaterial({ id: 'stripe' as MaterialId, name: 'Stripe' })
    const gapMaterial = createMaterial({ id: 'gap' as MaterialId, name: 'Gap' })
    vi.mocked(materialsStore.getMaterialById).mockImplementation(id => {
      if (id === 'stripe') return stripeMaterial
      if (id === 'gap') return gapMaterial
      return null
    })

    const layer: LayerConfig = {
      type: 'striped',
      name: 'Striped Layer',
      thickness: 200,
      stripeMaterial: 'stripe' as MaterialId,
      stripeWidth: 50,
      gapMaterial: 'gap' as MaterialId,
      gapWidth: 450,
      direction: 'perpendicular'
    }

    const result = layerToPhysicsParallel(layer)

    expect(result).not.toBeNull()
    expect(result!.items).toHaveLength(2)
    expect(result!.items[0].areaFraction).toBeCloseTo(0.1)
    expect(result!.items[1].areaFraction).toBeCloseTo(0.9)
    expect(result!.thicknessMm).toBe(200)
  })

  it('uses air as default gap material when not specified', () => {
    const stripeMaterial = createMaterial({ id: 'stripe' as MaterialId })
    vi.mocked(materialsStore.getMaterialById).mockImplementation(id => (id === 'stripe' ? stripeMaterial : null))

    const layer: LayerConfig = {
      type: 'striped',
      name: 'Striped Layer',
      thickness: 200,
      stripeMaterial: 'stripe' as MaterialId,
      stripeWidth: 100,
      gapMaterial: undefined,
      gapWidth: 100,
      direction: 'perpendicular'
    }

    const result = layerToPhysicsParallel(layer)

    expect(result).not.toBeNull()
    expect(result!.items).toHaveLength(2)
    expect(result!.items[1].material.thermalConductivity).toBe(0.026)
    expect(result!.items[1].material.vaporDiffusionResistance).toBe(1)
  })
})

describe('materialToPhysicsSeriesItem', () => {
  it('returns null when material is missing', () => {
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(null)

    const result = materialToPhysicsSeriesItem('missing' as MaterialId, 100)

    expect(result).toBeNull()
  })

  it('returns PhysicsSeriesItem with correct values', () => {
    const material = createMaterial()
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(material)

    const result = materialToPhysicsSeriesItem('mat1' as MaterialId, 150)

    expect(result).not.toBeNull()
    expect(result!.thicknessMm).toBe(150)
    expect(result!.material).toBe(material)
  })
})

describe('materialToPhysicsParallel', () => {
  it('returns null when material is missing', () => {
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(null)

    const result = materialToPhysicsParallel('missing' as MaterialId, 100, 'Test')

    expect(result).toBeNull()
  })

  it('returns PhysicsParallel with single item', () => {
    const material = createMaterial()
    vi.mocked(materialsStore.getMaterialById).mockReturnValue(material)

    const result = materialToPhysicsParallel('mat1' as MaterialId, 100, 'Test Layer')

    expect(result).not.toBeNull()
    expect(result!.items).toHaveLength(1)
    expect(result!.items[0].areaFraction).toBe(1)
    expect(result!.thicknessMm).toBe(100)
  })
})
