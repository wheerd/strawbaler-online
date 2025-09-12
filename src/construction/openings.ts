import type { Opening, OpeningId } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId, ResolveMaterialFunction } from './material'
import {
  createConstructionElementId,
  type BaseConstructionSegment,
  type ConstructionElement,
  type ConstructionIssue,
  type WithIssues
} from './base'
import type { InfillConstructionConfig } from './infill'
import { infillWallArea } from './infill'

export interface OpeningConstructionConfig {
  padding: Length // Default: 15mm

  sillThickness?: Length // Default: 60mm
  sillMaterial?: MaterialId

  headerThickness: Length // Default: 60mm
  headerMaterial: MaterialId

  fillingThickness?: Length // Default: 30mm
  fillingMaterial?: MaterialId
}

export interface OpeningConstruction extends BaseConstructionSegment {
  openingId: OpeningId
  type: 'opening'
}

export const constructOpeningFrame = (
  opening: Opening,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  wallHeight: Length,
  wallThickness: Length,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  const elements: ConstructionElement[] = []

  // Calculate opening bounds - opening height includes padding
  const openingBottom = (opening.sillHeight ?? 0) as Length
  const openingTop = (openingBottom + opening.height) as Length

  // Check if header is required and fits
  const isOpeningAtWallTop = openingTop >= wallHeight
  const headerRequired = !isOpeningAtWallTop

  if (headerRequired) {
    const headerBottom = openingTop
    const headerTop = (headerBottom + config.headerThickness) as Length

    const headerElement: ConstructionElement = {
      id: createConstructionElementId(),
      type: 'header',
      material: config.headerMaterial,
      position: [opening.offsetFromStart, 0, headerBottom],
      size: [opening.width, wallThickness, config.headerThickness]
    }

    if (headerTop > wallHeight) {
      errors.push({
        description: `Header does not fit: needs ${config.headerThickness}mm but only ${wallHeight - headerBottom}mm available`,
        elements: [headerElement.id]
      })
    }

    elements.push(headerElement)
  }

  // Check if sill is required and fits
  const sillRequired = opening.sillHeight !== undefined && opening.sillHeight > 0

  let sillElement: ConstructionElement | null = null
  if (sillRequired && config.sillThickness && config.sillMaterial) {
    const sillTop = openingBottom
    const sillBottom = (sillTop - config.sillThickness) as Length

    sillElement = {
      id: createConstructionElementId(),
      type: 'sill',
      material: config.sillMaterial,
      position: [opening.offsetFromStart, 0, sillBottom] as Vec3,
      size: [opening.width, wallThickness, config.sillThickness] as Vec3
    }

    if (sillBottom < 0) {
      errors.push({
        description: `Sill does not fit: needs ${config.sillThickness}mm but only ${sillTop}mm available`,
        elements: [sillElement.id]
      })
    }

    elements.push(sillElement)
  }

  // Create optional filling (door/window placeholder) - centered with padding
  if (config.fillingMaterial && config.fillingThickness) {
    const fillingWidth = (opening.width - 2 * config.padding) as Length
    const fillingHeight = (opening.height - 2 * config.padding) as Length
    const fillingElement: ConstructionElement = {
      id: createConstructionElementId(),
      type: 'opening',
      material: config.fillingMaterial,
      position: [
        (opening.offsetFromStart + config.padding) as Length,
        (wallThickness - config.fillingThickness) / 2,
        (openingBottom + config.padding) as Length
      ] as Vec3,
      size: [fillingWidth, config.fillingThickness, fillingHeight] as Vec3
    }
    elements.push(fillingElement)
  }

  // Create wall above header (if space remains)
  if (headerRequired) {
    const wallAboveBottom = (openingTop + config.headerThickness) as Length
    const wallAboveHeight = (wallHeight - wallAboveBottom) as Length

    if (wallAboveHeight > 0) {
      const wallAbovePosition: Vec3 = [opening.offsetFromStart, 0, wallAboveBottom]
      const wallAboveSize: Vec3 = [opening.width, wallThickness, wallAboveHeight]

      const {
        it: wallElements,
        errors: wallErrors,
        warnings: wallWarnings
      } = infillWallArea(wallAbovePosition, wallAboveSize, infill, resolveMaterial)

      elements.push(...wallElements)
      errors.push(...wallErrors)
      warnings.push(...wallWarnings)
    }
  }

  // Create wall below sill (if space remains)
  if (sillRequired) {
    const sillThickness = config.sillThickness ?? (60 as Length)
    const wallBelowHeight = (openingBottom - sillThickness) as Length

    if (wallBelowHeight > 0) {
      const wallBelowPosition: Vec3 = [opening.offsetFromStart, 0, 0]
      const wallBelowSize: Vec3 = [opening.width, wallThickness, wallBelowHeight]

      const {
        it: wallElements,
        errors: wallErrors,
        warnings: wallWarnings
      } = infillWallArea(wallBelowPosition, wallBelowSize, infill, resolveMaterial)

      elements.push(...wallElements)
      errors.push(...wallErrors)
      warnings.push(...wallWarnings)
    }
  }

  return { it: elements, errors, warnings }
}

export const constructOpening = (
  opening: Opening,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  wallHeight: Length,
  wallThickness: Length,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<OpeningConstruction> => {
  const {
    it: elements,
    errors,
    warnings
  } = constructOpeningFrame(opening, config, infill, wallHeight, wallThickness, resolveMaterial)
  return {
    it: {
      id: createConstructionElementId(),
      type: 'opening',
      openingId: opening.id,
      position: opening.offsetFromStart,
      width: opening.width,
      elements
    },
    warnings,
    errors
  }
}
