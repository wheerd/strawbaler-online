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

function computeSeriesOfParallelValues(layers: PhysicsParallel[]): PhysicsValues {
  if (layers.length === 0) {
    return { sdValue: 0, rValue: 0, massPerArea: 0 }
  }

  let sdValue = 0
  let rValue = 0
  let massPerArea = 0
  let hasSd = true
  let hasR = true
  let hasMass = true

  for (const layer of layers) {
    const layerValues = computeParallelValues(layer)
    if (layerValues.sdValue === null) hasSd = false
    else sdValue += layerValues.sdValue
    if (layerValues.rValue === null) hasR = false
    else rValue += layerValues.rValue
    if (layerValues.massPerArea === null) hasMass = false
    else massPerArea += layerValues.massPerArea
  }

  return {
    sdValue: hasSd ? sdValue : null,
    rValue: hasR ? rValue : null,
    massPerArea: hasMass ? massPerArea : null
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

function computeParallelResult(layer: PhysicsParallel): PhysicsParallelResult {
  const items = layer.items.map(item => computeParallelItemPhysics(item, layer.thicknessMm))
  const combined = computeParallelValues(layer)

  return {
    label: layer.label,
    thicknessMm: layer.thicknessMm,
    items,
    combined
  }
}

export function computeAssemblyPhysics(structure: AssemblyPhysicsStructure): AssemblyPhysics {
  const insideLayers = structure.inside.map(layer => computeParallelResult(layer))
  const outsideLayers = structure.outside.map(layer => computeParallelResult(layer))
  const corePaths = structure.core.map(path => computeSeriesResult(path))

  const insideValues = computeSeriesOfParallelValues(structure.inside)
  const outsideValues = computeSeriesOfParallelValues(structure.outside)
  const coreValues = computeParallelValuesForSeries(structure.core)

  const totalRValue =
    insideValues.rValue !== null && coreValues.rValue !== null && outsideValues.rValue !== null
      ? insideValues.rValue + coreValues.rValue + outsideValues.rValue
      : null

  const totalSdValue =
    insideValues.sdValue !== null && coreValues.sdValue !== null && outsideValues.sdValue !== null
      ? insideValues.sdValue + coreValues.sdValue + outsideValues.sdValue
      : null

  const totalMassPerArea =
    insideValues.massPerArea !== null && coreValues.massPerArea !== null && outsideValues.massPerArea !== null
      ? insideValues.massPerArea + coreValues.massPerArea + outsideValues.massPerArea
      : null

  const uValue = totalRValue !== null && totalRValue > 0 ? 1 / totalRValue : null

  return {
    totalSdValue,
    totalRValue,
    uValue,
    totalMassPerArea,
    insideSdValue: insideValues.sdValue,
    outsideSdValue: outsideValues.sdValue,
    breakdown: {
      inside: insideLayers,
      core: corePaths,
      outside: outsideLayers
    }
  }
}
