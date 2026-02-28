import type { Vec2 } from '@/shared/geometry/2d'
import type { Vec3 } from '@/shared/geometry/3d'

export interface Polygon2D {
  points: Vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

export interface Polygon3D {
  points: Vec3[]
}

export interface PolygonWithHoles3D {
  outer: Polygon3D
  holes: Polygon3D[]
}

export interface PolygonSide {
  polygon: Polygon2D
  side: 'left' | 'right'
}

export interface MinimumBoundingBox {
  size: Vec2
  angle: number
  smallestDirection: Vec2
}

export interface LinePolygonIntersection {
  segments: {
    tStart: number // 0-1 position along line where it enters polygon
    tEnd: number // 0-1 position along line where it exits polygon
  }[]
}
