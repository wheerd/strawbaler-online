import type { CltConstructionConfig } from '@/construction/config/types'
import { type PolygonWithHoles2D, createLength } from '@/shared/geometry'

import { BaseSlabConstructionMethod } from './base'

export class CltConstructionMethod extends BaseSlabConstructionMethod<CltConstructionConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: CltConstructionConfig) => {
    throw new Error('TODO: Implement')
  }

  getTopOffset = (_config: CltConstructionConfig) => createLength(0)
  getBottomOffset = (_config: CltConstructionConfig) => createLength(0)
  getConstructionThickness = (config: CltConstructionConfig) => config.thickness
}
