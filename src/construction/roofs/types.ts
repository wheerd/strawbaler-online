import type { vec2 } from 'gl-matrix'

import type { LayerConfig } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import type { ConstructionModel } from '@/construction/model'
import type { Length, LineSegment2D, Polygon2D } from '@/shared/geometry'

export interface RoofAssembly<TConfig extends RoofAssemblyConfigBase> {
  construct: (polygon: Polygon2D, config: TConfig) => ConstructionModel

  getTopOffset: (config: TConfig) => Length
  getBottomWallOffsets: (config: TConfig, wallLine: LineSegment2D) => vec2[]
  getConstructionThickness: (config: TConfig) => Length
}

export type RoofAssemblyType = 'monolithic' | 'purlin'

export interface RoofAssemblyConfigBase {
  type: RoofAssemblyType
  layers: RoofLayersConfig
}

export interface RoofLayersConfig {
  insideThickness: Length
  insideLayers: LayerConfig[]
  topThickness: Length
  topLayers: LayerConfig[]
  overhangThickness: Length
  overhangLayers: LayerConfig[]
}

export interface MonolithicRoofConfig extends RoofAssemblyConfigBase {
  type: 'monolithic'
  thickness: Length
  material: MaterialId
}

export interface PurlinRoofConfig extends RoofAssemblyConfigBase {
  type: 'purlin'
  thickness: Length

  purlinMaterial: MaterialId
  purlinHeight: Length
  purlinWidth: Length
  purlinSpacing: Length

  rafterMaterial: MaterialId
  rafterWidth: Length
  rafterSpacingMin: Length
  rafterSpacing: Length
  rafterSpacingMax: Length

  insideCladdingMaterial: MaterialId
  insideCladdingThickness: Length

  topCladdingMaterial: MaterialId
  topCladdingThickness: Length

  strawMaterial?: MaterialId
}

export type RoofConfig = MonolithicRoofConfig | PurlinRoofConfig

// Validation

export const validateRoofConfig = (_config: RoofConfig): void => {
  // TODO
}
