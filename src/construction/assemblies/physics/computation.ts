import type {
  AssemblyPhysics,
  AssemblyPhysicsStructure,
  PhysicsItem,
  PhysicsLayerResult,
  PhysicsPath,
  PhysicsPathResult
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

export function computeItemPhysics(item: PhysicsItem): PhysicsLayerResult {
  return {
    label: item.label,
    thicknessMm: item.thicknessMm,
    sdValue: computeSdValue(item.thicknessMm, item.material.vaporDiffusionResistance),
    rValue: computeRValue(item.thicknessMm, item.material.thermalConductivity),
    massPerArea: computeMassPerArea(item.thicknessMm, item.material.density)
  }
}

function computeSeriesValues(items: PhysicsItem[]): PhysicsValues {
  let sdValue = 0
  let rValue = 0
  let massPerArea = 0
  let hasSd = true
  let hasR = true
  let hasMass = true

  for (const item of items) {
    const result = computeItemPhysics(item)
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

function computeParallelValues(paths: PhysicsPath[]): PhysicsValues {
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

function computePathResult(path: PhysicsPath): PhysicsPathResult {
  const items = path.items.map(item => computeItemPhysics(item))
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
  const insideLayers = structure.inside.map(item => computeItemPhysics(item))
  const outsideLayers = structure.outside.map(item => computeItemPhysics(item))
  const corePaths = structure.core.map(path => computePathResult(path))

  const insideValues = computeSeriesValues(structure.inside)
  const outsideValues = computeSeriesValues(structure.outside)
  const coreValues = computeParallelValues(structure.core)

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
