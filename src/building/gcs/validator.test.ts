import type { Constraint as GcsConstraint, SketchLine, SketchPoint } from '@salusoft89/planegcs'
import { describe, expect, it } from 'vitest'

import type {
  IntermediateWallId,
  Perimeter,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  StoreyId
} from '@/building/model'
import type { WallEntityId } from '@/building/model/ids'

import { wallEntityOnLineConstraintId, wallEntityWidthConstraintId } from './constraintTranslator'
import { validateSolution } from './validator'

const perimeterId = 'perimeter_test' as PerimeterId
const cornerIds = ['outcorner_a', 'outcorner_b', 'outcorner_c', 'outcorner_d'] as PerimeterCornerId[]
const perimeterWallIds = ['outwall_a', 'outwall_b', 'outwall_c', 'outwall_d'] as PerimeterWallId[]
const intermediateWallId = 'intermediate_test' as IntermediateWallId

function point(id: string, x: number, y: number): SketchPoint {
  return { id, type: 'point', x, y, fixed: false }
}

function line(id: string, p1Id: string, p2Id: string): SketchLine {
  return { id, type: 'line', p1_id: p1Id, p2_id: p2Id }
}

function makePerimeter(): Perimeter {
  return {
    id: perimeterId,
    storeyId: 'storey_test' as StoreyId,
    wallIds: perimeterWallIds,
    cornerIds,
    roomIds: [],
    wallNodeIds: [],
    intermediateWallIds: [intermediateWallId],
    referenceSide: 'inside'
  }
}

function makeLines(): Record<string, SketchLine> {
  return {
    wall_outwall_a_ref: line('wall_outwall_a_ref', 'corner_outcorner_a_ref', 'corner_outcorner_b_ref'),
    wall_outwall_b_ref: line('wall_outwall_b_ref', 'corner_outcorner_b_ref', 'corner_outcorner_c_ref'),
    wall_outwall_c_ref: line('wall_outwall_c_ref', 'corner_outcorner_c_ref', 'corner_outcorner_d_ref'),
    wall_outwall_d_ref: line('wall_outwall_d_ref', 'corner_outcorner_d_ref', 'corner_outcorner_a_ref'),
    wall_intermediate_test_ref: line(
      'wall_intermediate_test_ref',
      'intermediate_test_start_ref',
      'intermediate_test_end_ref'
    ),
    wall_intermediate_test_nonref: line(
      'wall_intermediate_test_nonref',
      'intermediate_test_start_nonref',
      'intermediate_test_end_nonref'
    )
  }
}

function makePoints(endX = 5): Record<string, SketchPoint> {
  return {
    corner_outcorner_a_ref: point('corner_outcorner_a_ref', 0, 0),
    corner_outcorner_b_ref: point('corner_outcorner_b_ref', 100, 0),
    corner_outcorner_c_ref: point('corner_outcorner_c_ref', 100, 100),
    corner_outcorner_d_ref: point('corner_outcorner_d_ref', 0, 100),
    corner_outcorner_a_nonref_next: point('corner_outcorner_a_nonref_next', 0, -10),
    corner_outcorner_a_nonref_prev: point('corner_outcorner_a_nonref_prev', 0, -10),
    corner_outcorner_b_nonref_next: point('corner_outcorner_b_nonref_next', 110, 0),
    corner_outcorner_b_nonref_prev: point('corner_outcorner_b_nonref_prev', 110, 0),
    corner_outcorner_c_nonref_next: point('corner_outcorner_c_nonref_next', 100, 110),
    corner_outcorner_c_nonref_prev: point('corner_outcorner_c_nonref_prev', 100, 110),
    corner_outcorner_d_nonref_next: point('corner_outcorner_d_nonref_next', -10, 100),
    corner_outcorner_d_nonref_prev: point('corner_outcorner_d_nonref_prev', -10, 100),
    intermediate_test_start_ref: point('intermediate_test_start_ref', 50, 20),
    intermediate_test_end_ref: point('intermediate_test_end_ref', endX, 80),
    intermediate_test_start_nonref: point('intermediate_test_start_nonref', 51, 20),
    intermediate_test_end_nonref: point('intermediate_test_end_nonref', endX + 1, 80),
    intermediate_test_start_proj: point('intermediate_test_start_proj', 50.64, 20.85),
    intermediate_test_end_proj: point('intermediate_test_end_proj', endX + 0.64, 79.15)
  }
}

function makeEntityConstraints(entityId: WallEntityId): Record<string, GcsConstraint> {
  return {
    [wallEntityOnLineConstraintId(entityId, 'center')]: {
      id: wallEntityOnLineConstraintId(entityId, 'center'),
      type: 'point_on_line_pl',
      p_id: `${entityId}_center_ref`,
      l_id: 'wall_intermediate_test_ref',
      driving: true
    },
    [wallEntityWidthConstraintId(entityId)]: {
      id: wallEntityWidthConstraintId(entityId),
      type: 'p2p_distance',
      p1_id: `${entityId}_start_ref`,
      p2_id: `${entityId}_end_ref`,
      distance: 10,
      driving: true
    }
  }
}

describe('validateSolution dynamic wall geometry', () => {
  it('accepts wall lines reconstructed from candidate GCS points', () => {
    const result = validateSolution([makePerimeter()], makePoints(), {}, makeLines())

    expect(result).toEqual({ valid: true })
  })

  it('rejects a wall after its candidate endpoint moves outside the deformed polygon', () => {
    const result = validateSolution([makePerimeter()], makePoints(120), {}, makeLines())

    expect(result).toEqual({ valid: false, reason: 'Intermediate wall geometry violation' })
  })

  it('validates an opening on an intermediate wall from GCS geometry', () => {
    const entityId = 'opening_intermediate' as WallEntityId
    const points = {
      ...makePoints(),
      [`${entityId}_center_ref`]: point(`${entityId}_center_ref`, 27.5, 50)
    }

    const result = validateSolution([makePerimeter()], points, makeEntityConstraints(entityId), makeLines())

    expect(result).toEqual({ valid: true })
  })

  it('rejects a post outside an intermediate wall using GCS geometry', () => {
    const entityId = 'post_intermediate' as WallEntityId
    const points = {
      ...makePoints(),
      [`${entityId}_center_ref`]: point(`${entityId}_center_ref`, 0, 87)
    }

    const result = validateSolution([makePerimeter()], points, makeEntityConstraints(entityId), makeLines())

    expect(result).toEqual({ valid: false, reason: 'Wall entity position violation' })
  })

  it('validates intermediate entities against the side-line overlap, not extended endpoints', () => {
    const entityId = 'opening_overlap' as WallEntityId
    const points = {
      ...makePoints(),
      [`${entityId}_center_ref`]: point(`${entityId}_center_ref`, 50, 20)
    }

    const invalid = validateSolution([makePerimeter()], points, makeEntityConstraints(entityId), makeLines())
    expect(invalid).toEqual({ valid: false, reason: 'Wall entity position violation' })

    points[`${entityId}_center_ref`] = point(`${entityId}_center_ref`, 27.5, 50)
    expect(validateSolution([makePerimeter()], points, makeEntityConstraints(entityId), makeLines())).toEqual({
      valid: true
    })
  })
})
