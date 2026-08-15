import type {
  IntermediateWallWithGeometry,
  PerimeterWallWithGeometry,
  WallEntityGeometrySource
} from '@/building/model'
import { type Length, type LineSegment2D, scaleAddVec2 } from '@/shared/geometry'

export type MovableWall = PerimeterWallWithGeometry | IntermediateWallWithGeometry

export interface WallMovementGeometry extends WallEntityGeometrySource {
  length: Length
}

export function getWallMovementGeometry(wall: MovableWall): WallMovementGeometry {
  if ('insideLine' in wall) {
    return {
      insideLine: wall.insideLine,
      outsideLine: wall.outsideLine,
      direction: wall.direction,
      length: wall.wallLength
    }
  }

  const halfThickness = wall.thickness / 2
  const insideLine: LineSegment2D = {
    start: scaleAddVec2(wall.centerLine.start, wall.leftDirection, halfThickness),
    end: scaleAddVec2(wall.centerLine.end, wall.leftDirection, halfThickness)
  }
  const outsideLine: LineSegment2D = {
    start: scaleAddVec2(wall.centerLine.start, wall.leftDirection, -halfThickness),
    end: scaleAddVec2(wall.centerLine.end, wall.leftDirection, -halfThickness)
  }

  return {
    insideLine,
    outsideLine,
    direction: wall.direction,
    length: wall.wallLength
  }
}
