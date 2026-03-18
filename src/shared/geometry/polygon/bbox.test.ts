import { describe, expect, it } from 'vitest'

import { type Vec2, ZERO_VEC2, newVec2 } from '@/shared/geometry/2d'
import { convexHullOfPolygonWithHoles, minimumAreaBoundingBox } from '@/shared/geometry/polygon/bbox'

describe('convexHullOfPolygonWithHoles', () => {
  const sortPoints = (points: Vec2[]) =>
    points.map(point => Array.from(point)).sort(([ax, ay], [bx, by]) => (ax === bx ? ay - by : ax - bx))

  it('returns the rectangle corners for a convex polygon', () => {
    const rectangle = {
      outer: {
        points: [newVec2(0, 0), newVec2(1000, 0), newVec2(1000, 500), newVec2(0, 500)]
      },
      holes: []
    }

    const hull = convexHullOfPolygonWithHoles(rectangle)

    expect(sortPoints(hull.points)).toEqual([
      [0, 0],
      [0, 500],
      [1000, 0],
      [1000, 500]
    ])
  })

  it('removes concave interior points while maintaining hull order', () => {
    const concave = {
      outer: {
        points: [
          ZERO_VEC2,
          newVec2(2000, 0),
          newVec2(2000, 500),
          newVec2(1000, 250),
          newVec2(2000, 1500),
          newVec2(0, 1500)
        ]
      },
      holes: []
    }

    const hull = convexHullOfPolygonWithHoles(concave)

    expect(sortPoints(hull.points)).toEqual([
      [0, 0],
      [0, 1500],
      [2000, 0],
      [2000, 1500]
    ])
  })
})

describe('minimumAreaBoundingBox', () => {
  const rotatePoint = (point: Vec2, angle: number) => {
    const sinAngle = Math.sin(angle)
    const cosAngle = Math.cos(angle)
    return newVec2(point[0] * cosAngle - point[1] * sinAngle, point[0] * sinAngle + point[1] * cosAngle)
  }

  const createRectangle = (width: number, height: number, angle = 0): Vec2[] => {
    const halfWidth = width / 2
    const halfHeight = height / 2
    const corners = [
      newVec2(-halfWidth, -halfHeight),
      newVec2(halfWidth, -halfHeight),
      newVec2(halfWidth, halfHeight),
      newVec2(-halfWidth, halfHeight)
    ]

    if (angle === 0) {
      return corners
    }

    return corners.map(corner => rotatePoint(corner, angle))
  }

  const sortedAbsComponents = (vector: Vec2) => [Math.abs(vector[0]), Math.abs(vector[1])].sort((a, b) => a - b)
  const angleDifference = (a: number, b: number) => {
    const twoPi = Math.PI * 2
    let diff = (a - b) % twoPi
    if (diff < -Math.PI) diff += twoPi
    if (diff > Math.PI) diff -= twoPi
    return Math.abs(diff)
  }

  it('returns expected size and angle for an axis-aligned rectangle', () => {
    const rectangle = createRectangle(6, 2, 0)
    const { size, angle } = minimumAreaBoundingBox({ points: rectangle })

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(2, 2)
    expect(components[1]).toBeCloseTo(6, 2)
    expect(
      Math.min(angleDifference(angle, 0), angleDifference(angle, Math.PI / 2), angleDifference(angle, -Math.PI / 2))
    ).toBeLessThan(1e-6)
  })

  it('finds the minimum box for a rotated rectangle', () => {
    const rotation = Math.PI / 6
    const rectangle = createRectangle(8, 3, rotation).map(point => newVec2(point[0] + 10, point[1] - 5))
    const { size, angle } = minimumAreaBoundingBox({ points: rectangle })

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(3, 2)
    expect(components[1]).toBeCloseTo(8, 2)
    expect(
      Math.min(
        angleDifference(angle, rotation),
        angleDifference(angle, rotation + Math.PI / 2),
        angleDifference(angle, rotation - Math.PI / 2)
      )
    ).toBeLessThan(1e-6)
  })

  it('finds the minimum box for a rotated trapezoid with axis-aligned legs', () => {
    const trapezoid = {
      points: [newVec2(0, 0), newVec2(4, 4), newVec2(4, 6), newVec2(-2, 0)]
    }

    const { size, angle } = minimumAreaBoundingBox(trapezoid)

    const components = sortedAbsComponents(size)
    expect(components[0]).toBeCloseTo(Math.sqrt(2), 2)
    expect(components[1]).toBeCloseTo(6 * Math.SQRT2, 2)

    const target = Math.PI / 4
    expect(
      Math.min(
        angleDifference(angle, target),
        angleDifference(angle, target + Math.PI / 2),
        angleDifference(angle, target - Math.PI / 2)
      )
    ).toBeLessThan(1e-6)
  })

  it('throws when the polygon has fewer than three points', () => {
    const polygon = { points: [newVec2(0, 0), newVec2(1, 1)] }
    expect(() => minimumAreaBoundingBox(polygon)).toThrow('Polygon requires at least 3 points')
  })

  it('throws when the polygon is degenerate after computing the hull', () => {
    const polygon = {
      points: [newVec2(0, 0), newVec2(2, 2), newVec2(4, 4), newVec2(6, 6)]
    }
    expect(() => minimumAreaBoundingBox(polygon)).toThrow('Convex hull of polygon requires at least 3 points')
  })
})
