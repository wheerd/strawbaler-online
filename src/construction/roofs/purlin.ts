import type { vec2 } from 'gl-matrix'

import type { Roof } from '@/building/model'
import { createUnsupportedModel } from '@/construction/model'
import { type Length, type LineSegment2D } from '@/shared/geometry'

import type { PurlinRoofConfig, RoofAssembly } from './types'

export class PurlinRoofAssembly implements RoofAssembly<PurlinRoofConfig> {
  construct = (_roof: Roof, _config: PurlinRoofConfig) => {
    return createUnsupportedModel('Not yet supported.', 'unsupported-roof-purlin')
  }

  getTopOffset = (_config: PurlinRoofConfig): Length => {
    throw new Error('Not implemented')
  }

  getBottomOffsets = (_config: PurlinRoofConfig, _Line: LineSegment2D): vec2[] => {
    throw new Error('Not implemented')
  }

  getConstructionThickness = (_config: PurlinRoofConfig): Length => {
    throw new Error('Not implemented')
  }
}
