import type { vec3 } from 'gl-matrix'

import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, Volume } from '@/shared/geometry'

export type PartId = string & { readonly brand: unique symbol }

export const dimensionalPartId = (material: MaterialId, size: vec3) =>
  `${material}_${Array.from(size)
    .map(Math.round)
    .sort((a, b) => b - a)
    .join('x')}` as PartId

export interface MaterialParts {
  material: MaterialId
  totalQuantity: number
  totalVolume: Volume
  totalLength?: Length
  parts: Record<PartId, PartInfo>
}

export interface PartInfo {
  partId: PartId
  label: string
  material: MaterialId
  size: vec3
  totalVolume: Volume
  length?: Length
  totalLength?: Length
  quantity: number
}

export type PartsList = Record<MaterialId, MaterialParts>

export const generatePartsList = (model: ConstructionModel): PartsList => {
  throw new Error('Not implemented yet')
}
