import type { SlabBaseConstructionConfig } from '@/construction/config/types'
import type { ConstructionModel } from '@/construction/model'
import type { SlabConstructionMethod } from '@/construction/slabs/types'
import { type Length, type PolygonWithHoles2D } from '@/shared/geometry'

export abstract class BaseSlabConstructionMethod<TConfig extends SlabBaseConstructionConfig>
  implements SlabConstructionMethod<TConfig>
{
  abstract construct: (polygon: PolygonWithHoles2D, config: TConfig) => ConstructionModel
  abstract getTopOffset: (config: TConfig) => Length
  abstract getBottomOffset: (config: TConfig) => Length
  abstract getConstructionThickness: (config: TConfig) => Length

  getTotalThickness = (config: TConfig) =>
    config.layers.topThickness +
    this.getTopOffset(config) +
    this.getConstructionThickness(config) +
    this.getBottomOffset(config) +
    config.layers.bottomThickness
}
