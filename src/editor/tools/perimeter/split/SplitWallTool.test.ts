import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPerimeterId, createPerimeterWallId } from '@/building/model/ids'
import type { PerimeterWall } from '@/building/model/model'
import { createLength, createVec2 } from '@/shared/geometry'

import { SplitWallTool } from './SplitWallTool'

// Simple mocks
vi.mock('@/building/store')
vi.mock('@/editor/hooks/useSelectionStore')
vi.mock('@/editor/services/length-input')
vi.mock('@/editor/canvas/services/EntityHitTestService')

describe('SplitWallTool', () => {
  let tool: SplitWallTool

  beforeEach(() => {
    tool = new SplitWallTool()
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    expect(tool.state.selectedWallId).toBeNull()
    expect(tool.state.selectedPerimeterId).toBeNull()
    expect(tool.state.targetPosition).toBeNull()
    expect(tool.state.isValidSplit).toBe(false)
  })

  it('should set target wall and calculate middle position', () => {
    const perimeterId = createPerimeterId()
    const wallId = createPerimeterWallId()

    // Mock wall with 1000mm length
    const mockWall: PerimeterWall = {
      id: wallId,
      thickness: createLength(440),
      constructionMethodId: 'method1' as any,
      openings: [],
      insideLength: createLength(1000),
      outsideLength: createLength(1000),
      wallLength: createLength(1000),
      insideLine: {
        start: createVec2(0, 0),
        end: createVec2(1000, 0)
      },
      outsideLine: {
        start: createVec2(0, 440),
        end: createVec2(1000, 440)
      },
      direction: createVec2(1, 0),
      outsideDirection: createVec2(0, 1)
    }

    // Mock the getSelectedWall method by temporarily overriding it
    const originalGetSelectedWall = tool['getSelectedWall']
    tool['getSelectedWall'] = vi.fn(() => mockWall)

    tool.setTargetWall(perimeterId, wallId)

    expect(tool.state.selectedWallId).toBe(wallId)
    expect(tool.state.selectedPerimeterId).toBe(perimeterId)
    expect(tool.state.targetPosition).toBe(500) // Middle of 1000mm wall

    // Restore original method
    tool['getSelectedWall'] = originalGetSelectedWall
  })

  it('should validate split positions correctly', () => {
    const perimeterId = createPerimeterId()
    const wallId = createPerimeterWallId()

    const mockWall: PerimeterWall = {
      id: wallId,
      thickness: createLength(440),
      constructionMethodId: 'method1' as any,
      openings: [
        {
          id: 'opening1' as any,
          type: 'door',
          width: createLength(800),
          height: createLength(2000),
          offsetFromStart: createLength(200),
          sillHeight: createLength(0)
        }
      ],
      insideLength: createLength(2000),
      outsideLength: createLength(2000),
      wallLength: createLength(2000),
      insideLine: {
        start: createVec2(0, 0),
        end: createVec2(2000, 0)
      },
      outsideLine: {
        start: createVec2(0, 440),
        end: createVec2(2000, 440)
      },
      direction: createVec2(1, 0),
      outsideDirection: createVec2(0, 1)
    }

    // Mock the getSelectedWall method
    tool['getSelectedWall'] = vi.fn(() => mockWall)

    tool.setTargetWall(perimeterId, wallId)

    // Test valid position (before opening)
    tool.updateTargetPosition(createLength(100))
    expect(tool.state.isValidSplit).toBe(true)

    // Test invalid position (inside opening: 200-1000mm)
    tool.updateTargetPosition(createLength(500))
    expect(tool.state.isValidSplit).toBe(false)
    expect(tool.state.validationError).toContain('door opening')

    // Test valid position (after opening)
    tool.updateTargetPosition(createLength(1500))
    expect(tool.state.isValidSplit).toBe(true)

    // Test invalid positions at boundaries
    tool.updateTargetPosition(createLength(0))
    expect(tool.state.isValidSplit).toBe(false)

    tool.updateTargetPosition(createLength(2000))
    expect(tool.state.isValidSplit).toBe(false)
  })

  it('should have proper tool metadata', () => {
    expect(tool.id).toBe('perimeter.split-wall')
    expect(tool.overlayComponent).toBeDefined()
    expect(tool.inspectorComponent).toBeDefined()
  })
})
