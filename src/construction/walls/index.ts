import type { NonStrawbaleConfig } from '@/construction/config/types'

import type { ConstructionType, PerimeterWallConstructionMethod } from './construction'
import { constructInfillWall } from './infill/infill'
import { constructStrawhengeWall } from './strawhenge/strawhenge'

export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './strawhenge/strawhenge'

// Placeholder construction method for non-strawbale walls
const constructNonStrawbaleWall: PerimeterWallConstructionMethod<NonStrawbaleConfig> = (
  _wall,
  _perimeter,
  _floorHeight
) => {
  throw new Error('Not implemented yet')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PERIMETER_WALL_CONSTRUCTION_METHODS: Record<ConstructionType, PerimeterWallConstructionMethod<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall,
  'non-strawbale': constructNonStrawbaleWall
}
