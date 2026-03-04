import { describe, expect } from 'vitest'

import { newVec2 } from '@/shared/geometry/2d'
import {
  calculatePolygonArea,
  calculatePolygonWithHolesArea,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  isPointInPolygon,
  isPointStrictlyInPolygon,
  polygonIsClockwise,
  polygonPerimeter,
  signedPolygonArea
} from '@/shared/geometry/polygon/basic'

describe('signedPolygonArea', () => {
  it('returns positive area for clockwise polygon in Y-down coords', () => {
    const cwPolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    expect(signedPolygonArea(cwPolygon)).toBe(100)
  })

  it('returns negative area for counter-clockwise polygon in Y-down coords', () => {
    const ccwPolygon = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10), newVec2(10, 0)]
    }
    expect(signedPolygonArea(ccwPolygon)).toBe(-100)
  })

  it('returns 0 for degenerate polygon with less than 3 points', () => {
    expect(signedPolygonArea({ points: [newVec2(0, 0), newVec2(10, 0)] })).toBe(0)
    expect(signedPolygonArea({ points: [newVec2(0, 0)] })).toBe(0)
    expect(signedPolygonArea({ points: [] })).toBe(0)
  })
})

describe('calculatePolygonArea', () => {
  it('returns absolute value of signed area', () => {
    const cwPolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const ccwPolygon = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10), newVec2(10, 0)]
    }
    expect(calculatePolygonArea(cwPolygon)).toBe(100)
    expect(calculatePolygonArea(ccwPolygon)).toBe(100)
  })

  it('calculates area of a triangle', () => {
    const triangle = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(5, 10)]
    }
    expect(calculatePolygonArea(triangle)).toBe(50)
  })
})

describe('calculatePolygonWithHolesArea', () => {
  it('subtracts hole area from outer area', () => {
    const outer = {
      points: [newVec2(0, 0), newVec2(20, 0), newVec2(20, 20), newVec2(0, 20)]
    }
    const hole = {
      points: [newVec2(5, 5), newVec2(5, 15), newVec2(15, 15), newVec2(15, 5)]
    }
    expect(calculatePolygonWithHolesArea({ outer, holes: [hole] })).toBe(400 - 100)
  })

  it('returns outer area when no holes', () => {
    const outer = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    expect(calculatePolygonWithHolesArea({ outer, holes: [] })).toBe(100)
  })
})

describe('polygonIsClockwise', () => {
  it('returns true for clockwise polygon', () => {
    const cwPolygon = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10), newVec2(10, 0)]
    }
    expect(polygonIsClockwise(cwPolygon)).toBe(true)
  })

  it('returns false for counter-clockwise polygon', () => {
    const ccwPolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    expect(polygonIsClockwise(ccwPolygon)).toBe(false)
  })
})

describe('ensurePolygonIsClockwise', () => {
  it('returns same polygon if already clockwise', () => {
    const cwPolygon = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10)]
    }
    const result = ensurePolygonIsClockwise(cwPolygon)
    expect(result.points).toEqual(cwPolygon.points)
  })

  it('reverses points if counter-clockwise', () => {
    const ccwPolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10)]
    }
    const result = ensurePolygonIsClockwise(ccwPolygon)
    expect(result.points).toEqual([newVec2(10, 10), newVec2(10, 0), newVec2(0, 0)])
  })
})

describe('ensurePolygonIsCounterClockwise', () => {
  it('returns same polygon if already counter-clockwise', () => {
    const ccwPolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10)]
    }
    const result = ensurePolygonIsCounterClockwise(ccwPolygon)
    expect(result.points).toEqual(ccwPolygon.points)
  })

  it('reverses points if clockwise', () => {
    const cwPolygon = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10)]
    }
    const result = ensurePolygonIsCounterClockwise(cwPolygon)
    expect(result.points).toEqual([newVec2(10, 10), newVec2(0, 10), newVec2(0, 0)])
  })
})

describe('polygonPerimeter', () => {
  it('calculates perimeter of a square', () => {
    const square = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    expect(polygonPerimeter(square)).toBe(40)
  })

  it('returns 0 for polygon with less than 2 points', () => {
    expect(polygonPerimeter({ points: [newVec2(0, 0)] })).toBe(0)
    expect(polygonPerimeter({ points: [] })).toBe(0)
  })
})

describe('isPointInPolygon', () => {
  const square = {
    points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
  }

  it('returns true for point inside polygon', () => {
    expect(isPointInPolygon(newVec2(5, 5), square)).toBe(true)
  })

  it('returns true for point on edge (ray casting includes boundary)', () => {
    expect(isPointInPolygon(newVec2(5, 0), square)).toBe(true)
  })

  it('returns true for point on vertex', () => {
    expect(isPointInPolygon(newVec2(0, 0), square)).toBe(true)
  })

  it('returns false for point outside polygon', () => {
    expect(isPointInPolygon(newVec2(15, 5), square)).toBe(false)
    expect(isPointInPolygon(newVec2(-5, 5), square)).toBe(false)
  })
})

describe('isPointStrictlyInPolygon', () => {
  const square = {
    points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
  }

  it('returns true for point strictly inside polygon', () => {
    expect(isPointStrictlyInPolygon(newVec2(5, 5), square)).toBe(true)
  })

  it('returns false for point on edge', () => {
    expect(isPointStrictlyInPolygon(newVec2(5, 0), square)).toBe(false)
    expect(isPointStrictlyInPolygon(newVec2(0, 5), square)).toBe(false)
    expect(isPointStrictlyInPolygon(newVec2(10, 5), square)).toBe(false)
  })

  it('returns false for point on vertex', () => {
    expect(isPointStrictlyInPolygon(newVec2(0, 0), square)).toBe(false)
    expect(isPointStrictlyInPolygon(newVec2(10, 10), square)).toBe(false)
  })

  it('returns false for point outside polygon', () => {
    expect(isPointStrictlyInPolygon(newVec2(15, 5), square)).toBe(false)
  })

  it('respects custom epsilon', () => {
    const nearEdge = newVec2(5, 0.0001)
    expect(isPointStrictlyInPolygon(nearEdge, square, 0.01)).toBe(false)
    expect(isPointStrictlyInPolygon(nearEdge, square, 0.00001)).toBe(true)
  })
})
