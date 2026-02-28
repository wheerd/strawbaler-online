import type { MainModule, PathsD } from 'clipper2-wasm'
import { type Mocked, afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { ZERO_VEC2, newVec2 } from '@/shared/geometry/2d'
import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/polygon/clipperInstance'
import { arePolygonsIntersecting, wouldClosingPolygonSelfIntersect } from '@/shared/geometry/polygon/intersection'

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

describe('arePolygonsIntersecting', () => {
  it('delegates to IntersectD', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const intersections = {
      size: vi.fn(() => 1),
      get: vi.fn(() => ({ size: vi.fn(() => 1) })),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ IntersectD: vi.fn((_1, _2, _3, _4) => intersections) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStubA = { delete: vi.fn() }
    const pathStubB = { delete: vi.fn() }
    const pathsStubA = { delete: vi.fn() }
    const pathsStubB = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStubA as any).mockReturnValueOnce(pathStubB as any)
    createPathsDMock.mockReturnValueOnce(pathsStubA as any).mockReturnValueOnce(pathsStubB as any)

    const otherPolygon = {
      points: [newVec2(0, 0), newVec2(1, 1), newVec2(2, 2)]
    }
    const result = arePolygonsIntersecting(samplePolygon, otherPolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStubA])
    expect(createPathDMock).toHaveBeenCalledWith(otherPolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStubB])
    expect(module.IntersectD).toHaveBeenCalledWith(pathsStubA, pathsStubB, module.FillRule.EvenOdd, 2)
    expect(result).toBe(true)
    expect(pathStubA.delete).toHaveBeenCalled()
    expect(pathStubB.delete).toHaveBeenCalled()
    expect(pathsStubA.delete).toHaveBeenCalled()
    expect(pathsStubB.delete).toHaveBeenCalled()
    expect(intersections.delete).toHaveBeenCalled()
  })
})

describe('wouldClosingPolygonSelfIntersect', () => {
  it('delegates to UnionSelfD', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const union = {
      size: vi.fn(() => 2),
      delete: vi.fn()
    } as any as PathsD
    const module = mockClipperModule({ UnionSelfD: vi.fn((_1, _2, _3) => union) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)

    const result = wouldClosingPolygonSelfIntersect(samplePolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.UnionSelfD).toHaveBeenCalledWith(pathsStub, module.FillRule.EvenOdd, 2)
    expect(result).toBe(true)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
    expect(union.delete).toHaveBeenCalled()
  })
})
