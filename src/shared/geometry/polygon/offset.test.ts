import type { MainModule, PathD, PathsD } from 'clipper2-wasm'
import { type Mocked, afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { type Vec2, ZERO_VEC2, newVec2 } from '@/shared/geometry/2d'
import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/polygon/clipperInstance'
import { offsetPolygon, polygonEdgeOffset } from '@/shared/geometry/polygon/offset'
import type { Polygon2D } from '@/shared/geometry/polygon/types'
import { partialMock } from '@/test/helpers'

vi.mock('@/shared/geometry/polygon/clipperInstance', () => ({
  createPointD: vi.fn(),
  createPathD: vi.fn(),
  createPathsD: vi.fn(),
  pathDToPoints: vi.fn(),
  getClipperModule: vi.fn()
}))

const createPointDMock = vi.mocked(createPointD)
const createPathDMock = vi.mocked(createPathD)
const createPathsDMock = vi.mocked(createPathsD)
const pathDToPointsMock = vi.mocked(pathDToPoints)
const getClipperModuleMock = vi.mocked(getClipperModule)

function mockClipperModule(overrides: Partial<Mocked<ReturnType<typeof getClipperModule>>> = {}) {
  const module = {
    AreaPathD: vi.fn(() => 123),
    IsPositiveD: vi.fn(() => false),
    PointInPolygonD: vi.fn(() => ({ value: 1 })),
    PointInPolygonResult: { IsOutside: { value: 0 } },
    SimplifyPathD: vi.fn(path => path),
    InflatePathsD: vi.fn(() => ({ get: vi.fn(() => ({})), size: vi.fn(() => 1), delete: vi.fn() })),
    UnionSelfD: vi.fn(() => ({ size: vi.fn(() => 1), delete: vi.fn() })),
    IntersectD: vi.fn(() => ({ size: vi.fn(() => 0), delete: vi.fn() })),
    FillRule: { EvenOdd: { value: 0 } },
    JoinType: { Miter: { value: 3 } },
    EndType: { Polygon: { value: 0 } },
    PathD: vi.fn(),
    PathsD: vi.fn(),
    PointD: vi.fn()
  } as any as MainModule

  Object.assign(module, overrides)
  return module
}

beforeEach(() => {
  createPointDMock.mockReset()
  createPathDMock.mockReset()
  createPathsDMock.mockReset()
  pathDToPointsMock.mockReset()
  getClipperModuleMock.mockReset()

  createPointDMock.mockReturnValue({ delete: vi.fn() } as any)
  createPathDMock.mockReturnValue({ delete: vi.fn() } as any)
  createPathsDMock.mockReturnValue({ delete: vi.fn() } as any)
  pathDToPointsMock.mockReturnValue([ZERO_VEC2])
  getClipperModuleMock.mockReturnValue(mockClipperModule())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('offsetPolygon', () => {
  it('delegates to InflatePathsD and unwraps points', () => {
    const samplePolygon: Polygon2D = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const inflatedPath = partialMock<PathD>({ delete: vi.fn() })
    const inflatedPaths = partialMock<PathsD>({
      get: vi.fn(() => inflatedPath),
      size: vi.fn(() => 1),
      delete: vi.fn()
    })
    const module = mockClipperModule({ InflatePathsD: vi.fn((_1, _2, _3, _4, _5, _6, _7) => inflatedPaths) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints: Vec2[] = [newVec2(123, 456)]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = offsetPolygon(samplePolygon, 5)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.InflatePathsD).toHaveBeenCalledWith(
      pathsStub,
      5,
      module.JoinType.Miter,
      module.EndType.Polygon,
      1000,
      2,
      expect.any(Number)
    )
    expect(pathDToPointsMock).toHaveBeenCalledWith(inflatedPath)
    expect(result.points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
    expect(inflatedPaths.delete).toHaveBeenCalled()
  })
})

describe('polygonEdgeOffset', () => {
  const createClockwiseRectangle = (): Polygon2D => ({
    points: [newVec2(0, 0), newVec2(0, 10), newVec2(10, 10), newVec2(10, 0)]
  })

  it('expands a clockwise polygon when offsets are positive', () => {
    const rectangle = createClockwiseRectangle()
    const result = polygonEdgeOffset(rectangle, [1, 1, 1, 1])

    const expected = [newVec2(-1, -1), newVec2(-1, 11), newVec2(11, 11), newVec2(11, -1)]

    expect(result.points).toHaveLength(expected.length)
    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('applies per-edge offsets individually', () => {
    const rectangle = createClockwiseRectangle()
    const offsets = [1, 2, 3, 4]

    const result = polygonEdgeOffset(rectangle, offsets)
    const expected = [newVec2(-1, -4), newVec2(-1, 12), newVec2(13, 12), newVec2(13, -4)]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('handles colinear adjacent edges using fallback averaging', () => {
    const polygon: Polygon2D = {
      points: [newVec2(0, 0), newVec2(0, 10), newVec2(20, 10), newVec2(20, 0), newVec2(10, 0)]
    }

    const result = polygonEdgeOffset(polygon, [1, 1, 1, 1, 1])
    const expected = [newVec2(-1, -1), newVec2(-1, 11), newVec2(21, 11), newVec2(21, -1), newVec2(10, -1)]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })

  it('shrinks a polygon when offsets are negative', () => {
    const rectangle = createClockwiseRectangle()
    const result = polygonEdgeOffset(rectangle, [-1, -1, -1, -1])

    const expected = [newVec2(1, 1), newVec2(1, 9), newVec2(9, 9), newVec2(9, 1)]

    result.points.forEach((point, index) => {
      expect(point[0]).toBeCloseTo(expected[index][0], 6)
      expect(point[1]).toBeCloseTo(expected[index][1], 6)
    })
  })
})
