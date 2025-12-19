import type { Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { PerimeterConstructionContext } from '@/construction/context'
import { createConstructionElement } from '@/construction/elements'
import '@/construction/parts'
import { type ConstructionResult, yieldElement } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  type Line2D,
  type PolygonWithHoles2D,
  type Vec2,
  distanceToInfiniteLine,
  eqVec2,
  lineIntersection,
  offsetLine,
  scaleAddVec2
} from '@/shared/geometry'

import type { FullRingBeamConfig, RingBeamAssembly, RingBeamSegment } from './types'

export class FullRingBeamAssembly implements RingBeamAssembly {
  private config: FullRingBeamConfig

  constructor(config: FullRingBeamConfig) {
    this.config = config
  }

  get height() {
    return this.config.height
  }

  *construct(segment: RingBeamSegment, context: PerimeterConstructionContext): Generator<ConstructionResult> {
    const { perimeter, startIndex, endIndex } = segment
    const total = perimeter.walls.length
    const config = this.config

    const segmentCount = calculateSegmentCount(startIndex, endIndex, total)

    // Track colinear segments
    let colinearStartIndex: number | null = null
    let colinearStartWall: PerimeterWall | null = null

    for (let offset = 0; offset < segmentCount; offset++) {
      const wallIndex = (startIndex + offset) % total
      const wall = perimeter.walls[wallIndex]
      const nextWallIndex = (wallIndex + 1) % total
      const endCorner = perimeter.corners[nextWallIndex]

      // Check if this wall starts or continues a colinear segment
      const isColinearWithNext = Math.abs(endCorner.exteriorAngle - 180) < 0.01 && offset < segmentCount - 1

      if (isColinearWithNext) {
        // Start or continue colinear segment
        if (colinearStartIndex === null) {
          colinearStartIndex = wallIndex
          colinearStartWall = wall
        }
        continue // Skip creating polygon, continue to next wall
      }

      // End of colinear segment (or single wall)
      const actualStartIndex = colinearStartIndex ?? wallIndex
      const actualStartWall = colinearStartWall ?? wall

      // Reset colinear tracking
      colinearStartIndex = null
      colinearStartWall = null

      // Create beam polygon from actualStartIndex to wallIndex (current)
      const polygon = createBeamPolygon(
        perimeter,
        segment,
        context,
        actualStartIndex,
        wallIndex,
        actualStartWall,
        wall,
        config
      )

      // Extrude and yield
      const shape = createExtrudedPolygon(polygon, 'xy', config.height)

      yield* yieldElement(
        createConstructionElement(config.material, shape, undefined, undefined, { type: 'ring-beam' })
      )
    }
  }
}

// Helper functions

function calculateSegmentCount(startIndex: number, endIndex: number, total: number): number {
  if (startIndex <= endIndex) {
    return endIndex - startIndex + 1
  } else {
    // Wrap-around case
    return total - startIndex + endIndex + 1
  }
}

function isWallIndexInSegment(wallIndex: number, segment: RingBeamSegment): boolean {
  const start = segment.startIndex
  const end = segment.endIndex

  if (start <= end) {
    return wallIndex >= start && wallIndex <= end
  } else {
    // Wrap-around case
    return wallIndex >= start || wallIndex <= end
  }
}

function shouldUseOuterEdge(corner: PerimeterCorner, side: 'start' | 'end'): boolean {
  const isConvex = corner.interiorAngle < 180

  // Which wall "owns" this corner for construction purposes
  const isOwnedByRelevantWall =
    side === 'start' ? corner.constructedByWall === 'previous' : corner.constructedByWall === 'next'

  // Decision logic:
  // - Convex corner owned by relevant wall → use outer edge (cut across corner)
  // - Concave corner NOT owned by relevant wall → use outer edge (extend around)
  // - All other cases → use inner edge
  return (isConvex && isOwnedByRelevantWall) || (!isConvex && !isOwnedByRelevantWall)
}

/**
 * Finds the construction line that corresponds to a wall by finding the closest
 * parallel line to the wall's start point.
 *
 * Context lines are filtered to remove colinear walls, so we can't use wall indices directly.
 * Instead, we find the closest parallel line to the wall's reference point.
 *
 * @param wall - The wall to find a line for
 * @param lines - Array of construction lines (from context.innerLines or context.outerLines)
 * @param outside - Whether we're looking for outer (true) or inner (false) line
 * @returns The closest parallel line
 * @throws Error if no parallel line is found (should never happen with valid input)
 */
function findLineForWall(wall: PerimeterWall, lines: Line2D[], outside: boolean): Line2D {
  // Get the reference point (start of the wall's inside or outside line)
  const referencePoint = outside ? wall.outsideLine.start : wall.insideLine.start

  // Find all parallel lines (same direction as wall)
  const parallelLines = lines.filter(line => eqVec2(line.direction, wall.direction))

  if (parallelLines.length === 0) {
    throw new Error(`No parallel lines found for wall in ${outside ? 'outer' : 'inner'} lines`)
  }

  // Find the closest parallel line by distance
  let closestLine = parallelLines[0]
  let minDistance = distanceToInfiniteLine(referencePoint, parallelLines[0])

  for (let i = 1; i < parallelLines.length; i++) {
    const distance = distanceToInfiniteLine(referencePoint, parallelLines[i])
    if (distance < minDistance) {
      minDistance = distance
      closestLine = parallelLines[i]
    }
  }

  return closestLine
}

