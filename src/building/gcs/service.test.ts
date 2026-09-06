import type { Constraint, SketchLine } from '@salusoft89/planegcs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { IntermediateWallWithGeometry, PerimeterWallWithGeometry } from '@/building/model'
import type { PerimeterId, PerimeterWallId, WallEntityId, WallNodeId } from '@/building/model/ids'
import { partial } from '@/test/helpers'

import { WrappedGcs, filterRedundantAdjacentConstraints } from './service'

const mockModelActions = vi.hoisted(() => ({
  getActiveStoreyId: vi.fn(),
  updatePerimeterBoundary: vi.fn(),
  getPerimeterById: vi.fn(),
  applyGcsWallNodePositions: vi.fn(),
  getPerimeterWallsById: vi.fn(),
  getIntermediateWallsByPerimeter: vi.fn(),
  updateWallOpening: vi.fn(),
  updateWallPost: vi.fn()
}))

vi.mock('@/building/store', () => ({
  getModelActions: () => mockModelActions
}))

vi.mock('@/building/gcs/store', () => ({
  getGcsActions: () => ({ setConstraintStatus: vi.fn(), setTmpPoints: vi.fn() }),
  getGcsState: () => ({ perimeterRegistry: {}, constraintPoints: {}, points: {}, lines: [], constraints: {} })
}))

vi.mock('@/editor/gcs/gcsInstance', () => ({
  createGcs: vi.fn(() => ({
    clear_data: vi.fn(),
    push_primitives_and_params: vi.fn(),
    solve: vi.fn(),
    gcs: { set_p_param: vi.fn() },
    p_param_index: new Map(),
    sketch_index: { get_primitives: vi.fn(() => []) }
  }))
}))

function makeWrappedGcs(points: { id: string; x: number; y: number }[]): WrappedGcs {
  const gcs = {
    clear_data: vi.fn(),
    push_primitives_and_params: vi.fn()
  }

  return new WrappedGcs(
    gcs as never,
    points.map(point => ({ ...point, type: 'point' as const, fixed: false })),
    [],
    [],
    {}
  )
}

describe('WrappedGcs solved model synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies solved wall-node positions through the model batch action', () => {
    const perimeterId = 'perimeter_1' as PerimeterId
    const nodeId = 'wallnode_1' as WallNodeId
    mockModelActions.getPerimeterById.mockReturnValue({
      id: perimeterId,
      wallNodeIds: [nodeId]
    })

    const wrapped = makeWrappedGcs([{ id: `wallnode_${nodeId}_ref`, x: 120, y: 240 }])

    wrapped.applyWallNodePositions(perimeterId)

    expect(mockModelActions.applyGcsWallNodePositions).toHaveBeenCalledWith(perimeterId, {
      [nodeId]: expect.anything()
    })
    const positions = mockModelActions.applyGcsWallNodePositions.mock.calls[0][1]
    expect(Array.from(positions[nodeId] as Float32Array)).toEqual([120, 240])
  })

  it('applies solved entity offsets for perimeter and intermediate walls', () => {
    const perimeterId = 'perimeter_1' as PerimeterId
    const openingId = 'opening_1' as WallEntityId
    const postId = 'post_1' as WallEntityId
    const perimeterWall = partial<PerimeterWallWithGeometry>({
      id: 'outwall_1' as PerimeterWallId,
      entityIds: [openingId],
      insideLine: { start: [0, 0], end: [100, 0] },
      outsideLine: { start: [0, -10], end: [100, -10] },
      direction: [1, 0]
    })
    const intermediateWall = partial<IntermediateWallWithGeometry>({
      id: 'intermediate_1',
      entityIds: [postId],
      entityReferenceLine: { start: [0, 100], end: [0, 200] },
      leftLine: { start: [0, 100], end: [0, 200] },
      direction: [0, 1]
    })

    mockModelActions.getPerimeterById.mockReturnValue({
      id: perimeterId,
      referenceSide: 'inside'
    })
    mockModelActions.getPerimeterWallsById.mockReturnValue([perimeterWall])
    mockModelActions.getIntermediateWallsByPerimeter.mockReturnValue([intermediateWall])

    const wrapped = makeWrappedGcs([
      { id: `${openingId}_center_ref`, x: 40, y: 0 },
      { id: `${postId}_center_ref`, x: 0, y: 140 }
    ])

    wrapped.applyWallEntityOffsets(perimeterId)

    expect(mockModelActions.updateWallOpening).toHaveBeenCalledWith(openingId, {
      centerOffsetFromWallStart: 40
    })
    expect(mockModelActions.updateWallPost).toHaveBeenCalledWith(postId, {
      centerOffsetFromWallStart: 40
    })
  })

  it('installs temporary driving constraints for a point drag', () => {
    const pushPrimitive = vi.fn()
    const wrapped = new WrappedGcs(
      {
        clear_data: vi.fn(),
        push_primitives_and_params: vi.fn(),
        push_primitive: pushPrimitive,
        p_param_index: new Map(),
        gcs: { set_p_param: vi.fn() }
      } as never,
      [{ id: 'endpoint_a', type: 'point', x: 10, y: 20, fixed: false }],
      [],
      [],
      {}
    )

    expect(wrapped.startPointDrag('endpoint_a')).toEqual(new Float32Array([10, 20]))

    expect(pushPrimitive).toHaveBeenCalledTimes(2)
    expect(pushPrimitive.mock.calls.map(([constraint]) => constraint)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'equal',
          param1: { o_id: 'endpoint_a', prop: 'x' },
          temporary: true,
          driving: true
        }),
        expect.objectContaining({
          type: 'equal',
          param1: { o_id: 'endpoint_a', prop: 'y' },
          temporary: true,
          driving: true
        })
      ])
    )
  })
})

