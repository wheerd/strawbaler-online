import type { Vec2, Length } from '@/types/geometry'
import type { PerimeterConstructionMethodId, RingBeamConstructionMethodId } from '@/types/ids'

/**
 * Base configuration interface for all perimeter presets
 */
export interface BasePresetConfig {
  thickness: Length
  constructionMethodId: PerimeterConstructionMethodId
  baseRingBeamMethodId?: RingBeamConstructionMethodId
  topRingBeamMethodId?: RingBeamConstructionMethodId
}

/**
 * Configuration specific to rectangular presets
 */
export interface RectangularPresetConfig extends BasePresetConfig {
  width: Length
  length: Length
}

/**
 * Abstract interface for perimeter presets
 * Each preset type provides polygon points for preview and creation
 */
export interface PerimeterPreset<TConfig extends BasePresetConfig = BasePresetConfig> {
  readonly type: string
  readonly name: string

  /**
   * Get the polygon points for this preset configuration
   * Points should be in clockwise order for perimeters
   */
  getPolygonPoints(config: TConfig): Vec2[]

  /**
   * Get the bounds of the preset for positioning
   */
  getBounds(config: TConfig): { width: number; height: number }

  /**
   * Validate the configuration
   */
  validateConfig(config: TConfig): boolean
}
