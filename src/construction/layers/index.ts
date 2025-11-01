import { MonolithicLayerConstruction } from '@/construction/layers/monolithic'
import { StripedLayerConstruction } from '@/construction/layers/stripe'

import type { LayerConfig, LayerConstruction, LayerType } from './types'

export const LAYER_CONSTRUCTIONS: {
  [TType in LayerType]: LayerConstruction<Extract<LayerConfig, { type: TType }>>
} = {
  monolithic: new MonolithicLayerConstruction(),
  striped: new StripedLayerConstruction()
}
