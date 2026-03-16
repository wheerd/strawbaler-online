import { describe, expect, it } from 'vitest'

import type { LayerConfig } from '@/construction/assemblies/layers/types'
import type { Material, MaterialId } from '@/materials/types'

import { computeLayerPhysics, computeLayerSetPhysics } from './physics'

function createMaterial(overrides: Partial<Material> = {}): Material {
  const base: Material = {
    type: 'generic',
    id: 'material_test' as MaterialId,
    name: 'Test Material',
    color: '#ffffff',
    density: 100,
    thermalConductivity: 0.1,
    vaporDiffusionResistance: 10,
    specificHeatCapacity: 1000
  }
  return { ...base, ...overrides } as Material
}

const createMaterialResolver =
  (materials: Material[]) =>
  (id: MaterialId): Material | null =>
    materials.find(m => m.id === id) ?? null

describe('computeLayerPhysics', () => {
  describe('monolithic layers', () => {
    it('computes all physics values for a monolithic layer with complete material', () => {
      const material = createMaterial({
        id: 'material_1' as MaterialId,
        density: 500,
        thermalConductivity: 0.13,
        vaporDiffusionResistance: 50
      })

      const layer: LayerConfig = {
        type: 'monolithic',
        name: 'Test Layer',
        thickness: 100,
        material: material.id
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([material]))

      expect(result.sdValue).toBeCloseTo(0.1 * 50, 4)
      expect(result.rValue).toBeCloseTo(0.1 / 0.13, 4)
      expect(result.massPerArea).toBeCloseTo(0.1 * 500, 4)
    })

    it('returns null for all values when material is missing', () => {
      const layer: LayerConfig = {
        type: 'monolithic',
        name: 'Test Layer',
        thickness: 100,
        material: 'material_missing' as MaterialId
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([]))

      expect(result.sdValue).toBeNull()
      expect(result.rValue).toBeNull()
      expect(result.massPerArea).toBeNull()
    })

    it('returns null for rValue when thermal conductivity is missing but computes others', () => {
      const material = createMaterial({
        id: 'material_1' as MaterialId,
        thermalConductivity: undefined
      })

      const layer: LayerConfig = {
        type: 'monolithic',
        name: 'Test Layer',
        thickness: 100,
        material: material.id
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([material]))

      expect(result.sdValue).toBeCloseTo(0.1 * 10, 4)
      expect(result.rValue).toBeNull()
      expect(result.massPerArea).toBeCloseTo(0.1 * 100, 4)
    })

    it('returns null for massPerArea when density is missing but computes others', () => {
      const material = createMaterial({
        id: 'material_1' as MaterialId,
        density: undefined
      })

      const layer: LayerConfig = {
        type: 'monolithic',
        name: 'Test Layer',
        thickness: 100,
        material: material.id
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([material]))

      expect(result.sdValue).toBeCloseTo(0.1 * 10, 4)
      expect(result.rValue).toBeCloseTo(0.1 / 0.1, 4)
      expect(result.massPerArea).toBeNull()
    })

    it('returns null for sdValue when vapor diffusion resistance is missing but computes others', () => {
      const material = createMaterial({
        id: 'material_1' as MaterialId,
        vaporDiffusionResistance: undefined
      })

      const layer: LayerConfig = {
        type: 'monolithic',
        name: 'Test Layer',
        thickness: 100,
        material: material.id
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([material]))

      expect(result.sdValue).toBeNull()
      expect(result.rValue).toBeCloseTo(0.1 / 0.1, 4)
      expect(result.massPerArea).toBeCloseTo(0.1 * 100, 4)
    })
  })

  describe('striped layers', () => {
    it('computes weighted average for striped layer with gap material', () => {
      const stripeMaterial = createMaterial({
        id: 'material_stripe' as MaterialId,
        density: 480,
        thermalConductivity: 0.13,
        vaporDiffusionResistance: 50
      })

      const gapMaterial = createMaterial({
        id: 'material_gap' as MaterialId,
        density: 110,
        thermalConductivity: 0.052,
        vaporDiffusionResistance: 2
      })

      const layer: LayerConfig = {
        type: 'striped',
        name: 'Striped Layer',
        thickness: 360,
        direction: 'perpendicular',
        stripeWidth: 60,
        stripeMaterial: stripeMaterial.id,
        gapWidth: 300,
        gapMaterial: gapMaterial.id
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([stripeMaterial, gapMaterial]))

      const stripeFraction = 60 / 360
      const gapFraction = 300 / 360
      const thicknessM = 0.36

      const expectedSdStripe = thicknessM * 50
      const expectedSdGap = thicknessM * 2
      const expectedSd = expectedSdStripe * stripeFraction + expectedSdGap * gapFraction

      const expectedRStripe = thicknessM / 0.13
      const expectedRGap = thicknessM / 0.052
      const expectedR = 1 / (stripeFraction / expectedRStripe + gapFraction / expectedRGap)

      const expectedMassStripe = thicknessM * 480
      const expectedMassGap = thicknessM * 110
      const expectedMass = expectedMassStripe * stripeFraction + expectedMassGap * gapFraction

      expect(result.sdValue).toBeCloseTo(expectedSd, 4)
      expect(result.rValue).toBeCloseTo(expectedR, 4)
      expect(result.massPerArea).toBeCloseTo(expectedMass, 4)
    })

    it('handles striped layer without gap material (air gap)', () => {
      const stripeMaterial = createMaterial({
        id: 'material_stripe' as MaterialId,
        density: 480,
        thermalConductivity: 0.13,
        vaporDiffusionResistance: 50
      })

      const layer: LayerConfig = {
        type: 'striped',
        name: 'Striped Layer',
        thickness: 100,
        direction: 'perpendicular',
        stripeWidth: 60,
        stripeMaterial: stripeMaterial.id,
        gapWidth: 40,
        gapMaterial: undefined
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([stripeMaterial]))

      const stripeFraction = 60 / 100
      const gapFraction = 40 / 100
      const thicknessM = 0.1

      const expectedSd = thicknessM * 50 * stripeFraction + thicknessM * 1 * gapFraction
      const expectedRGap = thicknessM / 0.026
      const expectedRStripe = thicknessM / 0.13
      const expectedR = 1 / (stripeFraction / expectedRStripe + gapFraction / expectedRGap)
      const expectedMass = thicknessM * 480 * stripeFraction

      expect(result.sdValue).toBeCloseTo(expectedSd, 4)
      expect(result.rValue).toBeCloseTo(expectedR, 4)
      expect(result.massPerArea).toBeCloseTo(expectedMass, 4)
    })

    it('returns null for all values when stripe material is missing', () => {
      const layer: LayerConfig = {
        type: 'striped',
        name: 'Striped Layer',
        thickness: 100,
        direction: 'perpendicular',
        stripeWidth: 60,
        stripeMaterial: 'material_missing' as MaterialId,
        gapWidth: 40
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([]))

      expect(result.sdValue).toBeNull()
      expect(result.rValue).toBeNull()
      expect(result.massPerArea).toBeNull()
    })

    it('computes partial values when stripe material has partial data', () => {
      const stripeMaterial = createMaterial({
        id: 'material_stripe' as MaterialId,
        density: 480,
        thermalConductivity: undefined,
        vaporDiffusionResistance: 50
      })

      const layer: LayerConfig = {
        type: 'striped',
        name: 'Striped Layer',
        thickness: 100,
        direction: 'perpendicular',
        stripeWidth: 60,
        stripeMaterial: stripeMaterial.id,
        gapWidth: 40,
        gapMaterial: undefined
      }

      const result = computeLayerPhysics(layer, createMaterialResolver([stripeMaterial]))

      expect(result.sdValue).not.toBeNull()
      expect(result.rValue).toBeNull()
      expect(result.massPerArea).not.toBeNull()
    })
  })
})

