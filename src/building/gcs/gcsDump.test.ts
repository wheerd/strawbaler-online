import { Algorithm, DebugMode, GcsWrapper, SolveStatus, init_planegcs_module } from '@salusoft89/planegcs'
import type { SketchLine, SketchPoint, SketchPrimitive } from '@salusoft89/planegcs'
import planegcsWasmUrl from '@salusoft89/planegcs/dist/planegcs_dist/planegcs.wasm?url'
import fs from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

interface GcsDump {
  points: SketchPoint[]
  lines: SketchLine[]
  constraints: SketchPrimitive[]
}

interface SolveDiagnostics {
  algorithm: string
  constraintCount: number
  status: SolveStatus
  dof: number
  conflicting: string[]
  redundant: string[]
  partiallyRedundant: string[]
}

const knownStructuralConflictIds = new Set([
  'intermediate_mt87uu9t5nyq9ioxbsp_parallel',
  'intermediate_mt87uu9t5nyq9ioxbsp_thickness',
  'intermediate_mt87uu9t5nyq9ioxbsp_end_attachment',
  'intermediate_mt87uyt4vvtodk1pnm_end_attachment',
  'intermediate_mt87uyt483ss2d05g4b_start_attachment',
  'intermediate_mt8806tb2n8vu77bktq_thickness',
  'intermediate_mt8806tb2n8vu77bktq_start_attachment',
  'intermediate_mt8806tb2n8vu77bktq_end_attachment',
  'intermediate_mt88179teesy5m12ee5_parallel',
  'intermediate_mt88179teesy5m12ee5_thickness',
  'intermediate_mt88179teesy5m12ee5_end_attachment',
  'intermediate_mt88179txggjj7b22k8_thickness',
  'intermediate_mt88179txggjj7b22k8_start_attachment',
  'intermediate_mt884u07ohqw8lc7m2_start_attachment',
  'bc_constraint_hv_intermediate_mt87uu9t5nyq9ioxbsp',
  'bc_constraint_hv_intermediate_mt884u07ohqw8lc7m2',
  'bc_constraint_hv_intermediate_mt884u07394gyxeh0j4',
  'bc_constraint_hv_intermediate_mt87uu9tmwouav0uhz',
  'intermediate_mt87uu9tmwouav0uhz_end_attachment',
  'intermediate_mt87uu9t5nyq9ioxbsp_start_attachment',
  'intermediate_mt884u07ohqw8lc7m2_parallel',
  'intermediate_mt884u07ohqw8lc7m2_thickness',
  'intermediate_mt884u07ohqw8lc7m2_end_attachment',
  'intermediate_mt884u07394gyxeh0j4_thickness',
  'intermediate_mt884u07394gyxeh0j4_start_attachment'
])

const invalidOpeningDistanceIds = new Set([
  'bc_constraint_we_opening_mt88o3u0kpjbh1q13ei_wallnode_mt87uyt4or30km9klpp',
  'bc_constraint_we_opening_mt88o1jh1f3cpdp4xco_wallnode_mt87uub611vcs9ffr17',
  'bc_constraint_we_opening_mt88odqplio8ka35at_wallnode_mt88179ti9jp66b7wu'
])

let dump: GcsDump
let wasmPath: string

function resolveBundledAssetPath(assetUrl: string): string {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl
  return path.resolve(process.cwd(), normalized)
}

async function loadDump(): Promise<GcsDump> {
  const dumpPath = path.resolve(process.cwd(), 'gcs.json')
  return JSON.parse(await fs.readFile(dumpPath, 'utf8')) as GcsDump
}

function solveConstraints(
  wrapper: GcsWrapper,
  constraints: readonly SketchPrimitive[],
  algorithm: Algorithm,
  algorithmName: string,
  maxIterations = 100
): SolveDiagnostics {
  wrapper.clear_data()
  wrapper.push_primitives_and_params([...dump.points, ...dump.lines, ...constraints])
  wrapper.set_max_iterations(maxIterations)

  const status = wrapper.solve(algorithm)
  const diagnostics = {
    algorithm: algorithmName,
    constraintCount: constraints.length,
    status,
    dof: wrapper.gcs.dof(),
    conflicting: wrapper.get_gcs_conflicting_constraints(),
    redundant: wrapper.get_gcs_redundant_constraints(),
    partiallyRedundant: wrapper.get_gcs_partially_redundant_constraints()
  }

  console.info('PlaneGCS dump diagnostics', diagnostics)
  return diagnostics
}

