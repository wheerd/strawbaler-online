import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getModelActions } from '@/building/store'
import { findEditorEntityAt } from '@/editor/canvas/services/editorHitTesting'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { newVec2 } from '@/shared/geometry'

import { AddPostTool } from './AddPostTool'

vi.mock('@/building/store', () => ({ getModelActions: vi.fn() }))
vi.mock('@/editor/canvas/services/editorHitTesting', () => ({ findEditorEntityAt: vi.fn() }))
vi.mock('@/editor/canvas/state/selectionStore', () => ({
  getSelectionActions: vi.fn(() => ({ clearSelection: vi.fn(), pushSelection: vi.fn() }))
}))
vi.mock('@/editor/canvas/state/viewModeStore', () => ({ getViewModeActions: vi.fn(() => ({ ensureMode: vi.fn() })) }))

const getModelActionsMock = vi.mocked(getModelActions)
const findEditorEntityAtMock = vi.mocked(findEditorEntityAt)

describe('AddPostTool', () => {
  let tool: AddPostTool

  beforeEach(() => {
    vi.clearAllMocks()
    tool = new AddPostTool(new ToolSystem())
  })

  it('should place a post on an intermediate wall', () => {
    const addWallPost = vi.fn(() => ({ id: 'post_1', perimeterId: 'perimeter_1', wallId: 'intermediate_1' }))
    getModelActionsMock.mockReturnValue({
      getIntermediateWallById: vi.fn(() => ({
        id: 'intermediate_1',
        perimeterId: 'perimeter_1',
        thickness: 120,
        wallLength: 6000,
        centerLine: { start: newVec2(0, 0), end: newVec2(6000, 0) },
        direction: newVec2(1, 0)
      })),
      findNearestValidWallPostPosition: vi.fn(() => 2000),
      addWallPost
    } as any)
    findEditorEntityAtMock.mockReturnValue({
      entityId: 'intermediate_1',
      entityType: 'intermediate-wall',
      parentIds: ['perimeter_1', 'intermediate_1']
    })

    const event = { worldCoordinates: newVec2(2000, 0), originalEvent: { clientX: 0, clientY: 0 } } as any
    tool.handlePointerMove(event)
    tool.handlePointerDown(event)

    expect(addWallPost).toHaveBeenCalledWith(
      'intermediate_1',
      expect.objectContaining({ centerOffsetFromWallStart: 2000, width: 60 })
    )
  })
})
