import type { Resources, SelectorFn, SelectorOptions } from 'i18next'

import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  WallAssemblyId
} from '@/building/model'
import type {
  FilledFloorConfig,
  HangingJoistFloorConfig,
  JoistFloorConfig,
  MonolithicFloorConfig
} from '@/construction/assemblies/floors/types'
import type {
  EmptyOpeningConfig,
  PlankedOpeningConfig,
  PostOpeningConfig,
  SimpleOpeningConfig,
  ThresholdAssemblyConfig
} from '@/construction/assemblies/openings/types'
import type {
  BrickRingBeamConfig,
  DoubleRingBeamConfig,
  FullRingBeamConfig
} from '@/construction/assemblies/ringBeams/types'
import type { MonolithicRoofConfig, PurlinRoofConfig } from '@/construction/assemblies/roofs/types'
import type {
  InfillWallConfig,
  ModulesWallConfig,
  NonStrawbaleWallConfig,
  PrefabModulesWallConfig,
  StrawhengeWallConfig
} from '@/construction/assemblies/walls/types'

export type AssemblyNameKey = SelectorFn<Resources['config'], string, SelectorOptions<'config'>>

export interface NamedAssembly {
  name: string
  /** Optional translation key for default assemblies. If present, use t(nameKey) instead of name for display. Clear when user edits the name. */
  nameKey?: AssemblyNameKey
}

// Walls

export interface WallAssemblyIdPart extends NamedAssembly {
  id: WallAssemblyId
}

export type InfillWallAssemblyConfig = InfillWallConfig & WallAssemblyIdPart
export type ModulesWallAssemblyConfig = ModulesWallConfig & WallAssemblyIdPart
export type StrawhengeWallAssemblyConfig = StrawhengeWallConfig & WallAssemblyIdPart
export type NonStrawbaleWallAssemblyConfig = NonStrawbaleWallConfig & WallAssemblyIdPart
export type PrefabModulesWallAssemblyConfig = PrefabModulesWallConfig & WallAssemblyIdPart

export type WallAssemblyConfig =
  | InfillWallAssemblyConfig
  | ModulesWallAssemblyConfig
  | StrawhengeWallAssemblyConfig
  | NonStrawbaleWallAssemblyConfig
  | PrefabModulesWallAssemblyConfig

// Ring beams

export interface RingBeamAssemblyIdPart extends NamedAssembly {
  id: RingBeamAssemblyId
}

export type FullRingBeamAssemblyConfig = FullRingBeamConfig & RingBeamAssemblyIdPart
export type DoubleRingBeamAssemblyConfig = DoubleRingBeamConfig & RingBeamAssemblyIdPart
export type BrickRingBeamAssemblyConfig = BrickRingBeamConfig & RingBeamAssemblyIdPart

export type RingBeamAssemblyConfig =
  | FullRingBeamAssemblyConfig
  | DoubleRingBeamAssemblyConfig
  | BrickRingBeamAssemblyConfig

// Floors

export interface FloorAssemblyIdPart extends NamedAssembly {
  id: FloorAssemblyId
}

export type MonolithicFloorAssemblyConfig = MonolithicFloorConfig & FloorAssemblyIdPart
export type JoistFloorAssemblyConfig = JoistFloorConfig & FloorAssemblyIdPart
export type FilledFloorAssemblyConfig = FilledFloorConfig & FloorAssemblyIdPart
export type HangingJoistFloorAssemblyConfig = HangingJoistFloorConfig & FloorAssemblyIdPart

export type FloorAssemblyConfig =
  | MonolithicFloorAssemblyConfig
  | JoistFloorAssemblyConfig
  | FilledFloorAssemblyConfig
  | HangingJoistFloorAssemblyConfig

// Roofs

export interface RoofAssemblyIdPart extends NamedAssembly {
  id: RoofAssemblyId
}

export type MonolithicRoofAssemblyConfig = MonolithicRoofConfig & RoofAssemblyIdPart
export type PurlinRoofAssemblyConfig = PurlinRoofConfig & RoofAssemblyIdPart

export type RoofAssemblyConfig = MonolithicRoofAssemblyConfig | PurlinRoofAssemblyConfig

// Openings

export interface OpeningAssemblyIdPart extends NamedAssembly {
  id: OpeningAssemblyId
}

export type SimpleOpeningAssemblyConfig = SimpleOpeningConfig & OpeningAssemblyIdPart
export type EmptyOpeningAssemblyConfig = EmptyOpeningConfig & OpeningAssemblyIdPart
export type PostOpeningAssemblyConfig = PostOpeningConfig & OpeningAssemblyIdPart
export type PlankedOpeningAssemblyConfig = PlankedOpeningConfig & OpeningAssemblyIdPart
export type ThresholdOpeningAssemblyConfig = ThresholdAssemblyConfig & OpeningAssemblyIdPart

export type OpeningAssemblyConfig =
  | SimpleOpeningAssemblyConfig
  | EmptyOpeningAssemblyConfig
  | PostOpeningAssemblyConfig
  | PlankedOpeningAssemblyConfig
  | ThresholdOpeningAssemblyConfig