function createBeamPolygon(
  perimeter: Perimeter,
  segment: RingBeamSegment,
  context: PerimeterConstructionContext,
  startWallIndex: number,
  endWallIndex: number,
  startWall: PerimeterWall,
  endWall: PerimeterWall,
  config: FullRingBeamConfig
): PolygonWithHoles2D {
  const total = perimeter.walls.length

  // Create beam offset lines for start and end walls
  // Note: We use findLineForWall instead of direct indexing because context lines
  // are filtered to remove colinear walls, so indices don't match 1:1 with walls
  //
  // For inner lines: offsetLine uses perpendicularCW, but outsideDirection = perpendicularCCW,
  // so we need NEGATIVE offsets to move from inner line towards outside
  const startInnerLine = findLineForWall(startWall, context.innerLines, false)
  const startBeamInner = offsetLine(startInnerLine, -config.offsetFromEdge)
  const startBeamOuter = offsetLine(startInnerLine, -(config.offsetFromEdge + config.width))

  const endInnerLine = findLineForWall(endWall, context.innerLines, false)
  const endBeamInner = offsetLine(endInnerLine, -config.offsetFromEdge)
  const endBeamOuter = offsetLine(endInnerLine, -(config.offsetFromEdge + config.width))

  // === DETERMINE START EDGE ===
  const prevWallIndex = (startWallIndex - 1 + total) % total
  const startCorner = perimeter.corners[startWallIndex]
  const prevWallInSegment = isWallIndexInSegment(prevWallIndex, segment)

  let startInnerPoint: Vec2
  let startOuterPoint: Vec2

  if (Math.abs(startCorner.exteriorAngle - 180) < 0.01 && !prevWallInSegment) {
    // Colinear at segment boundary - offset corner directly
    startInnerPoint = scaleAddVec2(startCorner.insidePoint, startWall.outsideDirection, config.offsetFromEdge)
    startOuterPoint = scaleAddVec2(
      startCorner.insidePoint,
      startWall.outsideDirection,
      config.offsetFromEdge + config.width
    )
  } else {
    // Determine which edge to use
    let startEdge: Line2D

    if (prevWallInSegment) {
      // Previous wall in segment - use its beam line
      const prevWall = perimeter.walls[prevWallIndex]
      const prevInnerLine = findLineForWall(prevWall, context.innerLines, false)
      const prevBeamInner = offsetLine(prevInnerLine, -config.offsetFromEdge)
      const prevBeamOuter = offsetLine(prevInnerLine, -(config.offsetFromEdge + config.width))
      const useOuter = shouldUseOuterEdge(startCorner, 'start')
      startEdge = useOuter ? prevBeamOuter : prevBeamInner
    } else {
      // Previous wall NOT in segment - use raw construction edge
      const prevWall = perimeter.walls[prevWallIndex]
      const useOuter = shouldUseOuterEdge(startCorner, 'start')
      const prevLine = useOuter
        ? findLineForWall(prevWall, context.outerLines, true)
        : findLineForWall(prevWall, context.innerLines, false)
      startEdge = prevLine
    }

    // Intersect with beam lines
    const innerIntersection = lineIntersection(startEdge, startBeamInner)
    const outerIntersection = lineIntersection(startEdge, startBeamOuter)

    if (!innerIntersection || !outerIntersection) {
      throw new Error(`Failed to calculate beam start intersections at wall ${startWallIndex}`)
    }

    startInnerPoint = innerIntersection
    startOuterPoint = outerIntersection
  }

  // === DETERMINE END EDGE ===
  const nextWallIndex = (endWallIndex + 1) % total
  const endCorner = perimeter.corners[nextWallIndex]
  const nextWallInSegment = isWallIndexInSegment(nextWallIndex, segment)

  let endInnerPoint: Vec2
  let endOuterPoint: Vec2

  if (Math.abs(endCorner.exteriorAngle - 180) < 0.01 && !nextWallInSegment) {
    // Colinear at segment boundary - offset corner directly
    endInnerPoint = scaleAddVec2(endCorner.insidePoint, endWall.outsideDirection, config.offsetFromEdge)
    endOuterPoint = scaleAddVec2(endCorner.insidePoint, endWall.outsideDirection, config.offsetFromEdge + config.width)
  } else {
    // Determine which edge to use
    let endEdge: Line2D

    if (nextWallInSegment) {
      // Next wall in segment - use its beam line
      const nextWall = perimeter.walls[nextWallIndex]
      const nextInnerLine = findLineForWall(nextWall, context.innerLines, false)
      const nextBeamInner = offsetLine(nextInnerLine, -config.offsetFromEdge)
      const nextBeamOuter = offsetLine(nextInnerLine, -(config.offsetFromEdge + config.width))
      const useOuter = shouldUseOuterEdge(endCorner, 'end')
      endEdge = useOuter ? nextBeamOuter : nextBeamInner
    } else {
      // Next wall NOT in segment - use raw construction edge
      const nextWall = perimeter.walls[nextWallIndex]
      const useOuter = shouldUseOuterEdge(endCorner, 'end')
      const nextLine = useOuter
        ? findLineForWall(nextWall, context.outerLines, true)
        : findLineForWall(nextWall, context.innerLines, false)
      endEdge = nextLine
    }

    // Intersect with beam lines
    const innerIntersection = lineIntersection(endEdge, endBeamInner)
    const outerIntersection = lineIntersection(endEdge, endBeamOuter)

    if (!innerIntersection || !outerIntersection) {
      throw new Error(`Failed to calculate beam end intersections at wall ${endWallIndex}`)
    }

    endInnerPoint = innerIntersection
    endOuterPoint = outerIntersection
  }

  // Create quadrilateral polygon (clockwise order for proper winding)
  return {
    outer: {
      points: [startInnerPoint, endInnerPoint, endOuterPoint, startOuterPoint]
    },
    holes: []
  }
}
