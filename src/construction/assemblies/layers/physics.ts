import type { Material, MaterialId } from '@/materials/types'

import type { LayerConfig } from './types'

export interface LayerPhysics {
  sdValue: number
  rValue: number
  massPerArea: number
}

export interface LayerSetPhysics {
  totalSdValue: number
  totalRValue: number
  uValue: number
  totalMassPerArea: number
  layerPhysics: (LayerPhysics | null)[]
}

type MaterialResolver = (id: MaterialId) => Material | null

const MM_TO_M = 0.001

const AIR_THERMAL_CONDUCTIVITY = 0.026
const AIR_VAPOR_DIFFUSION_RESISTANCE = 1

export function computeLayerPhysics(layer: LayerConfig, getMaterial: MaterialResolver): LayerPhysics | null {
  if (layer.type === 'monolithic') {
    return computeMonolithicLayerPhysics(layer.thickness, layer.material, getMaterial)
  } else {
    return computeStripedLayerPhysics(layer, getMaterial)
  }
}

function computeMonolithicLayerPhysics(
  thicknessMm: number,
  materialId: MaterialId,
  getMaterial: MaterialResolver
): LayerPhysics | null {
  const material = getMaterial(materialId)
  if (!material) return null

  const thicknessM = thicknessMm * MM_TO_M

  const sdValue = computeSdValue(thicknessM, material.vaporDiffusionResistance)
  const rValue = computeRValue(thicknessM, material.thermalConductivity)
  const massPerArea = computeMassPerArea(thicknessM, material.density)

  if (sdValue === null || rValue === null || massPerArea === null) return null

  return { sdValue, rValue, massPerArea }
}

function computeStripedLayerPhysics(
  layer: Extract<LayerConfig, { type: 'striped' }>,
  getMaterial: MaterialResolver
): LayerPhysics | null {
  const stripeMaterial = getMaterial(layer.stripeMaterial)
  const gapMaterial = layer.gapMaterial ? getMaterial(layer.gapMaterial) : null

  if (!stripeMaterial) return null

  const thicknessM = layer.thickness * MM_TO_M
  const totalWidth = layer.stripeWidth + layer.gapWidth
  const stripeFraction = layer.stripeWidth / totalWidth
  const gapFraction = layer.gapWidth / totalWidth

  const stripeSd = computeSdValue(thicknessM, stripeMaterial.vaporDiffusionResistance)
  const stripeR = computeRValue(thicknessM, stripeMaterial.thermalConductivity)
  const stripeMass = computeMassPerArea(thicknessM, stripeMaterial.density)

  if (stripeSd === null || stripeR === null || stripeMass === null) return null

  if (!gapMaterial) {
    const gapR = thicknessM / AIR_THERMAL_CONDUCTIVITY
    const sdValue = stripeSd * stripeFraction + thicknessM * AIR_VAPOR_DIFFUSION_RESISTANCE * gapFraction
    const rValue = 1 / (stripeFraction / stripeR + gapFraction / gapR)
    const massPerArea = stripeMass * stripeFraction

    return { sdValue, rValue, massPerArea }
  }

  const gapSd = computeSdValue(thicknessM, gapMaterial.vaporDiffusionResistance)
  const gapR = computeRValue(thicknessM, gapMaterial.thermalConductivity)
  const gapMass = computeMassPerArea(thicknessM, gapMaterial.density)

  if (gapSd === null || gapR === null || gapMass === null) {
    const gapR = thicknessM / AIR_THERMAL_CONDUCTIVITY
    const sdValue = stripeSd * stripeFraction + thicknessM * AIR_VAPOR_DIFFUSION_RESISTANCE * gapFraction
    const rValue = 1 / (stripeFraction / stripeR + gapFraction / gapR)
    const massPerArea = stripeMass * stripeFraction

    return { sdValue, rValue, massPerArea }
  }

  const sdValue = stripeSd * stripeFraction + gapSd * gapFraction
  const rValue = 1 / (stripeFraction / stripeR + gapFraction / gapR)
  const massPerArea = stripeMass * stripeFraction + gapMass * gapFraction

  return { sdValue, rValue, massPerArea }
}

function computeSdValue(thicknessM: number, mu: number | undefined): number | null {
  if (mu === undefined || mu <= 0) return null
  return thicknessM * mu
}

function computeRValue(thicknessM: number, lambda: number | undefined): number | null {
  if (lambda === undefined || lambda <= 0) return null
  return thicknessM / lambda
}

function computeMassPerArea(thicknessM: number, density: number | undefined): number | null {
  if (density === undefined || density <= 0) return null
  return thicknessM * density
}

export function computeLayerSetPhysics(layers: LayerConfig[], getMaterial: MaterialResolver): LayerSetPhysics | null {
  const layerPhysics: (LayerPhysics | null)[] = []

  let totalSdValue = 0
  let totalRValue = 0
  let totalMassPerArea = 0
  let hasValidData = false

  for (const layer of layers) {
    const physics = computeLayerPhysics(layer, getMaterial)
    layerPhysics.push(physics)

    if (physics !== null) {
      hasValidData = true
      if (!layer.overlap) {
        totalSdValue += physics.sdValue
        totalRValue += physics.rValue
      }
      totalMassPerArea += physics.massPerArea
    }
  }

  if (!hasValidData) return null

  const uValue = totalRValue > 0 ? 1 / totalRValue : 0

  return {
    totalSdValue,
    totalRValue,
    uValue,
    totalMassPerArea,
    layerPhysics
  }
}
