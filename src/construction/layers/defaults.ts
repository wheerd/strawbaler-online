import { cementScreed, clayPlaster, impactSoundInsulation, limePlaster } from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const createMonolithicLayer = (material: MaterialId, thickness: Length, name: string): LayerConfig => ({
  type: 'monolithic',
  name,
  material,
  thickness
})

export const DEFAULT_WALL_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlaster.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlaster.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlaster.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlaster.id, 10, 'Fine Plaster (Lime)')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_FLOOR_LAYER_SETS = {
  Screet: [
    createMonolithicLayer(impactSoundInsulation.id, 25, 'Impact Sound Insulation'),
    createMonolithicLayer(cementScreed.id, 35, 'Screed')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_CEILING_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlaster.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlaster.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlaster.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlaster.id, 10, 'Fine Plaster (Lime)')
  ]
} satisfies Record<string, LayerConfig[]>
