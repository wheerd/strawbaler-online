import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FloorArea, FloorOpening, Perimeter } from '@/building/model'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { newVec2 } from '@/shared/geometry'

import { FloorOpeningTool } from './FloorOpeningTool'

const mockModelActions = {
  addFloorArea: vi.fn(),
  addFloorOpening: vi.fn(),
  getActiveStoreyId: vi.fn(() => 'storey_opening'),
  getPerimetersByStorey: vi.fn(() => [] as Perimeter[]),
  getFloorAreasByStorey: vi.fn(() => [] as FloorArea[]),
  getFloorOpeningsByStorey: vi.fn(() => [] as FloorOpening[])
}

vi.mock('@/building/store', () => ({
  getModelActions: () => mockModelActions
}))

describe('FloorOpeningTool', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModelActions.getActiveStoreyId.mockReturnValue('storey_opening')
    mockModelActions.getPerimetersByStorey.mockReturnValue([])
    mockModelActions.getFloorAreasByStorey.mockReturnValue([])
    mockModelActions.getFloorOpeningsByStorey.mockReturnValue([])
  })

  it('calls addFloorOpening when polygon is completed', () => {
    const toolSystem = new ToolSystem()
    const tool = new FloorOpeningTool(toolSystem)
    const points = [newVec2(10, 10), newVec2(50, 10), newVec2(50, 50)]
    tool.state.points = points
    tool.state.isClosingSegmentValid = true

    tool.complete()

    expect(mockModelActions.addFloorOpening).toHaveBeenCalledTimes(1)
    expect(mockModelActions.addFloorOpening).toHaveBeenCalledWith('storey_opening', { points })
  })
})
