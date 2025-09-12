import type { Opening, OpeningType, PerimeterWall, PerimeterWallId } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import type { MaterialId } from './material'
import type { StrawConfig } from './straw'
import type { OpeningConstruction, OpeningConstructionConfig } from './openings'

export interface BaseConstructionConfig {
  openings: Record<OpeningType, OpeningConstructionConfig>
  straw: StrawConfig
}

export type PerimeterWallConstructionMethod<TConfig> = (
  wall: PerimeterWall,
  floorHeight: Length,
  config: TConfig
) => WallConstructionPlan

export type ConstructionType = 'infill' | 'strawhenge'

export interface ConstructionIssue {
  description: string
  elements: ConstructionElementId[]
}

export interface WallConstructionPlan {
  wallId: PerimeterWallId
  constructionType: ConstructionType
  wallDimensions: {
    length: Length
    thickness: Length
    height: Length
  }

  segments: ConstructionSegment[]

  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export type ConstructionSegment = WallConstructionSegment | OpeningConstruction

export interface BaseConstructionSegment {
  id: string
  type: 'wall' | 'opening'
  position: Length
  width: Length
  elements: ConstructionElement[]
}

export interface WallConstructionSegment extends BaseConstructionSegment {
  type: 'wall'
  constructionType: ConstructionType
}

export type ConstructionElementType =
  | 'post'
  | 'plate'
  | 'full-strawbale'
  | 'partial-strawbale'
  | 'straw'
  | 'frame'
  | 'header'
  | 'sill'
  | 'opening'
  | 'infill'

export type ConstructionElementId = string & { readonly brand: unique symbol }
export const createConstructionElementId = (): ConstructionElementId =>
  (Date.now().toString(36) + Math.random().toString(36).slice(2)) as ConstructionElementId

export interface ConstructionElement {
  id: ConstructionElementId
  type: ConstructionElementType
  material: MaterialId

  // [0] along wall wall direction (insideLine) (0 = start of the insideLine, > 0 towards the end of insideLine)
  // [1] along wall outside direction (0 = inside edge of wall, > 0 towards outside edge)
  // [2] elevation in the wall (0 = bottom, > 0 towards the top of the wall)
  position: Vec3

  // Non-negative size vector forming a cuboid geometry with axis same as position
  size: Vec3
}

export interface WithIssues<T> {
  it: T
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

export interface WallSegment {
  type: 'wall' | 'opening'
  position: Length
  width: Length

  // For wall segments
  constructionType?: ConstructionType

  // For opening segments
  opening?: Opening
}

export function segmentWall(
  wallLength: Length,
  openings: Opening[],
  constructionType: ConstructionType = 'infill'
): WallSegment[] {
  if (openings.length === 0) {
    // No openings - just one wall segment for the entire length
    return [
      {
        type: 'wall',
        position: 0 as Length,
        width: wallLength,
        constructionType
      }
    ]
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)
  const segments: WallSegment[] = []
  let currentPosition = 0 as Length

  for (const opening of sortedOpenings) {
    const openingStart = opening.offsetFromStart
    const openingEnd = (openingStart + opening.width) as Length

    // Validate opening fits within wall
    if (openingEnd > wallLength) {
      throw new Error(
        `Opening extends beyond wall length: opening ends at ${openingEnd}mm but wall is only ${wallLength}mm long`
      )
    }

    // Validate opening doesn't overlap with previous position
    if (openingStart < currentPosition) {
      throw new Error(
        `Opening overlaps with previous segment: opening starts at ${openingStart}mm but previous segment ends at ${currentPosition}mm`
      )
    }

    // Create wall segment before opening if there's space
    if (openingStart > currentPosition) {
      const wallSegmentWidth = (openingStart - currentPosition) as Length
      segments.push({
        type: 'wall',
        position: currentPosition,
        width: wallSegmentWidth,
        constructionType
      })
    }

    // Create opening segment
    segments.push({
      type: 'opening',
      position: openingStart,
      width: opening.width,
      opening
    })

    currentPosition = openingEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < wallLength) {
    const remainingWidth = (wallLength - currentPosition) as Length
    segments.push({
      type: 'wall',
      position: currentPosition,
      width: remainingWidth,
      constructionType
    })
  }

  return segments
}
