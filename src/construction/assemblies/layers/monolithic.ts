import type { LayerConstruction, MonolithicLayerConfig } from '@/construction/assemblies/layers/types'
import { createConstructionElement } from '@/construction/model/elements'
import { type ConstructionResult, yieldElement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import { type Length, type Plane3D, type PolygonWithHoles2D, fromTrans, newVec3 } from '@/shared/geometry'

export class MonolithicLayerConstruction implements LayerConstruction<MonolithicLayerConfig> {
  construct = function* (
    polygon: PolygonWithHoles2D,
    offset: Length,
    plane: Plane3D,
    config: MonolithicLayerConfig
  ): Generator<ConstructionResult> {
    const position =
      plane === 'xy' ? newVec3(0, 0, offset) : plane === 'xz' ? newVec3(0, offset, 0) : newVec3(offset, 0, 0)

    yield* yieldElement(
      createConstructionElement(
        config.material,
        createExtrudedPolygon(polygon, plane, config.thickness),
        fromTrans(position)
      )
    )
  }
}
