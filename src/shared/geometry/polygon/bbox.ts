import { type Vec2, ZERO_VEC2, newVec2, normVec2, perpendicularCCW } from '@/shared/geometry/2d'
import { Bounds2D } from '@/shared/geometry/bounds'

import type { MinimumBoundingBox, Polygon2D, PolygonWithHoles2D } from './types'

const CONVEX_HULL_EPSILON = 1e-9

const vectorCross = (origin: Vec2, a: Vec2, b: Vec2) => {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0])
}

const pointsEqual = (a: Vec2, b: Vec2) =>
  Math.abs(a[0] - b[0]) < CONVEX_HULL_EPSILON && Math.abs(a[1] - b[1]) < CONVEX_HULL_EPSILON

const signedArea = (points: Vec2[]): number => {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    sum += current[0] * next[1] - next[0] * current[1]
  }
  return sum * 0.5
}

const ensureCounterClockwiseOrder = (points: Vec2[]): Vec2[] => {
  if (points.length <= 2) return [...points]
  const area = signedArea(points)
  if (area < 0) {
    return [...points].reverse()
  }
  return [...points]
}

const advanceIndex = (index: number, n: number) => (index + 1) % n
const retreatIndex = (index: number, n: number) => (index - 1 + n) % n

const buildChain = (chainPoints: Vec2[], keepRightTurns: boolean) => {
  const chain: Vec2[] = []
  for (const point of chainPoints) {
    while (chain.length >= 2) {
      const cross = vectorCross(chain[chain.length - 2], chain[chain.length - 1], point)
      const shouldRemove =
        keepRightTurns && cross < -CONVEX_HULL_EPSILON
          ? true
          : !keepRightTurns && cross > CONVEX_HULL_EPSILON
            ? true
            : Math.abs(cross) <= CONVEX_HULL_EPSILON
      if (shouldRemove) {
        chain.pop()
      } else {
        break
      }
    }
    if (chain.length === 0 || !pointsEqual(chain[chain.length - 1], point)) {
      chain.push(point)
    }
  }
  return chain
}

// Linear-time convex hull for simple polygons (Yao & Graham, 1982)
function convexHullOfSimplePolygon(points: Vec2[]): Vec2[] {
  const n = points.length
  if (n <= 3) {
    return ensureCounterClockwiseOrder(points)
  }

  const orderedPoints = ensureCounterClockwiseOrder(points)

  let leftIndex = 0
  let rightIndex = 0
  for (let i = 1; i < orderedPoints.length; i++) {
    const current = orderedPoints[i]
    const left = orderedPoints[leftIndex]
    const right = orderedPoints[rightIndex]
    if (current[0] < left[0] || (Math.abs(current[0] - left[0]) < CONVEX_HULL_EPSILON && current[1] < left[1])) {
      leftIndex = i
    }
    if (current[0] > right[0] || (Math.abs(current[0] - right[0]) < CONVEX_HULL_EPSILON && current[1] > right[1])) {
      rightIndex = i
    }
  }

  if (pointsEqual(orderedPoints[leftIndex], orderedPoints[rightIndex])) {
    return [orderedPoints[leftIndex]]
  }

  const upperChainPoints: Vec2[] = []
  let index = leftIndex
  while (true) {
    upperChainPoints.push(orderedPoints[index])
    if (index === rightIndex) break
    index = advanceIndex(index, orderedPoints.length)
  }

  const lowerChainPoints: Vec2[] = []
  index = leftIndex
  while (true) {
    lowerChainPoints.push(orderedPoints[index])
    if (index === rightIndex) break
    index = retreatIndex(index, orderedPoints.length)
  }

  const upperHull = buildChain(upperChainPoints, true)
  const lowerHull = buildChain(lowerChainPoints, false)

  const combined = [...upperHull]
  for (let i = 1; i < lowerHull.length - 1; i++) {
    combined.push(lowerHull[i])
  }

  return combined
}

export function convexHullOfPolygon(polygon: Polygon2D): Polygon2D {
  const hullPoints = convexHullOfSimplePolygon(polygon.points)
  return { points: hullPoints }
}

export function convexHullOfPolygonWithHoles(polygon: PolygonWithHoles2D): Polygon2D {
  const hullPoints = convexHullOfSimplePolygon(polygon.outer.points)
  return { points: hullPoints }
}

function minimumAreaBoundingBoxFromPoints(points: Vec2[]): MinimumBoundingBox {
  if (points.length < 3) throw new Error('Polygon requires at least 3 points')

  const hull = convexHullAndrew(points)
  if (hull.length < 3) throw new Error('Convex hull of polygon requires at least 3 points')

  let bestArea = Infinity
  let bestSize = ZERO_VEC2
  let bestAngle = 0
  let bestDirection = ZERO_VEC2

  const rotatePoint = (point: Vec2, sinAngle: number, cosAngle: number) => {
    const x = point[0] * cosAngle - point[1] * sinAngle
    const y = point[0] * sinAngle + point[1] * cosAngle
    return newVec2(x, y)
  }

  for (let i = 0; i < hull.length; i++) {
    const current = hull[i]
    const next = hull[(i + 1) % hull.length]
    const edgeX = next[0] - current[0]
    const edgeY = next[1] - current[1]
    if (Math.abs(edgeX) < CONVEX_HULL_EPSILON && Math.abs(edgeY) < CONVEX_HULL_EPSILON) {
      continue
    }

    const angle = Math.atan2(edgeY, edgeX)
    const sinAngle = Math.sin(-angle)
    const cosAngle = Math.cos(-angle)

    const rotatedHull = hull.map(p => rotatePoint(p, sinAngle, cosAngle))
    const bounds = Bounds2D.fromPoints(rotatedHull)

    const size = bounds.size
    const area = size[0] * size[1]

    if (area < bestArea) {
      bestArea = area
      bestSize = size
      bestAngle = angle

      const edgeDir = normVec2(newVec2(edgeX, edgeY))
      // size[0] is along the edge direction, size[1] is perpendicular to it
      if (size[0] < size[1]) {
        bestDirection = edgeDir
      } else {
        bestDirection = perpendicularCCW(edgeDir)
      }
    }
  }

  return { size: bestSize, angle: bestAngle, smallestDirection: bestDirection }
}

export function minimumAreaBoundingBox(polygon: Polygon2D): MinimumBoundingBox {
  return minimumAreaBoundingBoxFromPoints(polygon.points)
}

// Add a robust convex hull implementation (Andrew / monotone chain)
function convexHullAndrew(points: Vec2[]): Vec2[] {
  if (points.length <= 3) return ensureCounterClockwiseOrder([...points])

  // Sort by x, then y
  const pts = [...points].sort((a, b) => {
    if (a[0] === b[0]) return a[1] - b[1]
    return a[0] - b[0]
  })

  // Remove duplicates (within epsilon)
  const uniq: Vec2[] = []
  for (const p of pts) {
    if (uniq.length === 0 || !pointsEqual(uniq[uniq.length - 1], p)) {
      uniq.push(p)
    }
  }

  if (uniq.length <= 3) return ensureCounterClockwiseOrder(uniq)

  const cross = (a: Vec2, b: Vec2, c: Vec2) => {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  }

  const lower: Vec2[] = []
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= CONVEX_HULL_EPSILON) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: Vec2[] = []
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= CONVEX_HULL_EPSILON) {
      upper.pop()
    }
    upper.push(p)
  }

  // Concatenate lower and upper removing duplicate endpoints
  lower.pop()
  upper.pop()
  const hull = lower.concat(upper)
  return ensureCounterClockwiseOrder(hull)
}
