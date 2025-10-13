import type { JoistFloorConstructionConfig } from '@/construction/config/types'
import { type PolygonWithHoles2D, createLength } from '@/shared/geometry'

import { BaseFloorConstructionMethod } from './base'

export class JoistConstructionMethod extends BaseFloorConstructionMethod<JoistFloorConstructionConfig> {
  construct = (_polygon: PolygonWithHoles2D, _config: JoistFloorConstructionConfig) => {
    throw new Error('TODO: Implement')
  }

  getTopOffset = (config: JoistFloorConstructionConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorConstructionConfig) => createLength(0)
  getConstructionThickness = (config: JoistFloorConstructionConfig) => config.joistHeight
}
