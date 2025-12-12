import { vec2, vec3 } from 'gl-matrix'

import { getConfigActions } from '@/construction/config'
import { type ConstructionElement, createConstructionElement } from '@/construction/elements'
import type { WallConstructionArea } from '@/construction/geometry'
import { rotatedRectFromPolygon, tiledRectPolygons } from '@/construction/helpers'
import { getMaterialsActions } from '@/construction/materials/store'
import { polygonPartInfo } from '@/construction/parts'
import { type ConstructionResult, yieldElement, yieldError, yieldWarning } from '@/construction/results'
import { createElementFromArea, createExtrudedPolygon } from '@/construction/shapes'
import {
  TAG_FULL_BALE,
  TAG_PARTIAL_BALE,
  TAG_STRAW_FLAKES,
  TAG_STRAW_INFILL,
  TAG_STRAW_STUFFED,
  type Tag
} from '@/construction/tags'
import { type Length, type Plane3D, type PolygonWithHoles2D, calculatePolygonWithHolesArea } from '@/shared/geometry'

import type { MaterialId, StrawbaleMaterial } from './material'

function getStrawTags(size: vec3, material: StrawbaleMaterial): Tag[] {
  if (Math.abs(size[1] - material.baleWidth) > material.tolerance) {
    return [TAG_STRAW_STUFFED]
  }

  let height: number, length: number
  if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
    // Vertical
    height = size[0]
    length = size[2]
  } else {
    // Horizontal
    height = size[2]
    length = size[0]
  }

  const isFullHeight = Math.abs(height - material.baleHeight) <= material.tolerance
  const isFullLength = length >= material.baleMinLength && length <= material.baleMaxLength
  if (isFullHeight && isFullLength) {
    return [TAG_FULL_BALE]
  }
  if (isFullHeight) {
    if (length > material.baleMinLength / 2) {
      return [TAG_PARTIAL_BALE]
    }
    if (length >= material.flakeSize) {
      return [TAG_STRAW_FLAKES]
    }
    return [TAG_STRAW_STUFFED]
  }
  if (height > material.baleHeight - material.topCutoffLimit) {
    return [isFullLength ? TAG_PARTIAL_BALE : TAG_STRAW_FLAKES]
  }
  return [TAG_STRAW_STUFFED]
}

export function* constructStraw(area: WallConstructionArea, materialId?: MaterialId): Generator<ConstructionResult> {
  const { size } = area
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  if (material?.type !== 'strawbale') {
    yield* yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], 'strawbale'))
    return
  }

  if (size[1] === material.baleWidth) {
    // Gap smaller than a flake: Make it one stuffed fill
    if (size[0] < material.flakeSize || size[2] < material.flakeSize) {
      yield* yieldElement(createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED], 'strawbale'))
      return
    }

    // Vertical bales
    if (Math.abs(size[0] - material.baleHeight) <= material.tolerance) {
      for (let z = 0; z < size[2]; z += material.baleMaxLength) {
        const adjustedHeight = Math.min(material.baleMaxLength, size[2] - z)
        const baleArea = area.withZAdjustment(z, adjustedHeight)

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
      return
    }

    // Horizontal bales
    let remainderHeight = size[2] % material.baleHeight
    if (material.baleHeight - remainderHeight < material.topCutoffLimit) remainderHeight = 0
    const fullEndZ = size[2] - remainderHeight
    for (let z = 0; z < fullEndZ; z += material.baleHeight) {
      for (let x = 0; x < size[0]; x += material.baleMaxLength) {
        const baleArea = area.withXAdjustment(x, material.baleMaxLength).withZAdjustment(z, material.baleHeight)

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
    }

    // Vertical flakes on top
    if (remainderHeight > 0) {
      const remainingArea = area.withZAdjustment(fullEndZ)
      if (remainderHeight > material.flakeSize) {
        for (let x = 0; x < size[0]; x += material.baleHeight) {
          const baleArea = remainingArea.withXAdjustment(x, material.baleHeight)

          yield* yieldElement(
            createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
          )
        }
      } else {
        const baleArea = area.withZAdjustment(fullEndZ)

        yield* yieldElement(
          createElementFromArea(baleArea, strawMaterialId, getStrawTags(baleArea.size, material), 'strawbale')
        )
      }
    }
  } else if (size[1] > material.baleWidth) {
    const element = createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED])
    yield* yieldElement(element)
    yield yieldError('Wall is too thick for a single strawbale', [element], `strawbale-thick-${strawMaterialId}`)
  } else {
    const element = createElementFromArea(area, strawMaterialId, [TAG_STRAW_STUFFED])
    yield* yieldElement(element)
    yield yieldWarning('Wall is too thin for a single strawbale', [element], `strawbale-thin-${strawMaterialId}`)
  }
}

