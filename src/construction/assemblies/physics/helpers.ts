import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { getMaterialById } from '@/materials/store'
import type { MaterialId } from '@/materials/types'
import { getMaterialName } from '@/materials/ui/useMaterialName'
import type { Length } from '@/shared/geometry'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'

import type { PhysicsParallel, PhysicsParallelItem, PhysicsSeriesItem } from './types'

const AIR_THERMAL_CONDUCTIVITY = 0.026
const AIR_VAPOR_DIFFUSION_RESISTANCE = 1

function createAirMaterial(): PhysicsParallelItem['material'] {
  return {
    thermalConductivity: AIR_THERMAL_CONDUCTIVITY,
    vaporDiffusionResistance: AIR_VAPOR_DIFFUSION_RESISTANCE,
    density: 1.2,
    specificHeatCapacity: 1000
  }
}

function getLayerName(layer: LayerConfig): TranslatableString {
  const nameKey = layer.nameKey
  return t => {
    if (nameKey) {
      return t(nameKey, { ns: 'config' })
    }
    return layer.name
  }
}

export function layerToPhysicsParallel(layer: LayerConfig): PhysicsParallel | null {
  const label = getLayerName(layer)
  if (layer.type === 'monolithic') {
    const material = getMaterialById(layer.material)
    if (!material) return null
    return {
      items: [{ material, label: t => getMaterialName(material, t), areaFraction: 1 }],
      thicknessMm: layer.thickness,
      label
    }
  }

  const stripeMaterial = getMaterialById(layer.stripeMaterial)
  const gapMaterial = layer.gapMaterial ? getMaterialById(layer.gapMaterial) : null

  if (!stripeMaterial) return null

  const totalWidth = layer.stripeWidth + layer.gapWidth
  const stripeFraction = layer.stripeWidth / totalWidth
  const gapFraction = layer.gapWidth / totalWidth

  const items: PhysicsParallelItem[] = [
    { material: stripeMaterial, label: t => getMaterialName(stripeMaterial, t), areaFraction: stripeFraction }
  ]

  if (gapMaterial) {
    items.push({ material: gapMaterial, label: t => getMaterialName(gapMaterial, t), areaFraction: gapFraction })
    return {
      items,
      thicknessMm: layer.thickness,
      label
    }
  } else {
    const airMaterial = createAirMaterial()
    items.push({
      material: airMaterial,
      label: t => t($ => $.physics.breakdown.air, { ns: 'config' }),
      areaFraction: gapFraction
    })
    return {
      items,
      thicknessMm: layer.thickness,
      label,
      isVentilatedAirGap: true
    }
  }
}

export function materialToPhysicsSeriesItem(materialId: MaterialId, thickness: Length): PhysicsSeriesItem | null {
  const material = getMaterialById(materialId)
  return material
    ? {
        material,
        thicknessMm: thickness,
        label: t => getMaterialName(material, t)
      }
    : null
}

export function materialToPhysicsParallel(
  materialId: MaterialId,
  thickness: number,
  layerName: TranslatableString
): PhysicsParallel | null {
  const material = getMaterialById(materialId)
  if (!material) return null
  return {
    items: [{ material, label: t => getMaterialName(material, t), areaFraction: 1 }],
    thicknessMm: thickness,
    label: layerName
  }
}