describe('filterRedundantAdjacentConstraints', () => {
  const lines: SketchLine[] = [
    { id: 'wall_intermediate_horizontal_a_ref', type: 'line', p1_id: 'a1', p2_id: 'a2' },
    { id: 'wall_intermediate_horizontal_b_ref', type: 'line', p1_id: 'b1', p2_id: 'b2' },
    { id: 'wall_intermediate_vertical_ref', type: 'line', p1_id: 'c1', p2_id: 'c2' }
  ]

  const constraints: Record<string, Constraint> = {
    horizontal_a: { id: 'horizontal_a', type: 'horizontal_l', l_id: lines[0].id },
    horizontal_b: { id: 'horizontal_b', type: 'horizontal_l', l_id: lines[1].id },
    vertical: { id: 'vertical', type: 'vertical_l', l_id: lines[2].id },
    horizontal_a_attachment: {
      id: 'horizontal_a_attachment',
      type: 'point_on_line_pl',
      p_id: 'wallnode_shared_ref',
      l_id: lines[0].id
    },
    horizontal_b_attachment: {
      id: 'horizontal_b_attachment',
      type: 'point_on_line_pl',
      p_id: 'wallnode_shared_ref',
      l_id: lines[1].id
    },
    vertical_attachment: {
      id: 'vertical_attachment',
      type: 'point_on_line_pl',
      p_id: 'wallnode_shared_ref',
      l_id: lines[2].id
    }
  }

  it('filters duplicate attachments for aligned wall lines', () => {
    const result = filterRedundantAdjacentConstraints(constraints, lines)

    expect(result).toHaveProperty('horizontal_a_attachment')
    expect(result).not.toHaveProperty('horizontal_b_attachment')
    expect(result).toHaveProperty('vertical_attachment')
  })

  it('does not filter attachments on different nodes or axes', () => {
    const result = filterRedundantAdjacentConstraints(
      {
        horizontal_a: constraints.horizontal_a,
        vertical: constraints.vertical,
        horizontal_a_attachment: constraints.horizontal_a_attachment,
        horizontal_other_node_attachment: {
          id: 'horizontal_other_node_attachment',
          type: 'point_on_line_pl',
          p_id: 'wallnode_other_ref',
          l_id: lines[0].id
        },
        vertical_attachment: constraints.vertical_attachment
      },
      lines
    )

    expect(result).toHaveProperty('horizontal_a_attachment')
    expect(result).toHaveProperty('horizontal_other_node_attachment')
    expect(result).toHaveProperty('vertical_attachment')
  })
})
