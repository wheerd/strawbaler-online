import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StoreyId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { Bounds2D, newVec2 } from '@/shared/geometry'

import { FitToViewTool } from './FitToViewTool'

vi.mock('@/editor/canvas/state/viewportStore')
vi.mock('@/building/store')

describe('FitToViewTool', () => {
  let toolSystem: ToolSystem
  let fitToViewTool: FitToViewTool
  let mockGetBounds: ReturnType<typeof vi.fn>
  let mockFitToView: ReturnType<typeof vi.fn>

  beforeEach(() => {
    toolSystem = new ToolSystem()
    fitToViewTool = new FitToViewTool(toolSystem)

    mockGetBounds = vi.fn()
    mockFitToView = vi.fn()

    const mockedGetModelActions = vi.mocked(getModelActions)
    mockedGetModelActions.mockReturnValue({
      getActiveStoreyId: () => 'floor1' as StoreyId,
      getBounds: mockGetBounds
    } as any)

    const mockedViewportActions = vi.mocked(viewportActions)
    mockedViewportActions.mockReturnValue({
      fitToView: mockFitToView
    } as any)
  })

  it('should have correct id', () => {
    expect(fitToViewTool.id).toBe('basic.fit-to-view')
  })

  it('should perform fit to view', () => {
    const bounds = Bounds2D.fromMinMax(newVec2(0, 0), newVec2(100, 100))
    mockGetBounds.mockReturnValue(bounds)

    fitToViewTool.onActivate()

    expect(mockGetBounds).toHaveBeenCalledWith('floor1')
    expect(mockFitToView).toHaveBeenCalledWith(bounds)
  })

  it('should handle empty bounds gracefully', () => {
    mockGetBounds.mockReturnValue(Bounds2D.EMPTY)

    const consoleSpy = vi.spyOn(console, 'log')

    fitToViewTool.onActivate()

    expect(consoleSpy).toHaveBeenCalledWith('No entities to fit - no bounds available')
    expect(mockFitToView).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
