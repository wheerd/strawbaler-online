import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import { createCuboidShape, createConstructionElement, type ConstructionElement, type WithIssues } from './base'
import { vec3 } from 'gl-matrix'

export interface StrawConfig {
  baleLength: Length // Default: 800mm
  baleHeight: Length // Default: 500mm
  baleWidth: Length // Default: 360mm
  material: MaterialId
}

export const constructStraw = (position: Vec3, size: Vec3, config: StrawConfig): WithIssues<ConstructionElement[]> => {
  if (size[1] === config.baleWidth) {
    const end = vec3.create()
    vec3.add(end, position, size)

    const bales: ConstructionElement[] = []
    for (let z = position[2]; z < end[2]; z += config.baleHeight) {
      for (let x = position[0]; x < end[0]; x += config.baleLength) {
        const balePosition: Vec3 = [x, position[1], z]
        const baleSize = [
          Math.min(config.baleLength, end[0] - x),
          config.baleWidth,
          Math.min(config.baleHeight, end[2] - z)
        ]

        const isFullBale = baleSize[0] === config.baleLength && baleSize[2] === config.baleHeight
        bales.push(
          createConstructionElement(
            isFullBale ? 'full-strawbale' : 'partial-strawbale',
            config.material,
            createCuboidShape(balePosition, baleSize)
          )
        )
      }
    }
    return {
      it: bales,
      errors: [],
      warnings: []
    }
  } else if (size[1] > config.baleWidth) {
    const element: ConstructionElement = createConstructionElement(
      'straw',
      config.material,
      createCuboidShape(position, size)
    )
    return {
      it: [element],
      errors: [{ description: 'Wall is too thick for a single strawbale', elements: [element.id] }],
      warnings: []
    }
  } else {
    const element: ConstructionElement = createConstructionElement(
      'straw',
      config.material,
      createCuboidShape(position, size)
    )
    return {
      it: [element],
      errors: [],
      warnings: [{ description: 'Wall is too thin for a single strawbale', elements: [element.id] }]
    }
  }
}
