import type { PerimeterWall, PerimeterCorner, Perimeter } from '@/model'
import type { Length, Vec2 } from '@/types/geometry'
import { distance, createVec2 } from '@/types/geometry'
import type { WallCornerInfo } from './base'

/**
 * Calculate the extension distance from wall outside line endpoint to corner outside point
 */
function calculateCornerExtension(corner: PerimeterCorner, wall: PerimeterWall, isStartCorner: boolean): Length {
  if (isStartCorner) {
    // Distance from start of wall.outsideLine to corner.outsidePoint
    const wallStart = wall.outsideLine.start
    return distance(wallStart, corner.outsidePoint) as Length
  } else {
    // Distance from end of wall.outsideLine to corner.outsidePoint
    const wallEnd = wall.outsideLine.end
    return distance(wallEnd, corner.outsidePoint) as Length
  }
}

/**
 * Calculate corner area bounds in construction coordinates
 */
function calculateCornerAreaBounds(
  wall: PerimeterWall,
  wallHeight: Length,
  isStartCorner: boolean,
  extensionDistance: Length
): { position: Vec2; size: Vec2 } {
  if (isStartCorner) {
    return {
      position: createVec2(-extensionDistance, 0), // Before wall start
      size: createVec2(extensionDistance, wallHeight) // width × height
    }
  } else {
    return {
      position: createVec2(wall.wallLength, 0), // After wall end
      size: createVec2(extensionDistance, wallHeight) // width × height
    }
  }
}

/**
 * Get the corners adjacent to a specific wall
 */
function getWallCorners(
  wall: PerimeterWall,
  perimeter: Perimeter
): {
  startCorner: PerimeterCorner | null
  endCorner: PerimeterCorner | null
} {
  // Find corners at wall start/end based on wall position in perimeter
  const wallIndex = perimeter.walls.findIndex(w => w.id === wall.id)

  if (wallIndex === -1) {
    return { startCorner: null, endCorner: null }
  }

  const startCornerIndex = wallIndex // corner[i] is the start corner for wall[i]
  const endCornerIndex = (wallIndex + 1) % perimeter.corners.length // corner[i+1] is the end corner for wall[i]

  return {
    startCorner: perimeter.corners[startCornerIndex],
    endCorner: perimeter.corners[endCornerIndex]
  }
}

/**
 * Calculate the actual construction length including assigned corners
 */
export function calculateWallConstructionLength(
  wall: PerimeterWall,
  startCorner: PerimeterCorner | null,
  endCorner: PerimeterCorner | null
): {
  constructionLength: Length
  startExtension: Length
  endExtension: Length
} {
  let constructionLength = wall.wallLength // Base inside length

  const startExtension =
    startCorner?.belongsTo === 'next' ? calculateCornerExtension(startCorner, wall, true) : (0 as Length)

  const endExtension =
    endCorner?.belongsTo === 'previous' ? calculateCornerExtension(endCorner, wall, false) : (0 as Length)

  constructionLength = (constructionLength + startExtension + endExtension) as Length

  return { constructionLength, startExtension, endExtension }
}

/**
 * Calculate complete corner information for a wall's construction plan
 */
export function calculateWallCornerInfo(wall: PerimeterWall, perimeter: Perimeter, wallHeight: Length): WallCornerInfo {
  const { startCorner, endCorner } = getWallCorners(wall, perimeter)

  const result: WallCornerInfo = {
    startCorner: null,
    endCorner: null
  }

  if (startCorner) {
    const extensionDistance = calculateCornerExtension(startCorner, wall, true)
    const { position, size } = calculateCornerAreaBounds(wall, wallHeight, true, extensionDistance)

    result.startCorner = {
      id: startCorner.id,
      belongsToThisWall: startCorner.belongsTo === 'next',
      extensionDistance,
      position,
      size
    }
  }

  if (endCorner) {
    const extensionDistance = calculateCornerExtension(endCorner, wall, false)
    const { position, size } = calculateCornerAreaBounds(wall, wallHeight, false, extensionDistance)

    result.endCorner = {
      id: endCorner.id,
      belongsToThisWall: endCorner.belongsTo === 'previous',
      extensionDistance,
      position,
      size
    }
  }

  return result
}
