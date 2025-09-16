import { type Length, type Vec3 } from '@/types/geometry'
import type { MaterialId, ResolveMaterialFunction } from './material'
import { type ConstructionElement, type WithIssues } from './base'

export interface BaseRingBeamConfig {
  type: 'full' | 'double'
  height: Length // Default: 60mm
  material: MaterialId
}

export interface FullRingBeamConfig extends BaseRingBeamConfig {
  type: 'full'
  width: Length // Default: 360mm
  offsetFromEdge: Length // From inside construction edge of wall
  // Default material: 36x6 wood
}

export interface DoubleRingBeamConfig extends BaseRingBeamConfig {
  type: 'double'
  thickness: Length // Default: 120mm
  // Default material: 12x6 wood
  infillMaterial: MaterialId // Default: straw
  offsetFromEdge: Length // From inside construction edge of wall
  spacing: Length // In between the two beams
}

export type RingBeamConfig = FullRingBeamConfig | DoubleRingBeamConfig

const constructFullRingBeam = (
  _position: Vec3,
  _size: Vec3,
  _config: FullRingBeamConfig,
  _resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  throw new Error('Not implemented')
}

const constructDoubleRingBeam = (
  _position: Vec3,
  _size: Vec3,
  _config: DoubleRingBeamConfig,
  _resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  throw new Error('Not implemented')
}

// Validation functions for ring beam configurations
export const validateRingBeamConfig = (config: RingBeamConfig): void => {
  // Validate common fields
  if (Number(config.height) <= 0) {
    throw new Error('Ring beam height must be greater than 0')
  }

  if (config.type === 'full') {
    validateFullRingBeamConfig(config)
  } else if (config.type === 'double') {
    validateDoubleRingBeamConfig(config)
  } else {
    throw new Error('Invalid ring beam type')
  }
}

const validateFullRingBeamConfig = (config: FullRingBeamConfig): void => {
  if (Number(config.width) <= 0) {
    throw new Error('Ring beam width must be greater than 0')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}

const validateDoubleRingBeamConfig = (config: DoubleRingBeamConfig): void => {
  if (Number(config.thickness) <= 0) {
    throw new Error('Ring beam thickness must be greater than 0')
  }
  if (Number(config.spacing) < 0) {
    throw new Error('Ring beam spacing cannot be negative')
  }
  // offsetFromEdge can be any value (positive, negative, or zero)
}

export const constructRingBeam = (
  position: Vec3,
  size: Vec3,
  config: RingBeamConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  if (config.type === 'full') {
    return constructFullRingBeam(position, size, config, resolveMaterial)
  } else if (config.type === 'double') {
    return constructDoubleRingBeam(position, size, config, resolveMaterial)
  } else {
    throw new Error('Invalid ring beam type')
  }
}
