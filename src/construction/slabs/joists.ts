import type { JoistSlabConstructionConfig } from '@/construction/config/types'
import { createUnsupportedModel } from '@/construction/model'
import { type PolygonWithHoles2D } from '@/shared/geometry'

import { BaseSlabConstructionMethod } from './base'

export class JoistConstructionMethod extends BaseSlabConstructionMethod<JoistSlabConstructionConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: JoistSlabConstructionConfig) => {
    // TODO: Implement joist slab construction.
    return createUnsupportedModel('Joist slab construction is not yet supported.', 'unsupported-slab-joist')
  }

  getTopOffset = (config: JoistSlabConstructionConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistSlabConstructionConfig) => 0
  getConstructionThickness = (config: JoistSlabConstructionConfig) => config.joistHeight
}
