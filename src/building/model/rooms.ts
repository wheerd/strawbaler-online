import { type Area, type Length, type LineSegment2D, type Polygon2D, type Vec2 } from '@/shared/geometry'

import type {
  InteriorWallAssemblyId,
  IntermediateWallId,
  OpeningId,
  PerimeterId,
  PerimeterWallId,
  RoomId,
  WallNodeId
} from './ids'

export type RoomType =
  | 'living-room'
  | 'kitchen'
  | 'dining-room'
  | 'bedroom'
  | 'bathroom'
  | 'wc'
  | 'hallway'
  | 'office'
  | 'storage'
  | 'utility'
  | 'service'
  | 'generic'

export type WallAxis = 'left' | 'center' | 'right'

export interface BaseWallNode {
  id: WallNodeId
  perimeterId: PerimeterId
  type: 'perimeter' | 'inner'
}

export interface PerimeterWallNode extends BaseWallNode {
  type: 'perimeter'
  wallId: PerimeterWallId
  offsetFromCornerStart: Length
}

export interface InnerWallNode extends BaseWallNode {
  type: 'inner'
  position: Vec2
}

export interface WallNodeGeometry {
  position: Vec2
}

export interface InnerWallNodeGeometry extends WallNodeGeometry {
  connectedWallIds: IntermediateWallId[]
  boundary: Polygon2D
}

export type PerimeterWallNodeWithGeometry = PerimeterWallNode & WallNodeGeometry
export type InnerWallNodeWithGeometry = InnerWallNode & InnerWallNodeGeometry

export type WallNode = PerimeterWallNode | InnerWallNode
export type WallNodeWithGeometry = PerimeterWallNodeWithGeometry | InnerWallNodeWithGeometry

export interface Room {
  id: RoomId
  perimeterId: PerimeterId
  wallIds: IntermediateWallId[] // Detected automatically
  type: RoomType
  counter: number // Counts up the rooms per storey and room type (i.e. bedroom 1, bedroom 2, ...)
  customLabel?: string
}

export interface RoomGeometry {
  boundary: Polygon2D
  area: Area
}

export type RoomWithGeometry = Room & RoomGeometry

export interface WallAttachment {
  nodeId: WallNodeId
  axis: WallAxis
}

export interface IntermediateWall {
  id: IntermediateWallId
  perimeterId: PerimeterId
  openingIds: OpeningId[] // TODO
  leftRoomId?: RoomId // TODO
  rightRoomId?: RoomId // TODO
  start: WallAttachment
  end: WallAttachment
  thickness: Length
  wallAssemblyId?: InteriorWallAssemblyId // TODO
}

export interface IntermediateWallGeometry {
  boundary: Polygon2D
  centerLine: LineSegment2D
  wallLength: Length
  leftLength: Length
  leftLine: LineSegment2D
  rightLength: Length
  rightLine: LineSegment2D
  direction: Vec2
  leftDirection: Vec2
}

export type IntermediateWallWithGeometry = IntermediateWall & IntermediateWallGeometry
