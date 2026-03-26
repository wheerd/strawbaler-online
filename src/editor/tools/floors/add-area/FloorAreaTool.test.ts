import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FloorArea, FloorOpening, Perimeter } from '@/building/model'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { newVec2 } from '@/shared/geometry'

import { FloorAreaTool } from './FloorAreaTool'

const mockModelActions = {
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn(),
  getActiveStoreyId: vi.fn(() => 'storey_1'),
  getPerimetersByStorey: vi.fn(() => [] as Perimeter[]),
  getFloorAreasByStorey: vi.fn(() => [] as FloorArea[]),
  getFloorOpeningsByStorey: vi.fn(() => [] as FloorOpening[])
}

vi.mock('@/building/store', () => ({
  getModelActions: () => mockModelActions
}))

describe('FloorAreaTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModelActions.getActiveStoreyId.mockReturnValue('storey_1')
    mockModelActions.getPerimetersByStorey.mockReturnValue([])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([])
  })

  it('calls addFloorArea when polygon is completed', () => {
    const toolSystem = new ToolSystem()
    const tool = new FloorAreaTool(toolSystem)
    const points = [newVec2(0, 0), newVec2(100, 0), newVec2(100, 100)]
    tool.state.points = points
    tool.state.isClosingSegmentValid = true

    tool.complete()

    expect(mockModelActions.addFloorArea).toHaveBeenCalledTimes(1)
    expect(mockModelActions.addFloorArea).toHaveBeenCalledWith('storey_1', { points })
  })
})
