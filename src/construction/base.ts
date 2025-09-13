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

export interface WallSegment3D {
  type: 'wall' | 'opening'
  position: Vec3 // [offsetFromStart, 0, 0]
  size: Vec3 // [width, wallThickness, wallHeight]

  // For opening segments - array supports merged adjacent openings
  openings?: Opening[]
}

function canMergeOpenings(opening1: Opening, opening2: Opening): boolean {
  // Check if openings are adjacent
  const opening1End = opening1.offsetFromStart + opening1.width
  const opening2Start = opening2.offsetFromStart

  if (opening1End !== opening2Start) return false

  // Check if sill heights match
  const sill1 = opening1.sillHeight ?? 0
  const sill2 = opening2.sillHeight ?? 0
  if (sill1 !== sill2) return false

  // Check if header positions match (sill + height)
  const header1 = sill1 + opening1.height
  const header2 = sill2 + opening2.height
  if (header1 !== header2) return false

  return true
}

function mergeAdjacentOpenings(sortedOpenings: Opening[]): Opening[][] {
  if (sortedOpenings.length === 0) return []

  const groups: Opening[][] = []
  let currentGroup = [sortedOpenings[0]]

  for (let i = 1; i < sortedOpenings.length; i++) {
    const prevOpening = currentGroup[currentGroup.length - 1]
    const currentOpening = sortedOpenings[i]

    if (canMergeOpenings(prevOpening, currentOpening)) {
      currentGroup.push(currentOpening)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentOpening]
    }
  }

  groups.push(currentGroup)
  return groups
}

export function segmentWall(wall: PerimeterWall, wallHeight: Length): WallSegment3D[] {
  if (wall.openings.length === 0) {
    // No openings - just one wall segment for the entire length
    return [
      {
        type: 'wall',
        position: [0, 0, 0],
        size: [wall.insideLength, wall.thickness, wallHeight]
      }
    ]
  }

  // Sort openings by position along the wall
  const sortedOpenings = [...wall.openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart)

  // Validate openings don't overlap and fit within wall
  let currentPosition = 0 as Length

  for (const opening of sortedOpenings) {
    const openingStart = opening.offsetFromStart
    const openingEnd = (openingStart + opening.width) as Length

    // Validate opening fits within wall
    if (openingEnd > wall.insideLength) {
      throw new Error(
        `Opening extends beyond wall length: opening ends at ${openingEnd}mm but wall ${wall.id} is only ${wall.insideLength}mm long`
      )
    }

    // Validate opening doesn't overlap with previous position
    if (openingStart < currentPosition) {
      throw new Error(
        `Opening overlaps with previous segment: opening starts at ${openingStart}mm but previous segment ends at ${currentPosition}mm`
      )
    }

    currentPosition = openingEnd
  }

  // Group adjacent compatible openings
  const openingGroups = mergeAdjacentOpenings(sortedOpenings)

  // Create segments with Vec3 positioning
  const segments: WallSegment3D[] = []
  currentPosition = 0 as Length

  for (const openingGroup of openingGroups) {
    const groupStart = openingGroup[0].offsetFromStart
    const groupEnd = (openingGroup[openingGroup.length - 1].offsetFromStart +
      openingGroup[openingGroup.length - 1].width) as Length

    // Create wall segment before opening group if there's space
    if (groupStart > currentPosition) {
      const wallSegmentWidth = (groupStart - currentPosition) as Length
      segments.push({
        type: 'wall',
        position: [currentPosition, 0, 0],
        size: [wallSegmentWidth, wall.thickness, wallHeight]
      })
    }

    // Create opening segment for the group
    const groupWidth = (groupEnd - groupStart) as Length
    segments.push({
      type: 'opening',
      position: [groupStart, 0, 0],
      size: [groupWidth, wall.thickness, wallHeight],
      openings: openingGroup
    })

    currentPosition = groupEnd
  }

  // Create final wall segment if there's remaining space
  if (currentPosition < wall.insideLength) {
    const remainingWidth = (wall.insideLength - currentPosition) as Length
    segments.push({
      type: 'wall',
      position: [currentPosition, 0, 0],
      size: [remainingWidth, wall.thickness, wallHeight]
    })
  }

  return segments
}
