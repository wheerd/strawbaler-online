import type { MainModule, PathsD } from 'clipper2-wasm'
import { type Mocked, afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { type Vec2, ZERO_VEC2, newVec2 } from '@/shared/geometry/2d'
import { unionPolygons } from '@/shared/geometry/polygon/boolean'
import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/polygon/clipperInstance'
import type { Polygon2D } from '@/shared/geometry/polygon/types'

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
    FillRule: { EvenOdd: { value: 0 }, NonZero: { value: 1 } },
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

describe('unionPolygons', () => {
  it('should return empty array for empty input', () => {
    const result = unionPolygons([])
    expect(result).toEqual([])
  })

  it('should return same polygon for single polygon input', () => {
    const polygon: Polygon2D = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const result = unionPolygons([polygon])
    expect(result).toEqual([polygon])
  })

  it('should union two overlapping polygons', () => {
    const polygon1: Polygon2D = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const polygon2: Polygon2D = {
      points: [newVec2(5, 5), newVec2(15, 5), newVec2(15, 15), newVec2(5, 15)]
    }

    const unionResultPath = { delete: vi.fn() } as any
    const union = {
      size: vi.fn(() => 1),
      get: vi.fn(() => unionResultPath),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ UnionSelfD: vi.fn((_1, _2, _3) => union) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub1 = { delete: vi.fn() }
    const pathStub2 = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub1 as any).mockReturnValueOnce(pathStub2 as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints: Vec2[] = [newVec2(123, 456)]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = unionPolygons([polygon1, polygon2])

    expect(createPathDMock).toHaveBeenCalledWith(polygon1.points)
    expect(createPathDMock).toHaveBeenCalledWith(polygon2.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub1, pathStub2])
    expect(module.UnionSelfD).toHaveBeenCalledWith(pathsStub, module.FillRule.NonZero, 2)
    expect(result).toHaveLength(1)
    expect(result[0].points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub1.delete).toHaveBeenCalled()
    expect(pathStub2.delete).toHaveBeenCalled()
    expect(union.delete).toHaveBeenCalled()
  })
})
