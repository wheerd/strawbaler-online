import type { ConstructionType, PerimeterWallConstructionMethod } from './base'
import { constructInfillWall } from './infill'
import { constructStrawhengeWall } from './strawhenge'
import type { NonStrawbaleConfig } from '@/types/config'
import { createLength } from '@/types/geometry'

export * from './base'
export * from './corners'
export * from './infill'
export * from './material'
export * from './openings'
export * from './posts'
export * from './ringBeams'
export * from './straw'
export * from './strawhenge'

// Placeholder construction method for non-strawbale walls
const constructNonStrawbaleWall: PerimeterWallConstructionMethod<NonStrawbaleConfig> = (
  wall,
  _perimeter,
  floorHeight
) => {
  return {
    wallId: wall.id,
    constructionType: 'non-strawbale',
    wallDimensions: {
      length: wall.wallLength,
      boundaryLength: wall.wallLength,
      thickness: createLength(200), // 200mm default
      height: floorHeight
    },
    segments: [],
    measurements: [],
    cornerInfo: {
      startCorner: null,
      endCorner: null
    },
    errors: [],
    warnings: []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PERIMETER_WALL_CONSTRUCTION_METHODS: Record<ConstructionType, PerimeterWallConstructionMethod<any>> = {
  infill: constructInfillWall,
  strawhenge: constructStrawhengeWall,
  'non-strawbale': constructNonStrawbaleWall
}
