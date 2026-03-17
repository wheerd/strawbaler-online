import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { getMaterialById } from '@/materials/store'
import type { MaterialId } from '@/materials/types'
import { getMaterialName } from '@/materials/ui/useMaterialName'
import type { Length } from '@/shared/geometry'

import type { PhysicsItem } from './types'

export function layerToPhysicsItems(layer: LayerConfig): PhysicsItem[] {
  if (layer.type === 'monolithic') {
    const material = getMaterialById(layer.material)
    return material
      ? [
          {
            material,
            thicknessMm: layer.thickness,
            label: t => getMaterialName(material, t)
          }
        ]
      : []
  }

  const stripeMaterial = getMaterialById(layer.stripeMaterial)
  const gapMaterial = layer.gapMaterial ? getMaterialById(layer.gapMaterial) : null

  const items: PhysicsItem[] = stripeMaterial
    ? [
        {
          material: stripeMaterial,
          thicknessMm: layer.thickness,
          label: t => getMaterialName(stripeMaterial, t)
        }
      ]
    : []

  if (gapMaterial) {
    items.push({
      material: gapMaterial,
      thicknessMm: layer.thickness,
      label: t => getMaterialName(gapMaterial, t)
    })
  }

  return items
}

export function materialToPhysicsItem(materialId: MaterialId, thickness: Length): PhysicsItem | null {
  const material = getMaterialById(materialId)
  return material
    ? {
        material,
        thicknessMm: thickness,
        label: t => getMaterialName(material, t)
      }
    : null
}
