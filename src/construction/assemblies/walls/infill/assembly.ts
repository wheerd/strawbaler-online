import type { PerimeterWallWithGeometry } from '@/building/model'
import { getConfigActions, resolveLayerSetThickness } from '@/config'
import type { InfillWallConfig } from '@/construction/assemblies/walls'
import { BaseWallAssembly } from '@/construction/assemblies/walls/base'
import { type WallLayerSetIds, constructWallLayers } from '@/construction/assemblies/walls/layers'
import { segmentedWallConstruction } from '@/construction/assemblies/walls/segmentation'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import { mergeModels } from '@/construction/model/model'
import { aggregateResults, assignDeterministicIdsToResults } from '@/construction/model/results'
import { TAG_INFILL_CONSTRUCTION } from '@/construction/model/tags'
import { getMaterialById } from '@/materials/store'
import { type ThicknessRange, addThickness, getMaterialThickness } from '@/materials/thickness'
import { Bounds3D } from '@/shared/geometry'

import { infillWallArea } from './infill'

export class InfillWallAssembly extends BaseWallAssembly<InfillWallConfig> {
  construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel {
    const layerSetIds: WallLayerSetIds = {
      insideLayerSetId: this.config.insideLayerSetId,
      outsideLayerSetId: this.config.outsideLayerSetId
    }

    const allResults = Array.from(
      segmentedWallConstruction(
        wall,
        storeyContext,
        layerSetIds,
        (area, startsWithStand, endsWithStand, startAtEnd) =>
          infillWallArea(area, this.config, startsWithStand, endsWithStand, startAtEnd),
        area => infillWallArea(area, this.config),
        this.config.openingAssemblyId
      )
    )

    assignDeterministicIdsToResults(allResults, wall.id)

    const aggRes = aggregateResults(allResults)
    const baseModel: ConstructionModel = {
      bounds: Bounds3D.merge(...aggRes.elements.map(e => e.bounds)),
      elements: aggRes.elements,
      measurements: aggRes.measurements,
      areas: aggRes.areas,
      errors: aggRes.errors,
      warnings: aggRes.warnings
    }

    const layerModel = constructWallLayers(wall, storeyContext, layerSetIds)

    return mergeModels(baseModel, layerModel)
  }

  get thicknessRange(): ThicknessRange {
    const strawMaterialId = this.config.strawMaterial ?? getConfigActions().getDefaultStrawMaterial()
    const strawMaterial = getMaterialById(strawMaterialId)
    const insideThickness = resolveLayerSetThickness(this.config.insideLayerSetId)
    const outsideThickness = resolveLayerSetThickness(this.config.outsideLayerSetId)
    const layerThickness = insideThickness + outsideThickness
    return addThickness(strawMaterial ? getMaterialThickness(strawMaterial) : undefined, layerThickness)
  }

  readonly tag = TAG_INFILL_CONSTRUCTION
}
