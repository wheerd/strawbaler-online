import type { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionResult } from '@/construction/results'
import type { InfillMethod } from '@/construction/walls'
import type { Length } from '@/shared/geometry'

import type { OpeningAssembly, OpeningAssemblyConfigBase } from './types'

export abstract class BaseOpeningAssembly<T extends OpeningAssemblyConfigBase> implements OpeningAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(
    area: WallConstructionArea,
    adjustedHeader: Length,
    adjustedSill: Length,
    infill: InfillMethod
  ): Generator<ConstructionResult>

  abstract get segmentationPadding(): Length
  abstract get needsWallStands(): boolean
}
