import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type PerimeterCornerWithGeometry, type PerimeterWithGeometry } from '@/building/model'
import { type StoreActions, getModelActions } from '@/building/store'
import { replaceSelection } from '@/editor/canvas/state/selectionStore'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { Bounds2D, newVec2 } from '@/shared/geometry'
import { partial } from '@/test/helpers'

import { PerimeterPresetTool } from './PerimeterPresetTool'
import { LShapedPreset } from './presets/LShapedPreset'
import { RectangularPreset } from './presets/RectangularPreset'
import type { RectangularPresetConfig } from './presets/types'

describe('PerimeterPresetTool', () => {
  vi.mock('@/building/store', () => ({ getModelActions: vi.fn() }))
  vi.mock('@/editor/canvas/state/selectionStore', () => ({ replaceSelection: vi.fn() }))
  vi.mock('@/editor/canvas/state/viewportStore', () => ({ viewportActions: vi.fn() }))
  vi.mock('@/building/gcs/constraintGenerator', () => ({ generatePresetConstraints: vi.fn(() => []) }))

  const mockGetModelActions = vi.mocked(getModelActions)
  const mockViewportActions = vi.mocked(viewportActions)

  const mockGetActiveStoreyId = vi.fn<StoreActions['getActiveStoreyId']>()
  const mockAddPerimeter = vi.fn<StoreActions['addPerimeter']>()
  const mockGetPerimeterCornersById = vi.fn<StoreActions['getPerimeterCornersById']>()
  const mockGetPerimeterWallsById = vi.fn<StoreActions['getPerimeterWallsById']>()
  const mockAddBuildingConstraint = vi.fn<StoreActions['addBuildingConstraint']>()
  const mockReplaceSelection = vi.mocked(replaceSelection)
  const mockFitToView = vi.fn()

  const mockPerimeter = partial<PerimeterWithGeometry>({
    id: 'perimeter_mock',
    outerPolygon: {
      points: [newVec2(1, 1), newVec2(2, 2), newVec2(3, 3)]
    }
  })

  let tool: PerimeterPresetTool
  let toolSystem: ToolSystem

  beforeEach(() => {
    toolSystem = new ToolSystem()
    tool = new PerimeterPresetTool(toolSystem)

    vi.resetAllMocks()
    mockGetModelActions.mockReturnValue({
      getActiveStoreyId: mockGetActiveStoreyId,
      addPerimeter: mockAddPerimeter,
      getPerimeterCornersById: mockGetPerimeterCornersById,
      getPerimeterWallsById: mockGetPerimeterWallsById,
      addBuildingConstraint: mockAddBuildingConstraint
    } as any)
    mockViewportActions.mockReturnValue({ fitToView: mockFitToView } as any)
    mockAddPerimeter.mockReturnValue(mockPerimeter)
    mockGetActiveStoreyId.mockReturnValue('storey_active')
    mockGetPerimeterCornersById.mockReturnValue([partial<PerimeterCornerWithGeometry>({ id: 'outcorner_1' })])
    mockGetPerimeterWallsById.mockReturnValue([])
  })

  describe('initialization', () => {
    it('should have correct id', () => {
      expect(tool.id).toBe('perimeter.preset')
    })

    it('should have available presets', () => {
      const presets = tool.availablePresets
      expect(presets).toHaveLength(2)
      expect(presets[0]).toBeInstanceOf(RectangularPreset)
      expect(presets[1]).toBeInstanceOf(LShapedPreset)
    })
  })

  describe('placing perimeter', () => {
    const rectangularPreset = new RectangularPreset()
    const config: RectangularPresetConfig = {
      width: 4000,
      length: 6000,
      thickness: 420,
      baseRingBeamAssemblyId: 'ringbeam_base',
      topRingBeamAssemblyId: 'ringbeam_top',
      wallAssemblyId: 'wa_mock',
      referenceSide: 'inside'
    }

    it('should create perimeter in active storey', () => {
      mockGetActiveStoreyId.mockReturnValue('storey_active')

      tool.placePerimeter(rectangularPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        'storey_active',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should create perimeter with normalized preset polygon', () => {
      const mockPreset = {
        getPolygonPoints: vi.fn(_config => [newVec2(1, 1), newVec2(2, 1), newVec2(1, 3)])
      } as any

      tool.placePerimeter(mockPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        expect.anything(),
        { points: [newVec2(0, 2), newVec2(1, 0), newVec2(0, 0)] },
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything()
      )
    })

    it('should create perimeter with config params', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockAddPerimeter).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        config.wallAssemblyId,
        config.thickness,
        config.baseRingBeamAssemblyId,
        config.topRingBeamAssemblyId,
        config.referenceSide
      )
    })

    it('should select created perimeter', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockReplaceSelection).toHaveBeenCalledWith([mockPerimeter.id])
    })

    it('should focus created perimeter', () => {
      tool.placePerimeter(rectangularPreset, config)

      expect(mockFitToView).toHaveBeenCalledWith(Bounds2D.fromMinMax(newVec2(1, 1), newVec2(3, 3)))
    })

    it('should deactivate tool', () => {
      const popToolSpy = vi.spyOn(toolSystem, 'popTool')

      tool.placePerimeter(rectangularPreset, config)

      expect(popToolSpy).toHaveBeenCalled()
    })
  })

  describe('lifecycle assemblies', () => {
    vi.mock('@/editor/canvas/state/viewModeStore', () => ({ getViewModeActions: vi.fn() }))
    const mockGetViewModeActions = vi.mocked(getViewModeActions)
    it('should switch to wall mode on activation', () => {
      const mockEnsureMode = vi.fn()
      mockGetViewModeActions.mockReturnValue({ ensureMode: mockEnsureMode } as any)

      tool.onActivate()

      expect(mockEnsureMode).toHaveBeenCalledWith('walls')
    })
  })
})
