import { InfillWallAssembly } from './infill'
import { ModulesWallAssembly } from './modules/all-modules'
import { StrawhengeWallAssembly } from './modules/strawhenge'
import { NonStrawbaleWallAssembly } from './nonStrawbale'
import type { WallAssembly, WallAssemblyType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const WALL_ASSEMBLIES: Record<WallAssemblyType, WallAssembly<any>> = {
  infill: new InfillWallAssembly(),
  strawhenge: new StrawhengeWallAssembly(),
  modules: new ModulesWallAssembly(),
  'non-strawbale': new NonStrawbaleWallAssembly()
}

export * from './types'
export * from './construction'
export * from './segmentation'
export * from './corners/corners'
export * from './infill/infill'
export * from './modules/strawhenge'
export * from './nonStrawbale'
export * from './layers'
