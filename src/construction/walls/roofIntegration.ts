import { type ReadonlyVec2, vec2, vec3 } from 'gl-matrix'

import { WallConstructionArea } from '@/construction/geometry'
import type { HeightItem, HeightJumpItem, HeightLine } from '@/construction/roofs/types'
import type { LineSegment2D } from '@/shared/geometry'

/**
 * Result of converting height line to wall offsets
 */
export interface WallTopOffsets {
  offsets: readonly ReadonlyVec2[] | undefined
  hasRoofCoverage: boolean
  coverageStart: number // absolute X position where roof starts
  coverageEnd: number // absolute X position where roof ends
}

/**
 * Convert a HeightLine (from roof) to wall top offsets array
 * @param heightLine - Height line from roof.getBottomOffsets()
 * @param wallLine - Wall line segment
 * @param wallStartX - Absolute X position where wall starts in construction coordinates
 * @returns Wall top offsets with coverage information
 */
export function convertHeightLineToWallOffsets(
  heightLine: HeightLine,
  wallLine: LineSegment2D,
  wallStartX: number
): WallTopOffsets {
  if (heightLine.length === 0) {
    return { offsets: undefined, hasRoofCoverage: false, coverageStart: 0, coverageEnd: 0 }
  }

  // Check if there's any actual coverage
  const firstItem = heightLine[0]
  if (isHeightItem(firstItem) && firstItem.nullAfter && firstItem.position === 0) {
    // No coverage at all
    return { offsets: undefined, hasRoofCoverage: false, coverageStart: 0, coverageEnd: 0 }
  }

  const wallLength = vec2.distance(wallLine.start, wallLine.end)
  const offsets: vec2[] = []

  // Find coverage range
  let coverageStart = wallStartX
  let coverageEnd = wallStartX + wallLength

  // Determine where coverage begins
  if (firstItem.position > 0) {
    // Roof coverage starts partway along wall
    coverageStart = wallStartX + firstItem.position * wallLength
  }

  // Determine where coverage ends
  const lastWithCoverage = findLastItemWithCoverage(heightLine)
  if (lastWithCoverage) {
    coverageEnd = wallStartX + lastWithCoverage.position * wallLength
  }

  // Convert each height line item to offset
  for (const item of heightLine) {
    const absoluteX = wallStartX + item.position * wallLength

    if (isHeightJumpItem(item)) {
      // HeightJumpItem - add both offsets at same position
      offsets.push(vec2.fromValues(absoluteX, item.offset1))
      offsets.push(vec2.fromValues(absoluteX, item.offset2))
    } else {
      // HeightItem
      offsets.push(vec2.fromValues(absoluteX, item.offset))
      if (item.nullAfter) {
        // Last point before null region
        break
      }
    }
  }

  return {
    offsets: offsets.length > 0 ? offsets : undefined,
    hasRoofCoverage: true,
    coverageStart,
    coverageEnd
  }
}

/**
 * Type guard for HeightJumpItem
 */
function isHeightJumpItem(item: HeightJumpItem | HeightItem): item is HeightJumpItem {
  return 'offset1' in item && 'offset2' in item
}

/**
 * Type guard for HeightItem
 */
function isHeightItem(item: HeightJumpItem | HeightItem): item is HeightItem {
  return 'offset' in item && 'nullAfter' in item
}

/**
 * Find the last item in height line that has coverage (not null)
 */
function findLastItemWithCoverage(heightLine: HeightLine): (HeightJumpItem | HeightItem) | null {
  for (let i = heightLine.length - 1; i >= 0; i--) {
    const item = heightLine[i]
    if (isHeightItem(item) && !item.nullAfter) {
      return item
    }
    if (isHeightJumpItem(item)) {
      return item
    }
  }
  return null
}

/**
 * Merge wall segments with different roof coverage into a single WallConstructionArea
 * For segments without roof coverage, adds flat offsets (0) at boundaries
 */
export function mergeWallSegments(
  segments: WallConstructionArea[],
  fullPosition: vec3,
  fullSize: vec3
): WallConstructionArea {
  if (segments.length === 0) {
    return new WallConstructionArea(fullPosition, fullSize)
  }

  if (segments.length === 1) {
    return segments[0]
  }

  // Merge all offsets into a single array
  const mergedOffsets: vec2[] = []

  for (const segment of segments) {
    if (segment.topOffsets) {
      // Segment with roof coverage - copy offsets
      mergedOffsets.push(...segment.topOffsets.map(o => vec2.clone(o)))
    } else {
      // Segment without roof - add flat offsets at segment boundaries
      mergedOffsets.push(vec2.fromValues(segment.position[0], 0))
      mergedOffsets.push(vec2.fromValues(segment.position[0] + segment.size[0], 0))
    }
  }

  // Remove duplicates and sort by X position
  const uniqueOffsets = removeDuplicateOffsets(mergedOffsets)
  uniqueOffsets.sort((a, b) => a[0] - b[0])

  return new WallConstructionArea(fullPosition, fullSize, uniqueOffsets)
}

/**
 * Remove duplicate offsets (same X position, different or same heights)
 * Keeps both values if they differ (height jump)
 */
function removeDuplicateOffsets(offsets: vec2[]): vec2[] {
  const result: vec2[] = []
  const seen = new Map<number, number[]>() // X position -> heights at that position

  for (const offset of offsets) {
    const x = offset[0]
    const y = offset[1]

    if (!seen.has(x)) {
      seen.set(x, [y])
      result.push(offset)
    } else {
      const heights = seen.get(x)
      if (heights && !heights.includes(y)) {
        // Different height at same position - keep it (height jump)
        heights.push(y)
        result.push(offset)
      }
      // Otherwise skip - exact duplicate
    }
  }

  return result
}

/**
 * Split a WallConstructionArea at height jumps (discontinuities)
 * Returns array of continuous segments
 */
export function splitAtHeightJumps(area: WallConstructionArea): WallConstructionArea[] {
  if (!area.topOffsets || area.topOffsets.length === 0) {
    return [area]
  }

  const segments: WallConstructionArea[] = []
  let start = 0
  const segmentOffsets: vec2[] = []

  // Find positions where jumps occur (same X position, different offsets)
  for (let i = 0; i < area.topOffsets.length - 1; i++) {
    segmentOffsets.push(area.topOffsets[i])
    const current = area.topOffsets[i]
    const next = area.topOffsets[i + 1]
    if (Math.abs(current[0] - next[0]) < 0.001) {
      const end = current[0]
      segments.push(
        new WallConstructionArea(
          vec3.fromValues(area.position[0] + start, area.position[1], area.position[2]),
          vec3.fromValues(end - start, area.size[1], area.size[2]),
          segmentOffsets.map(o => vec2.fromValues(o[0] - start, o[1]))
        )
      )
      start = end
      segmentOffsets.length = 0
    }
  }

  if (segmentOffsets.length > 0) {
    segments.push(
      new WallConstructionArea(
        vec3.fromValues(area.position[0] + start, area.position[1], area.position[2]),
        vec3.fromValues(area.size[0] - start, area.size[1], area.size[2]),
        segmentOffsets.map(o => vec2.fromValues(o[0] - start, o[1]))
      )
    )
  }

  return segments
}
