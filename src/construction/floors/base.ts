import type { FloorBaseConstructionConfig } from '@/construction/config/types'
import type { FloorConstructionMethod } from '@/construction/floors/types'
import type { ConstructionModel } from '@/construction/model'
import { type Length, type PolygonWithHoles2D, createLength } from '@/shared/geometry'

export abstract class BaseFloorConstructionMethod<TConfig extends FloorBaseConstructionConfig>
  implements FloorConstructionMethod<TConfig>
{
  abstract construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel
  abstract getTopOffset: (config: TConfig) => Length
  abstract getBottomOffset: (config: TConfig) => Length
  abstract getConstructionThickness: (config: TConfig) => Length

  getTotalThickness = (config: TConfig) =>
    createLength(
      config.layers.topThickness +
        this.getTopOffset(config) +
        this.getConstructionThickness(config) +
        this.getBottomOffset(config) +
        config.layers.bottomThickness
    )
}
