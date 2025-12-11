import type { ConstructionModel } from '@/construction/model'
import { Bounds2D } from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FilledFloorConfig, FloorConstructionContext } from './types'

export class FilledFloorAssembly extends BaseFloorAssembly<FilledFloorConfig> {
  construct = (context: FloorConstructionContext, config: FilledFloorConfig): ConstructionModel => {
    // Stub implementation - returns empty model
    // TODO: Implement filled floor construction logic
    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, config.constructionHeight)
    return {
      elements: [],
      areas: [],
      warnings: [],
      errors: [],
      measurements: [],
      bounds
    }
  }

  getTopOffset = (config: FilledFloorConfig) => config.subfloorThickness
  getBottomOffset = (config: FilledFloorConfig) => config.bottomCladdingThickness
  getConstructionThickness = (config: FilledFloorConfig) => config.constructionHeight
}
