import { vec2 } from 'gl-matrix'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Opening, Perimeter, PerimeterCorner, PerimeterWall } from '@/building/model/model'
import type { ConstructionElement, ConstructionGroup } from '@/construction/elements'
import type { WallCornerInfo } from '@/construction/walls'
import type { WallLayersConfig } from '@/construction/walls/types'
import type { WallContext } from '@/construction/walls/corners/corners'
import type { WallStoreyContext } from '@/construction/walls/segmentation'

import { constructWallLayers } from './layers'

const mockAssemblies = new Map<string, { layers: WallLayersConfig }>()

let wallContext: WallContext
let cornerInfo: WallCornerInfo

vi.mock('@/construction/config', () => ({
  getConfigActions: () => ({
    getWallAssemblyById: (id: string) => mockAssemblies.get(id) ?? null,
    getRingBeamAssemblyById: () => null
  })
}))

vi.mock('@/construction/walls/corners/corners', () => ({
  getWallContext: () => wallContext,
  calculateWallCornerInfo: () => cornerInfo
}))

const createWall = (overrides: Partial<PerimeterWall> = {}): PerimeterWall => ({
  id: 'wall-current',
  thickness: 300,
  wallAssemblyId: 'assembly-current',
  openings: [],
  insideLength: 3000,
  outsideLength: 3000,
  wallLength: 3000,
  insideLine: {
    start: vec2.fromValues(0, 0),
    end: vec2.fromValues(3000, 0)
  },
  outsideLine: {
    start: vec2.fromValues(0, 300),
    end: vec2.fromValues(3000, 300)
  },
  direction: vec2.fromValues(1, 0),
  outsideDirection: vec2.fromValues(0, 1),
  ...overrides
})

const createPerimeter = (wall: PerimeterWall, overrides: Partial<Perimeter> = {}): Perimeter => ({
  id: 'perimeter-1',
  storeyId: 'storey-1',
  walls: [wall],
  corners: [],
  ...overrides
})

const createCorner = (overrides: Partial<PerimeterCorner>): PerimeterCorner => ({
  id: 'corner',
  insidePoint: vec2.fromValues(0, 0),
  outsidePoint: vec2.fromValues(0, 300),
  constructedByWall: 'next',
  interiorAngle: 90,
  exteriorAngle: 270,
  ...overrides
})

const storeyContext: WallStoreyContext = {
  storeyHeight: 3000,
  floorTopOffset: 0,
  ceilingBottomOffset: 0
}

const baseLayers: WallLayersConfig = {
  insideThickness: 30,
  insideLayers: [
    {
      type: 'monolithic',
      material: 'mat-inside',
      thickness: 30
    }
  ],
  outsideThickness: 20,
  outsideLayers: [
    {
      type: 'monolithic',
      material: 'mat-outside',
      thickness: 20
    }
  ]
}

const applyAssemblies = () => {
  mockAssemblies.clear()
  const assembly = { layers: baseLayers }
  mockAssemblies.set('assembly-current', assembly)
  mockAssemblies.set('assembly-previous', assembly)
  mockAssemblies.set('assembly-next', assembly)
}

const fetchElements = (modelGroup: ConstructionGroup): ConstructionElement[] => {
  return modelGroup.children.filter((child): child is ConstructionElement => 'shape' in child)
}