describe('computeLayerSetPhysics', () => {
  it('computes physics for a layer set', () => {
    const material1 = createMaterial({
      id: 'material_1' as MaterialId,
      density: 110,
      thermalConductivity: 0.052,
      vaporDiffusionResistance: 2
    })

    const material2 = createMaterial({
      id: 'material_2' as MaterialId,
      density: 480,
      thermalConductivity: 0.13,
      vaporDiffusionResistance: 50
    })

    const layers: LayerConfig[] = [
      {
        type: 'monolithic',
        name: 'Plaster',
        thickness: 20,
        material: material2.id
      },
      {
        type: 'monolithic',
        name: 'Straw',
        thickness: 360,
        material: material1.id
      },
      {
        type: 'monolithic',
        name: 'Plaster',
        thickness: 30,
        material: material2.id
      }
    ]

    const result = computeLayerSetPhysics(layers, createMaterialResolver([material1, material2]))

    expect(result).not.toBeNull()
    expect(result!.layerPhysics).toHaveLength(3)

    const expectedTotalR = 0.02 / 0.13 + 0.36 / 0.052 + 0.03 / 0.13
    const expectedTotalSd = 0.02 * 50 + 0.36 * 2 + 0.03 * 50
    const expectedMass = 0.02 * 480 + 0.36 * 110 + 0.03 * 480

    expect(result!.totalRValue).toBeCloseTo(expectedTotalR, 4)
    expect(result!.totalSdValue).toBeCloseTo(expectedTotalSd, 4)
    expect(result!.totalMassPerArea).toBeCloseTo(expectedMass, 4)
    expect(result!.uValue).toBeCloseTo(1 / expectedTotalR, 6)
  })

  it('handles overlapping layers', () => {
    const material = createMaterial({
      id: 'material_1' as MaterialId,
      density: 500,
      thermalConductivity: 0.1,
      vaporDiffusionResistance: 10
    })

    const layers: LayerConfig[] = [
      {
        type: 'monolithic',
        name: 'Layer 1',
        thickness: 100,
        material: material.id
      },
      {
        type: 'monolithic',
        name: 'Layer 2 (overlap)',
        thickness: 50,
        material: material.id,
        overlap: true
      }
    ]

    const result = computeLayerSetPhysics(layers, createMaterialResolver([material]))

    expect(result).not.toBeNull()

    expect(result!.totalRValue).toBeCloseTo(0.1 / 0.1, 4)
    expect(result!.totalSdValue).toBeCloseTo(0.1 * 10, 4)
    expect(result!.totalMassPerArea).toBeCloseTo(0.15 * 500, 4)
  })

  it('returns null for empty layer set', () => {
    const result = computeLayerSetPhysics([], createMaterialResolver([]))

    expect(result).toBeNull()
  })

  it('returns null for totals when any layer has null value for that property', () => {
    const completeMaterial = createMaterial({
      id: 'material_complete' as MaterialId,
      density: 500,
      thermalConductivity: 0.1,
      vaporDiffusionResistance: 10
    })

    const missingLambdaMaterial = createMaterial({
      id: 'material_missing_lambda' as MaterialId,
      density: 300,
      thermalConductivity: undefined,
      vaporDiffusionResistance: 5
    })

    const layers: LayerConfig[] = [
      {
        type: 'monolithic',
        name: 'Complete',
        thickness: 100,
        material: completeMaterial.id
      },
      {
        type: 'monolithic',
        name: 'Missing Lambda',
        thickness: 50,
        material: missingLambdaMaterial.id
      }
    ]

    const result = computeLayerSetPhysics(layers, createMaterialResolver([completeMaterial, missingLambdaMaterial]))

    expect(result).not.toBeNull()
    expect(result!.layerPhysics).toHaveLength(2)

    expect(result!.totalRValue).toBeNull()
    expect(result!.uValue).toBeNull()
    expect(result!.totalSdValue).not.toBeNull()
    expect(result!.totalMassPerArea).not.toBeNull()
  })

  it('computes available totals independently', () => {
    const material1 = createMaterial({
      id: 'material_1' as MaterialId,
      density: 500,
      thermalConductivity: 0.1,
      vaporDiffusionResistance: undefined
    })

    const material2 = createMaterial({
      id: 'material_2' as MaterialId,
      density: undefined,
      thermalConductivity: 0.05,
      vaporDiffusionResistance: 10
    })

    const layers: LayerConfig[] = [
      {
        type: 'monolithic',
        name: 'Layer 1',
        thickness: 100,
        material: material1.id
      },
      {
        type: 'monolithic',
        name: 'Layer 2',
        thickness: 50,
        material: material2.id
      }
    ]

    const result = computeLayerSetPhysics(layers, createMaterialResolver([material1, material2]))

    expect(result).not.toBeNull()

    expect(result!.totalSdValue).toBeNull()
    expect(result!.totalMassPerArea).toBeNull()

    const expectedTotalR = 0.1 / 0.1 + 0.05 / 0.05
    expect(result!.totalRValue).toBeCloseTo(expectedTotalR, 4)
    expect(result!.uValue).toBeCloseTo(1 / expectedTotalR, 4)
  })
})
