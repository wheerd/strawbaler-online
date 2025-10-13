import type { SlabConstructionType } from '@/construction/config/types'

import { CltConstructionMethod } from './clt'
import { JoistConstructionMethod } from './joists'
import type { SlabConstructionMethod } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SLAB_CONSTRUCTION_METHODS: Record<SlabConstructionType, SlabConstructionMethod<any>> = {
  clt: new CltConstructionMethod(),
  joist: new JoistConstructionMethod()
}

export * from './types'
export * from './clt'
export * from './joists'
