import type {
  AssemblyPhysics,
  AssemblyPhysicsStructure,
  PhysicsParallel,
  PhysicsParallelItem,
  PhysicsParallelItemResult,
  PhysicsParallelResult,
  PhysicsSeries,
  PhysicsSeriesItem,
  PhysicsSeriesItemResult,
  PhysicsSeriesResult
} from './types'

const MM_TO_M = 0.001

function computeSdValue(thicknessMm: number, mu: number | undefined): number | null {
  if (mu === undefined || mu <= 0) return null
  const thicknessM = thicknessMm * MM_TO_M
  return thicknessM * mu
}

function computeRValue(thicknessMm: number, lambda: number | undefined): number | null {
  if (lambda === undefined || lambda <= 0) return null
  const thicknessM = thicknessMm * MM_TO_M
  return thicknessM / lambda
}

function computeMassPerArea(thicknessMm: number, density: number | undefined): number | null {
  if (density === undefined || density <= 0) return null
  const thicknessM = thicknessMm * MM_TO_M
  return thicknessM * density
}

interface PhysicsValues {
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}

function computeSeriesItemPhysics(item: PhysicsSeriesItem): PhysicsSeriesItemResult {
  return {
    label: item.label,
    thicknessMm: item.thicknessMm,
    sdValue: computeSdValue(item.thicknessMm, item.material.vaporDiffusionResistance),
    rValue: computeRValue(item.thicknessMm, item.material.thermalConductivity),
    massPerArea: computeMassPerArea(item.thicknessMm, item.material.density)
  }
}

function computeParallelItemPhysics(item: PhysicsParallelItem, thicknessMm: number): PhysicsParallelItemResult {
  const areaPercent = `${Math.round(item.areaFraction * 100)}%`
  return {
    label: item.label,
    areaFraction: item.areaFraction,
    areaPercent,
    sdValue: computeSdValue(thicknessMm, item.material.vaporDiffusionResistance),
    rValue: computeRValue(thicknessMm, item.material.thermalConductivity),
    massPerArea: computeMassPerArea(thicknessMm, item.material.density)
  }
}

function computeSeriesValues(items: PhysicsSeriesItem[]): PhysicsValues {
  let sdValue = 0
  let rValue = 0
  let massPerArea = 0
  let hasSd = true
  let hasR = true
  let hasMass = true

  for (const item of items) {
    const result = computeSeriesItemPhysics(item)
    if (result.sdValue === null) hasSd = false
    else sdValue += result.sdValue
    if (result.rValue === null) hasR = false
    else rValue += result.rValue
    if (result.massPerArea === null) hasMass = false
    else massPerArea += result.massPerArea
  }

  return {
    sdValue: hasSd ? sdValue : null,
    rValue: hasR ? rValue : null,
    massPerArea: hasMass ? massPerArea : null
  }
}

function computeParallelValues(layer: PhysicsParallel): PhysicsValues {
  if (layer.items.length === 0) {
    return { sdValue: 0, rValue: 0, massPerArea: 0 }
  }

  let invRSum = 0
  let sdSum = 0
  let massSum = 0
  let hasR = true
  let hasSd = true
  let hasMass = true

  for (const item of layer.items) {
    const fraction = item.areaFraction
    const rValue = computeRValue(layer.thicknessMm, item.material.thermalConductivity)
    const sdValue = computeSdValue(layer.thicknessMm, item.material.vaporDiffusionResistance)
    const massValue = computeMassPerArea(layer.thicknessMm, item.material.density)

    if (rValue === null || rValue <= 0) {
      hasR = false
    } else {
      invRSum += fraction / rValue
    }

    if (sdValue === null) {
      hasSd = false
    } else {
      sdSum += sdValue * fraction
    }

    if (massValue === null) {
      hasMass = false
    } else {
      massSum += massValue * fraction
    }
  }

  return {
    sdValue: hasSd ? sdSum : null,
    rValue: hasR ? 1 / invRSum : null,
    massPerArea: hasMass ? massSum : null
  }
}

