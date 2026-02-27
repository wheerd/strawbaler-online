import type { PerimeterWallWithGeometry } from '@/building/model'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model'
import type { Tag } from '@/construction/tags'
import type { ThicknessRange } from '@/materials/thickness'

import type { WallAssembly, WallBaseConfig } from './types'

export abstract class BaseWallAssembly<T extends WallBaseConfig> implements WallAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel

  abstract get tag(): Tag

  abstract get thicknessRange(): ThicknessRange
}
