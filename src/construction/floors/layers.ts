import { vec2 } from 'gl-matrix'

import type { FloorAssemblyConfigBase, FloorLayersConfig } from '@/construction/floors/types'
import { LAYER_CONSTRUCTIONS } from '@/construction/layers'
import type { LayerConfig, MonolithicLayerConfig, StripedLayerConfig } from '@/construction/layers/types'
import { type ConstructionModel, createConstructionGroup, mergeModels } from '@/construction/model'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import type { GroupOrElement } from '@/construction/elements'
import { IDENTITY } from '@/construction/geometry'
import {
  type Length,
  type Polygon2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  mergeBounds,
  simplifyPolygon
} from '@/shared/geometry'

import { TAG_FLOOR_LAYER_CEILING, TAG_FLOOR_LAYER_TOP } from '@/construction/tags'

interface FloorLayerOptions {
  finishedPolygon: Polygon2D
  topHoles: Polygon2D[]
  ceilingHoles: Polygon2D[]
  currentFloorConfig: FloorAssemblyConfigBase
  nextFloorConfig: FloorAssemblyConfigBase | null
  floorTopOffset: Length
  ceilingStartHeight: Length
}

const normalizePolygon = (polygon: Polygon2D, clockwise: boolean): Polygon2D =>
  clockwise ? ensurePolygonIsClockwise(simplifyPolygon(polygon)) : ensurePolygonIsCounterClockwise(simplifyPolygon(polygon))

const clonePolygonWithHoles = (polygon: PolygonWithHoles2D): PolygonWithHoles2D => ({
  outer: {
    points: polygon.outer.points.map(point => vec2.fromValues(point[0], point[1]))
  },
  holes: polygon.holes.map(hole => ({
    points: hole.points.map(point => vec2.fromValues(point[0], point[1]))
  }))
})

const runLayerConstruction = (
  polygon: PolygonWithHoles2D,
  offset: Length,
  config: LayerConfig
): ConstructionResult[] => {
  if (config.type === 'monolithic') {
    const construction = LAYER_CONSTRUCTIONS.monolithic as (typeof LAYER_CONSTRUCTIONS)['monolithic']
    return Array.from(construction.construct(clonePolygonWithHoles(polygon), offset, 'xy', config as MonolithicLayerConfig))
  }

  if (config.type === 'striped') {
    const construction = LAYER_CONSTRUCTIONS.striped as (typeof LAYER_CONSTRUCTIONS)['striped']
    return Array.from(construction.construct(clonePolygonWithHoles(polygon), offset, 'xy', config as StripedLayerConfig))
  }

  return []
}

const createLayerGroup = (
  elements: GroupOrElement[],
  others: ConstructionResult[],
  tag: typeof TAG_FLOOR_LAYER_TOP | typeof TAG_FLOOR_LAYER_CEILING
): ConstructionModel => {
  const group = createConstructionGroup(elements, IDENTITY, [tag])
  const aggregated = aggregateResults(others)
  const mergedElements = [group, ...aggregated.elements]
  const bounds = mergedElements.length > 1
    ? mergeBounds(...mergedElements.map(element => element.bounds))
    : group.bounds

  return {
    elements: mergedElements,
    measurements: aggregated.measurements,
    areas: aggregated.areas,
    warnings: aggregated.warnings,
    errors: aggregated.errors,
    bounds
  }
}

const buildPolygonWithHoles = (outer: Polygon2D, holes: Polygon2D[]): PolygonWithHoles2D => ({
  outer: normalizePolygon(outer, true),
  holes: holes.map(hole => normalizePolygon(hole, false))
})

const constructTopLayers = (
  basePolygon: PolygonWithHoles2D,
  layers: FloorLayersConfig,
  floorTopOffset: Length
): ConstructionModel | null => {
  if (layers.topLayers.length === 0 || layers.topThickness <= 0) {
    return null
  }

  let offset = (floorTopOffset - layers.topThickness) as Length
  let cumulative = 0 as Length
  const elements: GroupOrElement[] = []
  const otherResults: ConstructionResult[] = []

  for (const layer of layers.topLayers) {
    cumulative = (cumulative + layer.thickness) as Length
    const currentOffset = (offset + (cumulative - layer.thickness)) as Length
    const results = runLayerConstruction(basePolygon, currentOffset, layer)
    for (const result of results) {
      if (result.type === 'element') {
        elements.push(result.element as GroupOrElement)
      } else {
        otherResults.push(result)
      }
    }
  }

  if (elements.length === 0) {
    return null
  }

  return createLayerGroup(elements, otherResults, TAG_FLOOR_LAYER_TOP)
}

const constructCeilingLayers = (
  basePolygon: PolygonWithHoles2D,
  layers: FloorLayersConfig,
  ceilingStartHeight: Length
): ConstructionModel | null => {
  if (layers.bottomLayers.length === 0 || layers.bottomThickness <= 0) {
    return null
  }

  let cumulative = 0 as Length
  const elements: GroupOrElement[] = []
  const otherResults: ConstructionResult[] = []

  for (const layer of layers.bottomLayers) {
    cumulative = (cumulative + layer.thickness) as Length
    const offset = (ceilingStartHeight - cumulative) as Length
    const results = runLayerConstruction(basePolygon, offset, layer)
    for (const result of results) {
      if (result.type === 'element') {
        elements.push(result.element as GroupOrElement)
      } else {
        otherResults.push(result)
      }
    }
  }

  if (elements.length === 0) {
    return null
  }

  return createLayerGroup(elements, otherResults, TAG_FLOOR_LAYER_CEILING)
}

export function constructFloorLayers({
  finishedPolygon,
  topHoles,
  ceilingHoles,
  currentFloorConfig,
  nextFloorConfig,
  floorTopOffset,
  ceilingStartHeight
}: FloorLayerOptions): ConstructionModel | null {
  const topPolygon = buildPolygonWithHoles(finishedPolygon, topHoles)
  const topLayersModel = constructTopLayers(topPolygon, currentFloorConfig.layers, floorTopOffset)

  let ceilingModel: ConstructionModel | null = null
  if (nextFloorConfig) {
    const ceilingPolygon = buildPolygonWithHoles(finishedPolygon, ceilingHoles)
    ceilingModel = constructCeilingLayers(ceilingPolygon, nextFloorConfig.layers, ceilingStartHeight)
  }

  const models = [topLayersModel, ceilingModel].filter((model): model is ConstructionModel => model !== null)

  if (models.length === 0) {
    return null
  }

  return mergeModels(...models)
}
