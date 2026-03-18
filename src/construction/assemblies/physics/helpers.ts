import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { getMaterialById } from '@/materials/store'
import type { MaterialId } from '@/materials/types'
import { getMaterialName } from '@/materials/ui/useMaterialName'
import type { Length } from '@/shared/geometry'

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

export function layerToPhysicsParallel(layer: LayerConfig): PhysicsParallel | null {
  if (layer.type === 'monolithic') {
    const material = getMaterialById(layer.material)
    if (!material) return null
    return {
      items: [{ material, label: t => getMaterialName(material, t), areaFraction: 1 }],
      thicknessMm: layer.thickness,
      label: () => layer.name
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
  } else {
    const airMaterial = createAirMaterial()
    items.push({ material: airMaterial, label: () => 'Air', areaFraction: gapFraction })
  }

  return {
    items,
    thicknessMm: layer.thickness,
    label: () => layer.name
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
  layerName: string
): PhysicsParallel | null {
  const material = getMaterialById(materialId)
  if (!material) return null
  return {
    items: [{ material, label: t => getMaterialName(material, t), areaFraction: 1 }],
    thicknessMm: thickness,
    label: () => layerName
  }
}
