import { vec2, vec3 } from 'gl-matrix'

import type { Opening, Perimeter, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, transformModel } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { type Bounds3D, type Length, type Polygon2D, type PolygonWithHoles2D, mergeBounds } from '@/shared/geometry'

import { calculateWallCornerInfo, getWallContext } from './corners/corners'
import type { WallStoreyContext } from './segmentation'
import type { WallLayersConfig } from './types'

interface LayerSideContext {
  polygon: PolygonWithHoles2D
}

type LayerSide = 'inside' | 'outside'

const ZERO_BOUNDS = {
  min: vec3.fromValues(0, 0, 0),
  max: vec3.fromValues(0, 0, 0)
} satisfies Bounds3D

const clonePolygon = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
  outer: {
    points: polygon.outer.points.map(point => vec2.fromValues(point[0], point[1]))
  },
  holes: polygon.holes.map(hole => ({
    points: hole.points.map(point => vec2.fromValues(point[0], point[1]))
  }))
})

const rectangle = (start: Length, end: Length, bottom: Length, top: Length): Polygon2D => ({
  points: [
    vec2.fromValues(start, bottom),
    vec2.fromValues(start, top),
    vec2.fromValues(end, top),
    vec2.fromValues(end, bottom)
  ]
})

const clampInterval = (start: Length, end: Length, min: Length, max: Length): [Length, Length] | null => {
  const clampedStart = Math.max(start, min)
  const clampedEnd = Math.min(end, max)

  if (clampedEnd <= clampedStart) {
    return null
  }

  return [clampedStart, clampedEnd]
}

const createLayerPolygon = (
  wall: PerimeterWall,
  side: LayerSide,
  context: ReturnType<typeof getWallContext>,
  cornerInfo: ReturnType<typeof calculateWallCornerInfo>,
  bottom: Length,
  top: Length
): LayerSideContext => {
  const { getWallAssemblyById } = getConfigActions()

  const previousAssembly = getWallAssemblyById(context.previousWall.wallAssemblyId)
  const nextAssembly = getWallAssemblyById(context.nextWall.wallAssemblyId)

  if (!previousAssembly || !nextAssembly) {
    throw new Error('Unable to resolve neighbouring wall assemblies for layer construction')
  }

  const startDistance =
    side === 'inside'
      ? vec2.distance(wall.insideLine.start, context.startCorner.insidePoint)
      : vec2.distance(wall.outsideLine.start, context.startCorner.outsidePoint)

  const endDistance =
    side === 'inside'
      ? vec2.distance(wall.insideLine.end, context.endCorner.insidePoint)
      : vec2.distance(wall.outsideLine.end, context.endCorner.outsidePoint)

  const previousThickness =
    side === 'inside' ? previousAssembly.layers.insideThickness : previousAssembly.layers.outsideThickness
  const nextThickness = side === 'inside' ? nextAssembly.layers.insideThickness : nextAssembly.layers.outsideThickness

  const startDelta = startDistance - previousThickness
  const endDelta = endDistance - nextThickness

  const constructsStart = cornerInfo.startCorner.constructedByThisWall
  const constructsEnd = cornerInfo.endCorner.constructedByThisWall

  const startOffset = constructsStart ? Math.max(startDelta, 0) : Math.min(startDelta, 0)
  const endOffset = constructsEnd ? Math.max(endDelta, 0) : Math.min(endDelta, 0)

  const baseLength = side === 'inside' ? wall.insideLength : wall.outsideLength
  const startPosition = -startOffset
  const endPosition = baseLength + endOffset

  const holes = wall.openings
    .map(opening => {
      const openingStart = opening.offsetFromStart
      const openingEnd = openingStart + opening.width
      const horizontal = clampInterval(openingStart, openingEnd, startPosition, endPosition)
      if (!horizontal) return null

      const sill = opening.sillHeight ?? 0
      const openingBottom = bottom + sill
      const openingTop = openingBottom + opening.height
      const vertical = clampInterval(openingBottom, openingTop, bottom, top)
      if (!vertical) return null

      return rectangle(horizontal[0], horizontal[1], vertical[0], vertical[1])
    })
    .filter((polygon): polygon is Polygon2D => polygon !== null)

  return {
    polygon: {
      outer: rectangle(startPosition, endPosition, bottom, top),
      holes
    }
  }
}