function getFilteredConstraints(excludedIds: ReadonlySet<string> = new Set()): SketchPrimitive[] {
  return dump.constraints.filter(constraint => !excludedIds.has(constraint.id))
}

const runGcsDumpDebugTests = process.env.GCS_DUMP_DEBUG === '1'

describe.runIf(runGcsDumpDebugTests)('PlaneGCS gcs.json diagnostic dump', () => {
  beforeAll(async () => {
    dump = await loadDump()
    wasmPath = resolveBundledAssetPath(planegcsWasmUrl)
  })

  it('loads the dump and reports diagnostics for every solver algorithm', async () => {
    const module = await init_planegcs_module({ locateFile: () => wasmPath })
    const wrapper = new GcsWrapper(new module.GcsSystem())
    wrapper.debug_mode = DebugMode.NoDebug

    const algorithms = [
      [Algorithm.DogLeg, 'DogLeg'],
      [Algorithm.LevenbergMarquardt, 'LevenbergMarquardt'],
      [Algorithm.BFGS, 'BFGS']
    ] as const
    const rawConstraints = getFilteredConstraints()
    const knownStructuralFilteredConstraints = getFilteredConstraints(knownStructuralConflictIds)
    const invalidOpeningDistanceFilteredConstraints = getFilteredConstraints(invalidOpeningDistanceIds)
    const allKnownFilteredConstraints = getFilteredConstraints(
      new Set([...knownStructuralConflictIds, ...invalidOpeningDistanceIds])
    )
    const openingGeometryFilteredConstraints = rawConstraints.filter(
      constraint => !constraint.id.startsWith('opening_')
    )

    const diagnostics = algorithms.map(([algorithm, name]) =>
      solveConstraints(wrapper, rawConstraints, algorithm, name)
    )

    const filterCases = [
      ['raw', rawConstraints],
      ['opening geometry only', openingGeometryFilteredConstraints],
      ['known structural only', knownStructuralFilteredConstraints],
      ['invalid opening distances only', invalidOpeningDistanceFilteredConstraints],
      ['all known conflicts', allKnownFilteredConstraints]
    ] as const
    for (const [name, constraints] of filterCases) {
      const result = solveConstraints(wrapper, constraints, Algorithm.DogLeg, `DogLeg: ${name}`)
      console.info('PlaneGCS filter diagnostics', result)
    }

    const structuralConstraints = rawConstraints.filter(
      constraint => constraint.id.startsWith('intermediate_') || constraint.id.startsWith('outwall_')
    )
    const buildingConstraints = rawConstraints.filter(constraint => constraint.id.startsWith('bc_'))
    const openingConstraints = rawConstraints.filter(constraint => constraint.id.startsWith('opening_'))
    const postConstraints = rawConstraints.filter(
      constraint => constraint.id.startsWith('post_') || constraint.id.startsWith('wallpost_')
    )
    const stagedConstraints = [
      ['no constraints', []],
      ['structural constraints', structuralConstraints],
      ['structural + building constraints', [...structuralConstraints, ...buildingConstraints]],
      [
        'structural + building + opening constraints',
        [...structuralConstraints, ...buildingConstraints, ...openingConstraints]
      ],
      [
        'structural + building + opening + post constraints',
        [...structuralConstraints, ...buildingConstraints, ...openingConstraints, ...postConstraints]
      ]
    ] as const

    for (const [name, constraints] of stagedConstraints) {
      const staged = solveConstraints(wrapper, constraints, Algorithm.DogLeg, `DogLeg: ${name}`)
      console.info('PlaneGCS staged diagnostics', staged)
    }

    const openingGroups = new Map<string, SketchPrimitive[]>()
    for (const constraint of openingConstraints) {
      const openingId = constraint.id.split('_').slice(0, 2).join('_')
      const group = openingGroups.get(openingId) ?? []
      group.push(constraint)
      openingGroups.set(openingId, group)
    }

    for (const [openingId, constraints] of openingGroups) {
      const staged = solveConstraints(
        wrapper,
        [...structuralConstraints, ...buildingConstraints, ...constraints],
        Algorithm.DogLeg,
        `DogLeg: ${openingId}`,
        20
      )
      console.info('PlaneGCS opening diagnostics', staged)
    }

    expect(dump.points.length).toBeGreaterThan(0)
    expect(dump.lines.length).toBeGreaterThan(0)
    expect(dump.constraints.length).toBeGreaterThan(0)
    expect(diagnostics).toHaveLength(algorithms.length)
    expect(diagnostics.every(result => Number.isFinite(result.dof))).toBe(true)

    wrapper.destroy_gcs_module()
  }, 60_000)
})
