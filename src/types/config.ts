import type { RingBeamConstructionMethodId, PerimeterConstructionMethodId } from './ids'
import type { RingBeamConfig } from '@/construction/ringBeams'
import type { BaseConstructionConfig, InfillConstructionConfig, StrawhengeConstructionConfig } from '@/construction'

export interface RingBeamConstructionMethod {
  id: RingBeamConstructionMethodId
  name: string
  config: RingBeamConfig
}

// Placeholder config interface for non-strawbale construction
export interface NonStrawbaleConfig extends BaseConstructionConfig {
  type: 'non-strawbale'
  material: string
  thickness: number
}

export type PerimeterConstructionConfig = InfillConstructionConfig | StrawhengeConstructionConfig | NonStrawbaleConfig

export interface PerimeterConstructionMethod {
  id: PerimeterConstructionMethodId
  name: string
  config: PerimeterConstructionConfig
}
