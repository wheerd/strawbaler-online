import {
  battens,
  boards,
  cementScreed,
  clayPlasterBase,
  clayPlasterFine,
  dhf,
  gypsum,
  impactSoundInsulation,
  limePlasterBase,
  limePlasterFine,
  reed,
  windBarrier
} from '@/construction/materials/material'
import type { MaterialId } from '@/construction/materials/material'
import type { Length } from '@/shared/geometry'

import type { LayerConfig } from './types'

const createMonolithicLayer = (
  material: MaterialId,
  thickness: Length,
  name: string,
  overlap?: boolean
): LayerConfig => ({
  type: 'monolithic',
  name,
  material,
  thickness,
  overlap
})

export const DEFAULT_WALL_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)')
  ],
  'Clay Plaster + Diagonal Bracing': [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      direction: 'diagonal',
      stripeMaterial: boards.id,
      stripeWidth: 200,
      gapMaterial: clayPlasterBase.id,
      gapWidth: 50,
      thickness: 25
    } satisfies LayerConfig,
    createMonolithicLayer(clayPlasterFine.id, 5, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)')
  ],
  'Lime Plaster + DHF': [
    createMonolithicLayer(dhf.id, 16, 'DHF'),
    createMonolithicLayer(reed.id, 9, 'Plaster Ground (Reed)', true),
    createMonolithicLayer(limePlasterBase.id, 10, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlasterFine.id, 4, 'Fine Plaster (Lime)')
  ],
  'Lime Plaster + Diagonal Bracing': [
    {
      type: 'striped',
      name: 'Diagonal Bracing',
      direction: 'diagonal',
      stripeMaterial: boards.id,
      stripeWidth: 200,
      gapMaterial: limePlasterBase.id,
      gapWidth: 50,
      thickness: 25
    } satisfies LayerConfig,
    createMonolithicLayer(limePlasterFine.id, 5, 'Fine Plaster (Lime)')
  ],
  'Wooden Planking': [
    createMonolithicLayer(windBarrier.id, 1, 'Wind Barrier'),
    {
      type: 'striped',
      name: 'Battens',
      direction: 'colinear',
      stripeMaterial: battens.id,
      stripeWidth: 48,
      gapWidth: 500,
      thickness: 24
    } satisfies LayerConfig,
    createMonolithicLayer(boards.id, 25, 'Wood Planking')
  ],
  'Wooden Planking + DHF': [
    createMonolithicLayer(dhf.id, 16, 'DHF'),
    {
      type: 'striped',
      name: 'Battens',
      direction: 'colinear',
      stripeMaterial: battens.id,
      stripeWidth: 48,
      gapWidth: 500,
      thickness: 24
    } satisfies LayerConfig,
    createMonolithicLayer(boards.id, 25, 'Wood Planking')
  ],
  Gypsum: [createMonolithicLayer(gypsum.id, 30, 'Gypsum Boards')]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_FLOOR_LAYER_SETS = {
  Screet: [
    createMonolithicLayer(impactSoundInsulation.id, 25, 'Impact Sound Insulation'),
    createMonolithicLayer(cementScreed.id, 35, 'Screed')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_CEILING_LAYER_SETS = {
  'Clay Plaster': [
    createMonolithicLayer(clayPlasterBase.id, 20, 'Base Plaster (Clay)'),
    createMonolithicLayer(clayPlasterFine.id, 10, 'Fine Plaster (Clay)')
  ],
  'Lime Plaster': [
    createMonolithicLayer(limePlasterBase.id, 20, 'Base Plaster (Lime)'),
    createMonolithicLayer(limePlasterFine.id, 10, 'Fine Plaster (Lime)')
  ]
} satisfies Record<string, LayerConfig[]>

export const DEFAULT_ROOF_LAYER_SETS = {
  Tiles: [
    createMonolithicLayer(windBarrier.id, 1, 'Wind Paper'),
    {
      type: 'striped',
      direction: 'colinear',
      name: 'Battens',
      gapWidth: 500,
      thickness: 40,
      stripeMaterial: battens.id,
      stripeWidth: 60
    },
    {
      type: 'striped',
      direction: 'perpendicular',
      name: 'Counter Battens',
      gapWidth: 300,
      thickness: 30,
      stripeMaterial: battens.id,
      stripeWidth: 50
    },
    createMonolithicLayer('material_invalid' as MaterialId, 35, 'Tiles')
  ]
} satisfies Record<string, LayerConfig[]>
