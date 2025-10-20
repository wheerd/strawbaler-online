import { vec2 } from 'gl-matrix'

import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/clipperInstance'

import type { Area } from './basic'
import type { LineSegment2D } from './line'

const COLINEAR_EPSILON = 1e-9
const SIMPLIFY_TOLERANCE = 0.01

export interface Polygon2D {
  points: vec2[]
}

export interface PolygonWithHoles2D {
  outer: Polygon2D
  holes: Polygon2D[]
}

export function calculatePolygonArea(polygon: Polygon2D): Area {
  const path = createPathD(polygon.points)
  try {
    return Math.abs(getClipperModule().AreaPathD(path))
  } finally {
    path.delete()
  }
}

export function polygonIsClockwise(polygon: Polygon2D): boolean {
  const path = createPathD(polygon.points)
  try {
    return !getClipperModule().IsPositiveD(path)
  } finally {
    path.delete()
  }
}

export function polygonPerimeter(polygon: Polygon2D): number {
  if (polygon.points.length < 2) return 0
  let total = 0
  for (let i = 0; i < polygon.points.length; i++) {
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % polygon.points.length]
    total += vec2.distance(current, next)
  }
  return total
}

export function isPointInPolygon(point: vec2, polygon: Polygon2D): boolean {
  const testPoint = createPointD(point)
  const path = createPathD(polygon.points)
  try {
    const module = getClipperModule()
    const result = module.PointInPolygonD(testPoint, path)
    return result.value !== module.PointInPolygonResult.IsOutside.value
  } finally {
    testPoint.delete()
    path.delete()
  }
}

export function wouldPolygonSelfIntersect(existingPoints: vec2[], newPoint: vec2): boolean {
  if (existingPoints.some(p => vec2.equals(p, newPoint))) {
    return true
  }

  if (existingPoints.length < 2) return false

  const newSegment: LineSegment2D = {
    start: existingPoints[existingPoints.length - 1],
    end: newPoint
  }

  for (let i = 0; i < existingPoints.length - 2; i++) {
    const existingSegment: LineSegment2D = {
      start: existingPoints[i],
      end: existingPoints[i + 1]
    }

    if (segmentsIntersect(newSegment.start, newSegment.end, existingSegment.start, existingSegment.end)) {
      return true
    }
  }

  return false
}

