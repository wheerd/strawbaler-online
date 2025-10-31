import { clayPlaster, limePlaster } from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const sanitizeThickness = (value: Length | undefined): Length => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? (numeric as Length) : (0 as Length)
}

const createMonolithicLayer = (material: MaterialId, thickness: Length): LayerConfig => ({
  type: 'monolithic',
  material,
  thickness: sanitizeThickness(thickness)
})

export const INVALID_FLOOR_LAYER_MATERIAL_ID = 'layer_invalid_material' as MaterialId

export const DEFAULT_WALL_LAYERS: Record<string, LayerConfig> = {
  'Clay Plaster (3cm)': createMonolithicLayer(clayPlaster.id, 30),
  'Lime Plaster (3cm)': createMonolithicLayer(limePlaster.id, 30)
}

export const createDefaultInsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(clayPlaster.id, thickness)
]

export const createDefaultOutsideLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(limePlaster.id, thickness)
]

export const createDefaultFloorTopLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness)
]

export const createDefaultFloorBottomLayers = (thickness: Length): LayerConfig[] => [
  createMonolithicLayer(INVALID_FLOOR_LAYER_MATERIAL_ID, thickness)
]
