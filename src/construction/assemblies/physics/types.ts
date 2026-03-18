import type { TranslatableString } from '@/shared/i18n/TranslatableString'

export interface PhysicsMaterial {
  density?: number // rho [kg/m³]
  thermalConductivity?: number // lambda [W/mK]
  vaporDiffusionResistance?: number // mu (dimensionless)
  specificHeatCapacity?: number // c [J/kgK]
}

export interface PhysicsSeriesItem {
  material: PhysicsMaterial
  thicknessMm: number
  label: TranslatableString
}

export interface PhysicsSeries {
  items: PhysicsSeriesItem[]
  areaFraction: number
  label: TranslatableString
}

export interface PhysicsParallelItem {
  material: PhysicsMaterial
  label: TranslatableString
  areaFraction: number
}

export type PhysicsExclusionReason = 'ventilated' | 'overlap'

export interface PhysicsParallel {
  items: PhysicsParallelItem[]
  thicknessMm: number
  label: TranslatableString
  isVentilatedAirGap?: boolean
  isOverlap?: boolean
}

export interface AssemblyPhysicsStructure {
  inside: PhysicsParallel[]
  core: PhysicsSeries[]
  outside: PhysicsParallel[]
}

export interface PhysicsSeriesItemResult {
  label: TranslatableString
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}

export interface PhysicsSeriesResult {
  label: TranslatableString
  areaFraction: number
  areaPercent: string
  items: PhysicsSeriesItemResult[]
  combined: {
    sdValue: number | null
    rValue: number | null
    massPerArea: number | null
  }
}

export interface PhysicsParallelItemResult {
  label: TranslatableString
  areaFraction: number
  areaPercent: string
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}

export interface PhysicsParallelResult {
  label: TranslatableString
  thicknessMm: number
  items: PhysicsParallelItemResult[]
  combined: {
    sdValue: number | null
    rValue: number | null
    massPerArea: number | null
  }
  isExcludedFromTotal?: boolean
  exclusionReason?: PhysicsExclusionReason
}

export interface AssemblyPhysics {
  totalSdValue: number | null
  totalRValue: number | null
  uValue: number | null
  totalMassPerArea: number | null
  insideSdValue: number | null
  outsideSdValue: number | null
  outsideHasVentilatedAirGap?: boolean
  breakdown: {
    inside: PhysicsParallelResult[]
    core: PhysicsSeriesResult[]
    outside: PhysicsParallelResult[]
  }
}
