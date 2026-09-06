import { getAdjacentWallNodePairs } from '@/building/gcs/wallNodePairs'
import type { WallId } from '@/building/model/ids'
import { type Vec2, addVec2, lenVec2, midpoint, newVec2, normVec2, perpendicularCCW } from '@/shared/geometry'

export interface WallNodeIncidentWall {
  id: WallId
  key: string
  direction: Vec2
  leftPoint: Vec2
  rightPoint: Vec2
  isPerimeterRay?: boolean
}

export interface WallNodeBadgePair {
  wallA: WallNodeIncidentWall
  wallB: WallNodeIncidentWall
  key: string
  basePoint: Vec2
  offsetDirection: Vec2
}

export function getSmallerAngleBisector(directionA: Vec2, directionB: Vec2): Vec2 {
  const bisector = addVec2(normVec2(directionA), normVec2(directionB))
  return lenVec2(bisector) > 0.001 ? normVec2(bisector) : perpendicularCCW(normVec2(directionA))
}

export function getAdjacentWallNodeBadgePairs(incidents: readonly WallNodeIncidentWall[]): WallNodeBadgePair[] {
  const pairs = getAdjacentWallNodePairs(incidents)
  const useSmallerAngle = incidents.length === 2
  return pairs.map(([wallA, wallB]) => createBadgePair(wallA, wallB, useSmallerAngle))
}

function createBadgePair(
  wallA: WallNodeIncidentWall,
  wallB: WallNodeIncidentWall,
  useSmallerAngle: boolean
): WallNodeBadgePair {
  const offsetDirection = useSmallerAngle
    ? getSmallerAngleBisector(wallA.direction, wallB.direction)
    : getOrderedSectorBisector(wallA.direction, wallB.direction)

  return {
    wallA,
    wallB,
    key: `${wallA.key}-${wallB.key}`,
    basePoint: midpoint(wallA.rightPoint, wallB.leftPoint),
    offsetDirection
  }
}

function getOrderedSectorBisector(directionA: Vec2, directionB: Vec2): Vec2 {
  const angleA = Math.atan2(directionA[1], directionA[0])
  const angleB = Math.atan2(directionB[1], directionB[0])
  let sweep = angleB - angleA
  if (sweep >= 0) sweep -= 2 * Math.PI

  const angle = angleA + sweep / 2
  return newVec2(Math.cos(angle), Math.sin(angle))
}