export function* constructStrawPolygon(
  polygon: PolygonWithHoles2D,
  direction: vec2,
  plane: Plane3D,
  thickness: Length,
  materialId?: MaterialId
): Generator<ConstructionResult> {
  const strawMaterialId = materialId ?? getConfigActions().getDefaultStrawMaterial()
  const material = getMaterialsActions().getMaterialById(strawMaterialId)

  const fullElement = (tags: Tag[]): ConstructionElement =>
    createConstructionElement(
      strawMaterialId,
      createExtrudedPolygon(polygon, plane, thickness),
      undefined,
      tags,
      polygonPartInfo('strawbale', polygon.outer, plane, thickness)
    )

  if (material?.type !== 'strawbale') {
    yield* yieldElement(fullElement([TAG_STRAW_INFILL]))
    return
  }

  if (thickness > material.baleWidth) {
    const element = fullElement([TAG_STRAW_INFILL])
    yield* yieldElement(element)
    yield yieldError('Wall is too thick for a single strawbale', [element], `strawbale-thick-${strawMaterialId}`)
    return
  } else if (thickness < material.baleWidth) {
    const element = fullElement([TAG_STRAW_INFILL])
    yield* yieldElement(element)
    yield yieldWarning('Wall is too thin for a single strawbale', [element], `strawbale-thin-${strawMaterialId}`)
    return
  }

  const { perpDir, dirExtent, perpExtent, minPoint } = rotatedRectFromPolygon(polygon.outer, direction)

  if (dirExtent < material.flakeSize || perpExtent < material.flakeSize) {
    yield* yieldElement(fullElement([TAG_STRAW_STUFFED]))
    return
  }

  // Lengthwise along dir
  if (Math.abs(perpExtent - material.baleHeight) <= material.tolerance) {
    for (const part of tiledRectPolygons(
      minPoint,
      direction,
      dirExtent,
      material.baleMaxLength,
      perpDir,
      perpExtent,
      material.baleHeight,
      polygon
    )) {
      yield* baleFromPolygon(part, direction, thickness, material)
    }
    return
  }

  // Bales perpendicular to dir
  for (const part of tiledRectPolygons(
    minPoint,
    direction,
    dirExtent,
    material.baleHeight,
    perpDir,
    perpExtent,
    material.baleMaxLength,
    polygon
  )) {
    yield* baleFromPolygon(part, direction, thickness, material)
  }
}

function* baleFromPolygon(part: PolygonWithHoles2D, direction: vec2, thickness: Length, material: StrawbaleMaterial) {
  const partRect = rotatedRectFromPolygon(part.outer, direction)
  const partSize = vec3.fromValues(partRect.dirExtent, thickness, partRect.perpExtent)
  const partArea = calculatePolygonWithHolesArea(part)
  const rectArea = partRect.dirExtent * partRect.perpExtent
  const fillingRatio = partArea / rectArea
  const tags = fillingRatio < 0.8 ? [TAG_STRAW_STUFFED] : getStrawTags(partSize, material)
  yield* yieldElement(
    createConstructionElement(
      material.id,
      createExtrudedPolygon(part, 'xy', thickness),
      undefined,
      tags,
      polygonPartInfo('strawbale', part.outer, 'xy', thickness)
    )
  )
}
