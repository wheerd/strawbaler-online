import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getModelActions } from '@/building/store'
import { findEditorEntityAt } from '@/editor/canvas/services/editorHitTesting'
import { getSelectionActions } from '@/editor/canvas/state/selectionStore'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { newVec2 } from '@/shared/geometry'

import { AddOpeningTool } from './AddOpeningTool'

vi.mock('@/building/store', () => ({ getModelActions: vi.fn() }))
vi.mock('@/config/store', () => ({ getConfigActions: vi.fn(() => ({})) }))
vi.mock('@/editor/canvas/services/editorHitTesting', () => ({ findEditorEntityAt: vi.fn() }))
vi.mock('@/editor/canvas/state/selectionStore', () => ({
  getSelectionActions: vi.fn(() => ({ clearSelection: vi.fn(), pushSelection: vi.fn() }))
}))
vi.mock('@/editor/canvas/state/viewModeStore', () => ({ getViewModeActions: vi.fn(() => ({ ensureMode: vi.fn() })) }))

const getModelActionsMock = vi.mocked(getModelActions)
const findEditorEntityAtMock = vi.mocked(findEditorEntityAt)
const getSelectionActionsMock = vi.mocked(getSelectionActions)
const getViewModeActionsMock = vi.mocked(getViewModeActions)

describe('AddOpeningTool', () => {
  let addOpeningTool: AddOpeningTool
  let toolSystem: ToolSystem

  beforeEach(() => {
    vi.clearAllMocks()
    toolSystem = new ToolSystem()
    addOpeningTool = new AddOpeningTool(toolSystem)
  })

  it('should have correct id', () => {
    expect(addOpeningTool.id).toBe('perimeter.add-opening')
  })

  it('should initialize with default door configuration', () => {
    expect(addOpeningTool.state.openingType).toBe('door')
    expect(addOpeningTool.state.width).toBe(800)
    expect(addOpeningTool.state.height).toBe(2100)
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  it('should reset state on activation', () => {
    // Set some non-default state
    addOpeningTool.state.hoveredWall = {} as any
    addOpeningTool.state.previewPosition = newVec2(100, 200)
    addOpeningTool.state.canPlace = true

    addOpeningTool.onActivate()

    expect(addOpeningTool.state.hoveredWall).toBeUndefined()
    expect(addOpeningTool.state.previewPosition).toBeUndefined()
    expect(addOpeningTool.state.canPlace).toBe(false)
  })

  describe('configuration methods', () => {
    it('should update opening type and apply defaults', () => {
      addOpeningTool.setOpeningType('window')

      expect(addOpeningTool.state.openingType).toBe('window')
      expect(addOpeningTool.state.width).toBe(1200)
      expect(addOpeningTool.state.height).toBe(1200)
      expect(addOpeningTool.state.sillHeight).toBe(800)
    })

    it('should update width', () => {
      const newWidth = 1000
      addOpeningTool.setWidth(newWidth)

      expect(addOpeningTool.state.width).toBe(newWidth)
    })

    it('should update height', () => {
      const newHeight = 2400
      addOpeningTool.setHeight(newHeight)

      expect(addOpeningTool.state.height).toBe(newHeight)
    })

    it('should update sill height', () => {
      const newSillHeight = 1000
      addOpeningTool.setSillHeight(newSillHeight)

      expect(addOpeningTool.state.sillHeight).toBe(newSillHeight)
    })

    it('should clear sill height when set to undefined', () => {
      addOpeningTool.state.sillHeight = 800
      addOpeningTool.setSillHeight(undefined)

      expect(addOpeningTool.state.sillHeight).toBeUndefined()
    })
  })

  it('should register and unregister render listeners', () => {
    const mockListener = vi.fn()

    const unregister = addOpeningTool.onRenderNeeded(mockListener)

    // Trigger render
    addOpeningTool.setOpeningType('window')

    expect(mockListener).toHaveBeenCalled()

    // Unregister
    unregister()

    // Clear call history
    mockListener.mockClear()

    // Trigger render again
    addOpeningTool.setOpeningType('door')

    expect(mockListener).not.toHaveBeenCalled()
  })

  it('should place an opening on an intermediate wall', () => {
    const addWallOpening = vi.fn(() => ({ id: 'opening_1', perimeterId: 'perimeter_1', wallId: 'intermediate_1' }))
    getModelActionsMock.mockReturnValue({
      getIntermediateWallById: vi.fn(() => ({
        id: 'intermediate_1',
        perimeterId: 'perimeter_1',
        thickness: 120,
        wallLength: 6000,
        entityReferenceLine: { start: newVec2(0, 0), end: newVec2(6000, 0) },
        direction: newVec2(1, 0)
      })),
      findNearestValidWallOpeningPosition: vi.fn(() => 2000),
      addWallOpening
    } as any)
    findEditorEntityAtMock.mockReturnValue({
      entityId: 'intermediate_1',
      entityType: 'intermediate-wall',
      parentIds: ['perimeter_1', 'intermediate_1']
    })

    const event = { worldCoordinates: newVec2(2000, 0), originalEvent: { clientX: 0, clientY: 0 } } as any
    addOpeningTool.handlePointerMove(event)
    addOpeningTool.handlePointerDown(event)

    expect(addWallOpening).toHaveBeenCalledWith(
      'intermediate_1',
      expect.objectContaining({ centerOffsetFromWallStart: 2000, width: 800 })
    )
    expect(getSelectionActionsMock).toHaveBeenCalled()
    expect(getViewModeActionsMock).not.toHaveBeenCalled()
  })
})