const runLayerConstruction = (
  polygon: PolygonWithHoles2D,
  offset: Length,
  layer: LayerConfig
): ConstructionResult[] => {
  const construction = LAYER_CONSTRUCTIONS[layer.type]

  if (!construction) {
    throw new Error(`Unsupported layer type: ${layer.type}`)
  }

  return Array.from(construction.construct(clonePolygon(polygon), offset, layer))
}

const aggregateLayerResults = (results: ConstructionResult[]): ConstructionModel => {
  const aggregated = aggregateResults(results)

  if (aggregated.elements.length === 0) {
    return {
      elements: [],
      measurements: aggregated.measurements,
      areas: aggregated.areas,
      errors: aggregated.errors,
      warnings: aggregated.warnings,
      bounds: ZERO_BOUNDS
    }
  }

  return {
    elements: aggregated.elements,
    measurements: aggregated.measurements,
    areas: aggregated.areas,
    errors: aggregated.errors,
    warnings: aggregated.warnings,
    bounds: mergeBounds(...aggregated.elements.map(element => element.bounds))
  }
}

export function constructWallLayers(
  wall: PerimeterWall,
  perimeter: Perimeter,
  storeyContext: WallStoreyContext,
  layers: WallLayersConfig
): ConstructionModel {
  const { getRingBeamAssemblyById } = getConfigActions()

  const context = getWallContext(wall, perimeter)
  const cornerInfo = calculateWallCornerInfo(wall, context)

  const basePlateAssembly = perimeter.baseRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.baseRingBeamAssemblyId)
    : null
  const topPlateAssembly = perimeter.topRingBeamAssemblyId
    ? getRingBeamAssemblyById(perimeter.topRingBeamAssemblyId)
    : null

  const basePlateHeight = basePlateAssembly?.height ?? 0
  const topPlateHeight = topPlateAssembly?.height ?? 0

  const totalConstructionHeight =
    storeyContext.storeyHeight + storeyContext.floorTopOffset + storeyContext.ceilingBottomOffset

  const bottom = basePlateHeight
  const top = totalConstructionHeight - topPlateHeight

  const insideContext = createLayerPolygon(wall, 'inside', context, cornerInfo, bottom, top)
  const outsideContext = createLayerPolygon(wall, 'outside', context, cornerInfo, bottom, top)

  const layerResults: ConstructionResult[] = []

  let insideAccumulated = 0
  if (layers.insideLayers.length > 0) {
    for (const layer of layers.insideLayers) {
      const start = insideAccumulated
      insideAccumulated += layer.thickness
      const offset = -(start + layer.thickness)
      layerResults.push(...runLayerConstruction(insideContext.polygon, offset, layer))
    }
  }

  if (layers.outsideLayers.length > 0) {
    let outsideAccumulated = 0
    for (const layer of layers.outsideLayers) {
      const start = wall.thickness - outsideAccumulated - layer.thickness
      const end = wall.thickness - outsideAccumulated
      outsideAccumulated += layer.thickness
      const offset = -end
      layerResults.push(...runLayerConstruction(outsideContext.polygon, offset, layer))
    }
  }

  const rawModel = aggregateLayerResults(layerResults)
  if (rawModel.elements.length === 0) {
    return rawModel
  }

  return transformModel(rawModel, {
    position: vec3.fromValues(0, 0, 0),
    rotation: vec3.fromValues(Math.PI / 2, 0, 0)
  })
}
