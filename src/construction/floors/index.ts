import type { FloorConstructionType } from '@/construction/config/types'

import { CltConstructionMethod } from './clt'
import { JoistConstructionMethod } from './joists'
import type { FloorConstructionMethod } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLOOR_CONSTRUCTION_METHODS: Record<FloorConstructionType, FloorConstructionMethod<any>> = {
  clt: new CltConstructionMethod(),
  joist: new JoistConstructionMethod()
}

export * from './types'
export * from './clt'
export * from './joists'
