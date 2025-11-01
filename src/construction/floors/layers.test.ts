import { describe, expect, it } from 'vitest'

import { constructFloorLayers } from '@/construction/floors/layers'
import type { FloorLayersConfig, FloorAssemblyConfigBase } from '@/construction/floors/types'
import { TAG_FLOOR_LAYER_TOP, TAG_FLOOR_LAYER_CEILING } from '@/construction/tags'

const createLayersConfig = (topThickness: number, bottomThickness: number): FloorLayersConfig => ({
  topThickness,
  bottomThickness,
  topLayers: [
    {
      type: 'monolithic',
      material: 'material_top' as never,
      thickness: topThickness
    }
  ],
  bottomLayers: [
    {
      type: 'monolithic',
      material: 'material_bottom' as never,
      thickness: bottomThickness
    }
  ]
})

const createConfig = (layers: FloorLayersConfig): FloorAssemblyConfigBase => ({
  type: 'monolithic',
  layers
})

const square = [
  [0, 0],
  [3000, 0],
  [3000, 3000],
  [0, 3000]
]

describe('constructFloorLayers', () => {
  it('creates floor finish layers when top layers are configured', () => {
    const layers = createLayersConfig(40, 0)
    const model = constructFloorLayers({
      finishedPolygon: { points: square },
      topHoles: [],
      ceilingHoles: [],
      currentFloorConfig: createConfig(layers),
      nextFloorConfig: null,
      floorTopOffset: 40,
      ceilingStartHeight: 0
    })

    expect(model).not.toBeNull()
    expect(model?.elements.some(element => 'children' in element && element.tags?.includes(TAG_FLOOR_LAYER_TOP))).toBe(
      true
    )
  })

  it('creates ceiling finish layers when next floor bottom layers exist', () => {
    const layers = createLayersConfig(0, 30)
    const model = constructFloorLayers({
      finishedPolygon: { points: square },
      topHoles: [],
      ceilingHoles: [],
      currentFloorConfig: createConfig(createLayersConfig(0, 0)),
      nextFloorConfig: createConfig(layers),
      floorTopOffset: 0,
      ceilingStartHeight: 3000
    })

    expect(model).not.toBeNull()
    expect(
      model?.elements.some(element => 'children' in element && element.tags?.includes(TAG_FLOOR_LAYER_CEILING))
    ).toBe(true)
  })
})