function computeParallelValuesForSeries(paths: PhysicsSeries[]): PhysicsValues {
  if (paths.length === 0) {
    return { sdValue: 0, rValue: 0, massPerArea: 0 }
  }

  let invRSum = 0
  let sdSum = 0
  let massSum = 0
  let hasR = true
  let hasSd = true
  let hasMass = true

  for (const path of paths) {
    const pathValues = computeSeriesValues(path.items)
    const fraction = path.areaFraction

    if (pathValues.rValue === null || pathValues.rValue <= 0) {
      hasR = false
    } else {
      invRSum += fraction / pathValues.rValue
    }

    if (pathValues.sdValue === null) {
      hasSd = false
    } else {
      sdSum += pathValues.sdValue * fraction
    }

    if (pathValues.massPerArea === null) {
      hasMass = false
    } else {
      massSum += pathValues.massPerArea * fraction
    }
  }

  return {
    sdValue: hasSd ? sdSum : null,
    rValue: hasR ? 1 / invRSum : null,
    massPerArea: hasMass ? massSum : null
  }
}

interface SeriesOfParallelResult {
  values: PhysicsValues
  layerResults: PhysicsParallelResult[]
  hasVentilatedAirGap: boolean
}

function computeSeriesOfParallelValues(layers: PhysicsParallel[]): SeriesOfParallelResult {
  if (layers.length === 0) {
    return {
      values: { sdValue: 0, rValue: 0, massPerArea: 0 },
      layerResults: [],
      hasVentilatedAirGap: false
    }
  }

  let sdValue = 0
  let rValue = 0
  let massPerArea = 0
  let hasSd = true
  let hasR = true
  let hasMass = true
  let foundVentilatedAirGap = false

  const layerResults: PhysicsParallelResult[] = []

  for (const layer of layers) {
    if (layer.isVentilatedAirGap) {
      foundVentilatedAirGap = true
    }

    const layerValues = computeParallelValues(layer)
    const layerResult: PhysicsParallelResult = {
      label: layer.label,
      thicknessMm: layer.thicknessMm,
      items: layer.items.map(item => computeParallelItemPhysics(item, layer.thicknessMm)),
      combined: layerValues,
      isExcludedFromTotal: foundVentilatedAirGap
    }
    layerResults.push(layerResult)

    if (layerValues.massPerArea === null) hasMass = false
    else massPerArea += layerValues.massPerArea

    if (foundVentilatedAirGap) {
      continue
    }

    if (layerValues.sdValue === null) hasSd = false
    else sdValue += layerValues.sdValue
    if (layerValues.rValue === null) hasR = false
    else rValue += layerValues.rValue
  }

  return {
    values: {
      sdValue: hasSd ? sdValue : null,
      rValue: hasR ? rValue : null,
      massPerArea: hasMass ? massPerArea : null
    },
    layerResults,
    hasVentilatedAirGap: foundVentilatedAirGap
  }
}

function computeSeriesResult(path: PhysicsSeries): PhysicsSeriesResult {
  const items = path.items.map(item => computeSeriesItemPhysics(item))
  const combined = computeSeriesValues(path.items)
  const areaPercent = `${Math.round(path.areaFraction * 100)}%`

  return {
    label: path.label,
    areaFraction: path.areaFraction,
    areaPercent,
    items,
    combined
  }
}

export function computeAssemblyPhysics(structure: AssemblyPhysicsStructure): AssemblyPhysics {
  const insideResult = computeSeriesOfParallelValues(structure.inside)
  const outsideResult = computeSeriesOfParallelValues(structure.outside)
  const corePaths = structure.core.map(path => computeSeriesResult(path))
  const coreValues = computeParallelValuesForSeries(structure.core)

  const totalRValue =
    insideResult.values.rValue !== null && coreValues.rValue !== null && outsideResult.values.rValue !== null
      ? insideResult.values.rValue + coreValues.rValue + outsideResult.values.rValue
      : null

  const totalSdValue =
    insideResult.values.sdValue !== null && coreValues.sdValue !== null && outsideResult.values.sdValue !== null
      ? insideResult.values.sdValue + coreValues.sdValue + outsideResult.values.sdValue
      : null

  const totalMassPerArea =
    insideResult.values.massPerArea !== null &&
    coreValues.massPerArea !== null &&
    outsideResult.values.massPerArea !== null
      ? insideResult.values.massPerArea + coreValues.massPerArea + outsideResult.values.massPerArea
      : null

  const uValue = totalRValue !== null && totalRValue > 0 ? 1 / totalRValue : null

  return {
    totalSdValue,
    totalRValue,
    uValue,
    totalMassPerArea,
    insideSdValue: insideResult.values.sdValue,
    outsideSdValue: outsideResult.values.sdValue,
    outsideHasVentilatedAirGap: outsideResult.hasVentilatedAirGap,
    breakdown: {
      inside: insideResult.layerResults,
      core: corePaths,
      outside: outsideResult.layerResults
    }
  }
}
