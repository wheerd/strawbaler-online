import { cementScreed, clayPlaster, impactSoundInsulation, limePlaster } from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const sanitizeThickness = (value: Length | undefined): Length => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? (numeric as Length) : (0 as Length)
}

const createMonolithicLayer = (material: MaterialId, thickness: Length, name: string): LayerConfig => ({
  type: 'monolithic',
  name,
  material,
  thickness: sanitizeThickness(thickness)
})

export const INVALID_FLOOR_LAYER_MATERIAL_ID = 'material_invalid' as MaterialId

export const createDefaultInsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(clayPlaster.id, thickness, 'Inside Finish')
]

export const createDefaultOutsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(limePlaster.id, thickness, 'Outside Finish')
]

export const createDefaultFloorTopLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness, 'Top Layer')
]

export const createDefaultFloorBottomLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness, 'Bottom Layer')
]

export const DEFAULT_WALL_LAYER_SETS: Record<string, LayerConfig[]> = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlaster.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlaster.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlaster.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlaster.id, 10, 'Fine Plaster (Lime)')
  ]
}

export const DEFAULT_FLOOR_LAYER_SETS: Record<string, LayerConfig[]> = {
  Screet: [
    createMonolithicLayer(impactSoundInsulation.id, 25, 'Impact Sound Insulation'),
    createMonolithicLayer(cementScreed.id, 35, 'Screed')
  ]
}

export const DEFAULT_CEILING_LAYER_SETS: Record<string, LayerConfig[]> = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlaster.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlaster.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlaster.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlaster.id, 10, 'Fine Plaster (Lime)')
  ]
}
