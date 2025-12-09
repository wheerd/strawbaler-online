import type { Perimeter, PerimeterWall } from '@/building/model/model'
import { getConfigActions } from '@/construction/config'
import { WallConstructionArea } from '@/construction/geometry'
import type { ConstructionModel } from '@/construction/model'
import { mergeModels } from '@/construction/model'
import { constructOpeningFrame } from '@/construction/openings/openings'
import { resolveOpeningConfig } from '@/construction/openings/resolver'
import type { ConstructionResult } from '@/construction/results'
import { aggregateResults } from '@/construction/results'
import type { ModulesWallConfig, WallAssembly } from '@/construction/walls'
import { infillWallArea } from '@/construction/walls/infill/infill'
import { constructWallLayers } from '@/construction/walls/layers'
import { type WallStoreyContext, segmentedWallConstruction } from '@/construction/walls/segmentation'
import { Bounds3D } from '@/shared/geometry'

import { constructModule } from './modules'

export function* moduleWallArea(
  area: WallConstructionArea,
  config: ModulesWallConfig,
  startsWithStand = false,
  endsWithStand = false,
  startAtEnd = false
): Generator<ConstructionResult> {
  const { module, infill } = config

  let remainingArea = area
  while (remainingArea.size[0] >= module.width) {
    const [a, b] = remainingArea.splitInX(startAtEnd ? remainingArea.size[0] - module.width : module.width)
    remainingArea = startAtEnd ? a : b
    const moduleArea = startAtEnd ? b : a
    yield* constructModule(moduleArea, module)
  }
  if (remainingArea.size[0] > 0) {
    yield* infillWallArea(remainingArea, infill, startsWithStand, endsWithStand, startAtEnd)
  }
}

export class ModulesWallAssembly implements WallAssembly<ModulesWallConfig> {
  construct(
    wall: PerimeterWall,
    perimeter: Perimeter,
    storeyContext: WallStoreyContext,
    config: ModulesWallConfig
  ): ConstructionModel {
    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        perimeter,
        storeyContext,
        config.layers,
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          moduleWallArea(area, config, startsWithStand, endsWithStand, startAtEnd),
        (area, zOffset, openings) => {
          const wallAssembly = getConfigActions().getWallAssemblyById(wall.wallAssemblyId)
          if (!wallAssembly) throw new Error(`Wall assembly ${wall.wallAssemblyId} not found`)
          const openingConfig = resolveOpeningConfig(openings[0], wallAssembly)
          return constructOpeningFrame(area, openings, zOffset, openingConfig, a => infillWallArea(a, config.infill))
        },
        (() => {
          const wallAssembly = getConfigActions().getWallAssemblyById(wall.wallAssemblyId)
          if (!wallAssembly) return 15
          const openingAssemblyId = wallAssembly.openingAssemblyId || getConfigActions().getDefaultOpeningAssemblyId()
          const openingConfig = getConfigActions().getOpeningAssemblyById(openingAssemblyId)
          return openingConfig?.padding ?? 15
        })()
      )
    )

    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, perimeter, storeyContext, config.layers)

    return mergeModels(baseModel, layerModel)
  }
}