export function wouldClosingPolygonSelfIntersect(polygon: Polygon2D): boolean {
  if (polygon.points.length < 3) return false

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const unionPaths = module.UnionSelfD(paths, module.FillRule.EvenOdd, 2)
    try {
      return unionPaths.size() !== 1
    } finally {
      unionPaths.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function simplifyPolygon(polygon: Polygon2D, epsilon = SIMPLIFY_TOLERANCE): Polygon2D {
  const path = createPathD(polygon.points)
  const paths = createPathsD([path])
  try {
    const simplified = getClipperModule().SimplifyPathD(path, epsilon, true)
    try {
      const points = pathDToPoints(simplified)
      return { points }
    } finally {
      simplified.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function offsetPolygon(polygon: Polygon2D, distanceValue: number): Polygon2D {
  if (distanceValue === 0) {
    return polygon
  }

  const path = createPathD(polygon.points)
  const paths = createPathsD([path])

  try {
    const module = getClipperModule()
    const inflated = module.InflatePathsD(
      paths,
      distanceValue,
      module.JoinType.Miter,
      module.EndType.Polygon,
      1000,
      2,
      0
    )
    try {
      const inflatedPath = inflated.get(0)
      return { points: pathDToPoints(inflatedPath) }
    } finally {
      inflated.delete()
    }
  } finally {
    paths.delete()
    path.delete()
  }
}

export function arePolygonsIntersecting(polygon1: Polygon2D, polygon2: Polygon2D): boolean {
  if (polygon1.points.length < 3 || polygon2.points.length < 3) {
    return false
  }

  const module = getClipperModule()
  const pathA = createPathD(polygon1.points)
  const pathB = createPathD(polygon2.points)
  const pathsA = createPathsD([pathA])
  const pathsB = createPathsD([pathB])

  try {
    const intersections = module.IntersectD(pathsA, pathsB, module.FillRule.EvenOdd, 2)
    try {
      for (let i = 0; i < intersections.size(); i++) {
        const intersectionPath = intersections.get(i)
        if (intersectionPath.size() > 0) {
          return true
        }
      }
    } finally {
      intersections.delete()
    }

    return false
  } finally {
    pathsA.delete()
    pathsB.delete()
    pathA.delete()
    pathB.delete()
  }
}

export function unionPolygons(polygons: Polygon2D[]): Polygon2D[] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return polygons

  const module = getClipperModule()
  const paths = polygons.map(p => createPathD(p.points))
  const pathsD = createPathsD(paths)

  try {
    const unionResult = module.UnionSelfD(pathsD, module.FillRule.NonZero, 2)
    try {
      const result: Polygon2D[] = []
      for (let i = 0; i < unionResult.size(); i++) {
        const path = unionResult.get(i)
        result.push({ points: pathDToPoints(path) })
      }
      return result
    } finally {
      unionResult.delete()
    }
  } finally {
    pathsD.delete()
    for (const path of paths) {
      path.delete()
    }
  }
}

const clonePolygon = (polygon: Polygon2D): Polygon2D => ({
  points: polygon.points.map(point => vec2.fromValues(point[0], point[1]))
})

const polygonSignedArea = (polygon: Polygon2D): number => {
  let sum = 0
  for (let i = 0; i < polygon.points.length; i += 1) {
    const current = polygon.points[i]
    const next = polygon.points[(i + 1) % polygon.points.length]
    sum += current[0] * next[1] - next[0] * current[1]
  }
  return sum / 2
}

const pathsDToPolygons = (paths: ReturnType<typeof createPathsD>): Polygon2D[] => {
  const result: Polygon2D[] = []
  const size = paths.size()
  for (let i = 0; i < size; i += 1) {
    const path = paths.get(i)
    result.push({ points: pathDToPoints(path) })
  }
  return result
}

const unionPolygonSet = (polygons: Polygon2D[]): Polygon2D[] => {
  if (polygons.length === 0) {
    return []
  }

  const module = getClipperModule()
  const subjectPaths = polygons.map(polygon => createPathD(polygon.points))
  const subjectPathsD = createPathsD(subjectPaths)

  try {
    const unionPaths = module.UnionSelfD(subjectPathsD, module.FillRule.NonZero, 2)
    try {
      return pathsDToPolygons(unionPaths)
    } finally {
      unionPaths.delete()
    }
  } finally {
    subjectPathsD.delete()
    subjectPaths.forEach(path => path.delete())
  }
}

const subtractPolygonsClipper = (subject: Polygon2D[], clips: Polygon2D[]): Polygon2D[] => {
  if (clips.length === 0) {
    return subject
  }
  if (subject.length === 0) {
    return []
  }

  const module = getClipperModule()
  const subjectPaths = subject.map(polygon => createPathD(polygon.points))
  const clipPaths = clips.map(polygon => createPathD(polygon.points))
  const subjectPathsD = createPathsD(subjectPaths)
  const clipPathsD = createPathsD(clipPaths)

  try {
    const resultPaths = module.DifferenceD(subjectPathsD, clipPathsD, module.FillRule.NonZero, 2)
    try {
      return pathsDToPolygons(resultPaths)
    } finally {
      resultPaths.delete()
    }
  } finally {
    subjectPathsD.delete()
    clipPathsD.delete()
    subjectPaths.forEach(path => path.delete())
    clipPaths.forEach(path => path.delete())
  }
}

const normaliseOrientation = (polygon: Polygon2D, clockwise: boolean): Polygon2D => {
  const isClockwise = polygonIsClockwise(polygon)
  if (clockwise === isClockwise) {
    return polygon
  }
  return {
    points: [...polygon.points].reverse()
  }
}

const buildPolygonsWithHoles = (polygons: Polygon2D[]): PolygonWithHoles2D[] => {
  if (polygons.length === 0) {
    return []
  }

  const outers: { polygon: Polygon2D; area: number }[] = []
  const holes: Polygon2D[] = []

  polygons.forEach(polygon => {
    const area = polygonSignedArea(polygon)
    if (area >= 0) {
      outers.push({ polygon: normaliseOrientation(polygon, true), area })
    } else {
      holes.push(normaliseOrientation(polygon, false))
    }
  })

  outers.sort((a, b) => Math.abs(b.area) - Math.abs(a.area))

  const result = outers.map(entry => ({ outer: entry.polygon, holes: [] as Polygon2D[] }))

  for (const hole of holes) {
    const referencePoint = hole.points[0]
    const container = result.find(entry => isPointInPolygon(referencePoint, entry.outer))
    if (container) {
      container.holes.push(hole)
    } else {
      result.push({ outer: hole, holes: [] })
    }
  }

  return result
}

export function createFloorMassPolygons(
  perimeterPolygons: Polygon2D[],
  floorAreaPolygons: Polygon2D[],
  openingPolygons: Polygon2D[]
): PolygonWithHoles2D[] {
  const basePolygons = [...perimeterPolygons, ...floorAreaPolygons].map(clonePolygon)
  if (basePolygons.length === 0) {
    return []
  }

  const unioned = unionPolygonSet(basePolygons)
  const withoutOpenings = subtractPolygonsClipper(unioned, openingPolygons.map(clonePolygon))
  return buildPolygonsWithHoles(withoutOpenings)
}

function segmentsIntersect(p1: vec2, q1: vec2, p2: vec2, q2: vec2): boolean {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) return true

  if (o1 === 0 && onSegment(p1, p2, q1)) return true
  if (o2 === 0 && onSegment(p1, q2, q1)) return true
  if (o3 === 0 && onSegment(p2, p1, q2)) return true
  if (o4 === 0 && onSegment(p2, q1, q2)) return true

  return false
}

function orientation(p: vec2, q: vec2, r: vec2): number {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1])
  if (Math.abs(val) < COLINEAR_EPSILON) return 0
  return val > 0 ? 1 : 2
}

function onSegment(p: vec2, q: vec2, r: vec2): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) + COLINEAR_EPSILON &&
    q[0] + COLINEAR_EPSILON >= Math.min(p[0], r[0]) &&
    q[1] <= Math.max(p[1], r[1]) + COLINEAR_EPSILON &&
    q[1] + COLINEAR_EPSILON >= Math.min(p[1], r[1])
  )
}
