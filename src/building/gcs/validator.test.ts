import type { SketchLine, SketchPoint } from '@salusoft89/planegcs'
import { describe, expect, it } from 'vitest'

import type {
  IntermediateWallId,
  Perimeter,
  PerimeterCornerId,
  PerimeterId,
  PerimeterWallId,
  StoreyId
} from '@/building/model'

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
    wall_intermediate_test_ref: line('wall_intermediate_test_ref', 'intermediate_start_ref', 'intermediate_end_ref'),
    wall_intermediate_test_nonref: line(
      'wall_intermediate_test_nonref',
      'intermediate_start_nonref',
      'intermediate_end_nonref'
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
    intermediate_start_ref: point('intermediate_start_ref', 50, 20),
    intermediate_end_ref: point('intermediate_end_ref', endX, 80),
    intermediate_start_nonref: point('intermediate_start_nonref', 51, 20),
    intermediate_end_nonref: point('intermediate_end_nonref', endX + 1, 80)
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
})
