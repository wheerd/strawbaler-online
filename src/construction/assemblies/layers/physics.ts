import type { Material, MaterialId } from '@/materials/types'

import type { LayerConfig } from './types'

export interface LayerPhysics {
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}

export interface LayerSetPhysics {
  totalSdValue: number | null
  totalRValue: number | null
  uValue: number | null
  totalMassPerArea: number | null
  layerPhysics: LayerPhysics[]
}

type MaterialResolver = (id: MaterialId) => Material | null

const MM_TO_M = 0.001

const AIR_THERMAL_CONDUCTIVITY = 0.026
const AIR_VAPOR_DIFFUSION_RESISTANCE = 1

export function computeLayerPhysics(layer: LayerConfig, getMaterial: MaterialResolver): LayerPhysics {
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
): LayerPhysics {
  const material = getMaterial(materialId)
  if (!material) {
    return { sdValue: null, rValue: null, massPerArea: null }
  }

  const thicknessM = thicknessMm * MM_TO_M

  return {
    sdValue: computeSdValue(thicknessM, material.vaporDiffusionResistance),
    rValue: computeRValue(thicknessM, material.thermalConductivity),
    massPerArea: computeMassPerArea(thicknessM, material.density)
  }
}

function computeStripedLayerPhysics(
  layer: Extract<LayerConfig, { type: 'striped' }>,
  getMaterial: MaterialResolver
): LayerPhysics {
  const stripeMaterial = getMaterial(layer.stripeMaterial)
  const gapMaterial = layer.gapMaterial ? getMaterial(layer.gapMaterial) : null

  if (!stripeMaterial) {
    return { sdValue: null, rValue: null, massPerArea: null }
  }

  const thicknessM = layer.thickness * MM_TO_M
  const totalWidth = layer.stripeWidth + layer.gapWidth
  const stripeFraction = layer.stripeWidth / totalWidth
  const gapFraction = layer.gapWidth / totalWidth

  const stripeSd = computeSdValue(thicknessM, stripeMaterial.vaporDiffusionResistance)
  const stripeR = computeRValue(thicknessM, stripeMaterial.thermalConductivity)
  const stripeMass = computeMassPerArea(thicknessM, stripeMaterial.density)

  if (!gapMaterial) {
    const gapR = thicknessM / AIR_THERMAL_CONDUCTIVITY
    return {
      sdValue: combineSdWithAir(stripeSd, stripeFraction, thicknessM, gapFraction),
      rValue: stripeR !== null ? 1 / (stripeFraction / stripeR + gapFraction / gapR) : null,
      massPerArea: stripeMass !== null ? stripeMass * stripeFraction : null
    }
  }

  const gapSd = computeSdValue(thicknessM, gapMaterial.vaporDiffusionResistance)
  const gapR = computeRValue(thicknessM, gapMaterial.thermalConductivity)
  const gapMass = computeMassPerArea(thicknessM, gapMaterial.density)

  if (gapSd === null || gapR === null || gapMass === null) {
    const gapR = thicknessM / AIR_THERMAL_CONDUCTIVITY
    return {
      sdValue: combineSdWithAir(stripeSd, stripeFraction, thicknessM, gapFraction),
      rValue: stripeR !== null ? 1 / (stripeFraction / stripeR + gapFraction / gapR) : null,
      massPerArea: stripeMass !== null ? stripeMass * stripeFraction : null
    }
  }

  return {
    sdValue: stripeSd !== null ? stripeSd * stripeFraction + gapSd * gapFraction : null,
    rValue: stripeR !== null ? 1 / (stripeFraction / stripeR + gapFraction / gapR) : null,
    massPerArea: stripeMass !== null ? stripeMass * stripeFraction + gapMass * gapFraction : null
  }
}

function combineSdWithAir(
  stripeSd: number | null,
  stripeFraction: number,
  thicknessM: number,
  gapFraction: number
): number | null {
  if (stripeSd === null) return null
  return stripeSd * stripeFraction + thicknessM * AIR_VAPOR_DIFFUSION_RESISTANCE * gapFraction
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
  if (layers.length === 0) return null

  const layerPhysics: LayerPhysics[] = layers.map(layer => computeLayerPhysics(layer, getMaterial))

  const totalSdValue = aggregateTotal(layerPhysics, 'sdValue', layers)
  const totalRValue = aggregateTotal(layerPhysics, 'rValue', layers)
  const totalMassPerArea = aggregateTotal(layerPhysics, 'massPerArea', layers, true)

  const uValue = totalRValue !== null && totalRValue > 0 ? 1 / totalRValue : null

  return {
    totalSdValue,
    totalRValue,
    uValue,
    totalMassPerArea,
    layerPhysics
  }
}

function aggregateTotal(
  layerPhysics: LayerPhysics[],
  key: keyof LayerPhysics,
  layers: LayerConfig[],
  includeOverlap = false
): number | null {
  let total = 0
  for (let i = 0; i < layerPhysics.length; i++) {
    const value = layerPhysics[i][key]
    if (value === null) return null
    if (includeOverlap || !layers[i].overlap) {
      total += value
    }
  }
  return total
}
