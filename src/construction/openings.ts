import type { Opening, OpeningId } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId, ResolveMaterialFunction } from './material'
import {
  createConstructionElementId,
  type BaseConstructionSegment,
  type ConstructionElement,
  type ConstructionIssue,
  type WithIssues,
  type WallSegment3D
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
  type: 'opening'
  openingIds: OpeningId[] // Array to support merged adjacent openings
}

function extractUnifiedDimensions(openings: Opening[]): {
  sillHeight: Length
  headerHeight: Length
} {
  // All openings in a segment have same sill/header heights (guaranteed by segmentWall)
  const firstOpening = openings[0]
  const sillHeight = (firstOpening.sillHeight ?? 0) as Length
  const headerHeight = (sillHeight + firstOpening.height) as Length

  return { sillHeight, headerHeight }
}

export const constructOpeningFrame = (
  openingSegment: WallSegment3D,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<ConstructionElement[]> => {
  if (openingSegment.type !== 'opening' || !openingSegment.openings) {
    throw new Error('constructOpeningFrame requires an opening segment with openings array')
  }

  const openings = openingSegment.openings
  const segmentPosition = openingSegment.position
  const segmentSize = openingSegment.size
  const wallHeight = segmentSize[2]
  const wallThickness = segmentSize[1]

  const { sillHeight, headerHeight } = extractUnifiedDimensions(openings)
  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  const elements: ConstructionElement[] = []

  // Check if header is required and fits
  const isOpeningAtWallTop = headerHeight >= wallHeight
  const headerRequired = !isOpeningAtWallTop

  if (headerRequired) {
    const headerBottom = headerHeight
    const headerTop = (headerBottom + config.headerThickness) as Length

    // Create single header spanning entire segment width
    const headerElement: ConstructionElement = {
      id: createConstructionElementId(),
      type: 'header',
      material: config.headerMaterial,
      position: [segmentPosition[0], segmentPosition[1], headerBottom],
      size: [segmentSize[0], segmentSize[1], config.headerThickness]
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
  const sillRequired = sillHeight > 0

  let sillElement: ConstructionElement | null = null
  if (sillRequired && config.sillThickness && config.sillMaterial) {
    const sillTop = sillHeight
    const sillBottom = (sillTop - config.sillThickness) as Length

    // Create single sill spanning entire segment width
    sillElement = {
      id: createConstructionElementId(),
      type: 'sill',
      material: config.sillMaterial,
      position: [segmentPosition[0], segmentPosition[1], sillBottom] as Vec3,
      size: [segmentSize[0], segmentSize[1], config.sillThickness] as Vec3
    }

    if (sillBottom < 0) {
      errors.push({
        description: `Sill does not fit: needs ${config.sillThickness}mm but only ${sillTop}mm available`,
        elements: [sillElement.id]
      })
    }

    elements.push(sillElement)
  }

  // Create individual filling elements for each opening if configured
  if (config.fillingMaterial && config.fillingThickness) {
    openings.forEach(opening => {
      const fillingWidth = (opening.width - 2 * config.padding) as Length
      const fillingHeight = (opening.height - 2 * config.padding) as Length
      const fillingElement: ConstructionElement = {
        id: createConstructionElementId(),
        type: 'opening',
        material: config.fillingMaterial!,
        position: [
          (opening.offsetFromStart + config.padding) as Length,
          (wallThickness - config.fillingThickness!) / 2,
          (sillHeight + config.padding) as Length
        ] as Vec3,
        size: [fillingWidth, config.fillingThickness!, fillingHeight] as Vec3
      }
      elements.push(fillingElement)
    })
  }

  // Create wall above header (if space remains)
  if (headerRequired) {
    const wallAboveBottom = (headerHeight + config.headerThickness) as Length
    const wallAboveHeight = (wallHeight - wallAboveBottom) as Length

    if (wallAboveHeight > 0) {
      const wallAbovePosition: Vec3 = [segmentPosition[0], segmentPosition[1], wallAboveBottom]
      const wallAboveSize: Vec3 = [segmentSize[0], segmentSize[1], wallAboveHeight]

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
    const wallBelowHeight = (sillHeight - sillThickness) as Length

    if (wallBelowHeight > 0) {
      const wallBelowPosition: Vec3 = [segmentPosition[0], segmentPosition[1], 0]
      const wallBelowSize: Vec3 = [segmentSize[0], segmentSize[1], wallBelowHeight]

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
  openingSegment: WallSegment3D,
  config: OpeningConstructionConfig,
  infill: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction
): WithIssues<OpeningConstruction> => {
  if (openingSegment.type !== 'opening' || !openingSegment.openings) {
    throw new Error('constructOpening requires an opening segment with openings array')
  }

  const { it: elements, errors, warnings } = constructOpeningFrame(openingSegment, config, infill, resolveMaterial)

  return {
    it: {
      id: createConstructionElementId(),
      type: 'opening',
      openingIds: openingSegment.openings.map(o => o.id),
      position: openingSegment.position[0] as Length,
      width: openingSegment.size[0] as Length,
      elements
    },
    warnings,
    errors
  }
}
