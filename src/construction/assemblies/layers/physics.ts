import type { PhysicsParallel, PhysicsParallelResult } from '@/construction/assemblies/physics'
import { computeSeriesOfParallelValues } from '@/construction/assemblies/physics/computation'
import { layerToPhysicsParallel } from '@/construction/assemblies/physics/helpers'

import type { LayerConfig } from './types'

export interface LayerSetPhysics {
  totalSdValue: number | null
  totalRValue: number | null
  uValue: number | null
  totalMassPerArea: number | null
  hasVentilatedAirGap: boolean
  breakdown: PhysicsParallelResult[]
}

export function computeLayerSetPhysics(layers: LayerConfig[]): LayerSetPhysics | null {
  if (layers.length === 0) return null

  const parallelLayers = layers.map(layerToPhysicsParallel).filter((p): p is PhysicsParallel => p !== null)

  if (parallelLayers.length === 0) return null

  const result = computeSeriesOfParallelValues(parallelLayers)

  const uValue = result.values.rValue !== null && result.values.rValue > 0 ? 1 / result.values.rValue : null

  return {
    totalSdValue: result.values.sdValue,
    totalRValue: result.values.rValue,
    uValue,
    totalMassPerArea: result.values.massPerArea,
    hasVentilatedAirGap: result.hasVentilatedAirGap,
    breakdown: result.layerResults
  }
}
