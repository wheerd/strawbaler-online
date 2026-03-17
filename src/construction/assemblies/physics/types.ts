import type { TranslatableString } from '@/shared/i18n/TranslatableString'

export interface PhysicsMaterial {
  density?: number // rho [kg/m³]
  thermalConductivity?: number // lambda [W/mK]
  vaporDiffusionResistance?: number // mu (dimensionless)
  specificHeatCapacity?: number // c [J/kgK]
}

export interface PhysicsItem {
  material: PhysicsMaterial
  thicknessMm: number
  label: TranslatableString
}

export interface PhysicsPath {
  items: PhysicsItem[]
  areaFraction: number
  label: TranslatableString
}

export interface AssemblyPhysicsStructure {
  inside: PhysicsItem[]
  core: PhysicsPath[]
  outside: PhysicsItem[]
}

export interface PhysicsLayerResult {
  label: TranslatableString
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}

export interface PhysicsPathResult {
  label: TranslatableString
  areaFraction: number
  areaPercent: string
  items: PhysicsLayerResult[]
  combined: {
    sdValue: number | null
    rValue: number | null
    massPerArea: number | null
  }
}

export interface AssemblyPhysics {
  totalSdValue: number | null
  totalRValue: number | null
  uValue: number | null
  totalMassPerArea: number | null
  insideSdValue: number | null
  outsideSdValue: number | null
  breakdown: {
    inside: PhysicsLayerResult[]
    core: PhysicsPathResult[]
    outside: PhysicsLayerResult[]
  }
}
