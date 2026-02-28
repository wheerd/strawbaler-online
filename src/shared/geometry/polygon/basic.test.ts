import type { MainModule } from 'clipper2-wasm'
import { type Mocked, afterEach, beforeEach, describe, expect, vi } from 'vitest'

import { type Vec2, ZERO_VEC2, newVec2 } from '@/shared/geometry/2d'
import {
  calculatePolygonArea,
  isPointInPolygon,
  polygonIsClockwise,
  simplifyPolygon
} from '@/shared/geometry/polygon/basic'
import {
  createPathD,
  createPathsD,
  createPointD,
  getClipperModule,
  pathDToPoints
} from '@/shared/geometry/polygon/clipperInstance'

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

describe('calculatePolygonArea', () => {
  it('delegates to AreaPathD', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const module = mockClipperModule({ AreaPathD: vi.fn(_ => 456) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const area = calculatePolygonArea(samplePolygon)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(module.AreaPathD).toHaveBeenCalledWith(pathStub)
    expect(area).toEqual(456)
    expect(pathStub.delete).toHaveBeenCalled()
  })
})

describe('polygonIsClockwise', () => {
  it('delegates to IsPositiveD', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const module = mockClipperModule({ IsPositiveD: vi.fn(_ => true) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const result = polygonIsClockwise(samplePolygon)

    expect(module.IsPositiveD).toHaveBeenCalledWith(pathStub)
    expect(result).toBe(false)
    expect(pathStub.delete).toHaveBeenCalled()
  })
})

describe('isPointInPolygon', () => {
  it('delegates to PointInPolygonD', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const module = mockClipperModule({
      PointInPolygonD: vi.fn((_1, _2) => ({ value: 1 })),
      PointInPolygonResult: { IsOutside: { value: 2 } } as any
    })
    getClipperModuleMock.mockReturnValue(module)
    const pointStub = { delete: vi.fn() }
    const pathStub = { delete: vi.fn() }
    createPointDMock.mockReturnValueOnce(pointStub as any)
    createPathDMock.mockReturnValueOnce(pathStub as any)

    const point = newVec2(5, 5)
    const result = isPointInPolygon(point, samplePolygon)

    expect(createPointDMock).toHaveBeenCalledWith(point)
    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(module.PointInPolygonD).toHaveBeenCalledWith(pointStub, pathStub)
    expect(result).toBe(true)
    expect(pointStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
  })
})

describe('simplifyPolygon', () => {
  it('delegates to SimplifyPathD and returns points', () => {
    const samplePolygon = {
      points: [newVec2(0, 0), newVec2(10, 0), newVec2(10, 10), newVec2(0, 10)]
    }
    const simplifiedPath = { delete: vi.fn() } as any
    const module = mockClipperModule({ SimplifyPathD: vi.fn((_1, _2, _3) => simplifiedPath) })
    getClipperModuleMock.mockReturnValue(module)
    const pathStub = { delete: vi.fn() }
    const pathsStub = { delete: vi.fn() }
    createPathDMock.mockReturnValueOnce(pathStub as any)
    createPathsDMock.mockReturnValueOnce(pathsStub as any)
    const pathPoints: Vec2[] = [newVec2(123, 456)]
    pathDToPointsMock.mockReturnValueOnce(pathPoints)

    const result = simplifyPolygon(samplePolygon, 23)

    expect(createPathDMock).toHaveBeenCalledWith(samplePolygon.points)
    expect(createPathsDMock).toHaveBeenCalledWith([pathStub])
    expect(module.SimplifyPathD).toHaveBeenCalledWith(pathStub, 23, true)
    expect(pathDToPointsMock).toHaveBeenCalledWith(simplifiedPath)
    expect(result.points).toBe(pathPoints)
    expect(pathsStub.delete).toHaveBeenCalled()
    expect(pathStub.delete).toHaveBeenCalled()
  })
})
