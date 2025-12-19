import type { PerimeterConstructionContext } from '@/construction/context'
import { type ConstructionResult, yieldError } from '@/construction/results'

import type { BrickRingBeamConfig, RingBeamAssembly, RingBeamSegment } from './types'

export class BrickRingBeamAssembly implements RingBeamAssembly {
  private config: BrickRingBeamConfig

  constructor(config: BrickRingBeamConfig) {
    this.config = config
  }

  get height() {
    return this.config.wallHeight + this.config.beamThickness + this.config.waterproofingThickness
  }

  *construct(_segment: RingBeamSegment, _context: PerimeterConstructionContext): Generator<ConstructionResult> {
    yield yieldError('Brick ring beam construction is not yet supported.', [], 'unsupported-ring-beam-brick')
  }
}
