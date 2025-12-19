import { createConstructionElement } from '@/construction/elements'
import type { LayerConstruction, MonolithicLayerConfig } from '@/construction/layers/types'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
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