describe('constructWallLayers', () => {
  beforeEach(() => {
    applyAssemblies()

    const wall = createWall()
    const previousWall = createWall({ id: 'wall-previous', wallAssemblyId: 'assembly-previous' })
    const nextWall = createWall({ id: 'wall-next', wallAssemblyId: 'assembly-next' })

    const startCorner = createCorner({
      id: 'corner-start',
      insidePoint: vec2.fromValues(0, 0),
      outsidePoint: vec2.fromValues(0, 300),
      constructedByWall: 'next'
    })
    const endCorner = createCorner({
      id: 'corner-end',
      insidePoint: vec2.fromValues(3000, 0),
      outsidePoint: vec2.fromValues(3000, 300),
      constructedByWall: 'previous'
    })

    wallContext = {
      startCorner,
      endCorner,
      previousWall,
      nextWall
    }

    cornerInfo = {
      startCorner: {
        id: startCorner.id,
        constructedByThisWall: true,
        extensionDistance: 0
      },
      endCorner: {
        id: endCorner.id,
        constructedByThisWall: true,
        extensionDistance: 0
      },
      extensionStart: 0,
      constructionLength: wall.wallLength,
      extensionEnd: 0
    }
  })

  it('creates extruded polygons for inside and outside layers', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)

    expect(model.elements).toHaveLength(1)
    const group = model.elements[0] as ConstructionGroup
    const elements = fetchElements(group)
    expect(elements).toHaveLength(2)

    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)
    const outside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 20)
    expect(inside).toBeDefined()
    expect(outside).toBeDefined()

    if (!inside || !outside) {
      throw new Error('Expected inside and outside elements')
    }

    expect(inside.shape.polygon.outer.points[0][0]).toBeCloseTo(0)
    expect(inside.shape.polygon.outer.points[2][0]).toBeCloseTo(3000)

    expect(outside.shape.polygon.outer.points[0][0]).toBeCloseTo(0)
    expect(outside.shape.polygon.outer.points[2][0]).toBeCloseTo(3000)

    expect(inside.shape.polygon.outer.points[0][1]).toBeCloseTo(0)
    expect(inside.shape.polygon.outer.points[1][1]).toBeCloseTo(3000)
  })

  it('adds holes for openings', () => {
    const opening: Opening = {
      id: 'opening-1',
      type: 'window',
      offsetFromStart: 1000,
      width: 900,
      height: 1200,
      sillHeight: 900
    }

    const wall = createWall({ openings: [opening] })
    const perimeter = createPerimeter(wall)

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)

    const group = model.elements[0] as ConstructionGroup
    const elements = fetchElements(group)
    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)
    expect(inside).toBeDefined()

    if (!inside) {
      throw new Error('Inside layer was not constructed')
    }

    expect(inside.shape.polygon.holes).toHaveLength(1)
    const hole = inside.shape.polygon.holes[0]
    expect(hole.points[0][0]).toBeCloseTo(1000)
    expect(hole.points[2][0]).toBeCloseTo(1900)
    expect(hole.points[0][1]).toBeCloseTo(900)
    expect(hole.points[1][1]).toBeCloseTo(2100)
  })

  it('extends exterior layers when wall constructs the corner', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    wallContext.startCorner.outsidePoint = vec2.fromValues(-80, 300)
    cornerInfo.startCorner = { ...cornerInfo.startCorner, constructedByThisWall: true, extensionDistance: 80 }

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
    const group = model.elements[0] as ConstructionGroup
    const elements = fetchElements(group)
    const outside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 20)

    expect(outside).toBeDefined()
    if (!outside) {
      throw new Error('Outside layer was not constructed')
    }

    expect(outside.shape.polygon.outer.points[0][0]).toBeCloseTo(-60)
  })

  it('shortens interior layers on inner corners not owned by the wall', () => {
    const wall = createWall()
    const perimeter = createPerimeter(wall)

    wallContext.startCorner.insidePoint = vec2.fromValues(20, 0)
    cornerInfo.startCorner = { ...cornerInfo.startCorner, constructedByThisWall: false, extensionDistance: -10 }

    const model = constructWallLayers(wall, perimeter, storeyContext, baseLayers)
    const group = model.elements[0] as ConstructionGroup
    const elements = fetchElements(group)
    const inside = elements.find(element => element.shape.type === 'polygon' && element.shape.thickness === 30)

    expect(inside).toBeDefined()
    if (!inside) {
      throw new Error('Inside layer was not constructed')
    }

    expect(inside.shape.polygon.outer.points[0][0]).toBeCloseTo(10)
  })
})
