import {
  Algorithm,
  type Constraint,
  type GcsWrapper,
  type SketchLine,
  type SketchPoint,
  type SketchPrimitive,
  SolveStatus
} from '@salusoft89/planegcs'
import { t } from 'i18next'
import { toast } from 'sonner'

import {
  getLineIds,
  getPointIds,
  nodeRefSidePointId,
  wallEntityPointId,
  wallNodeRefPointId,
  wallRefLineId
} from '@/building/gcs/constraintTranslator'
import { createGcs } from '@/building/gcs/gcsInstance'
import { getGcsActions, getGcsState } from '@/building/gcs/store'
import { COLLINEARITY_NUDGE_DISTANCE, validateSolution } from '@/building/gcs/validator'
import type { EntityId, Perimeter, PerimeterCornerId, PerimeterId, PerimeterWallId, WallNodeId } from '@/building/model'
import { isOpeningId, isWallPostId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { type Length, type LineSegment2D, type Vec2, midpoint, newVec2, projectVec2 } from '@/shared/geometry'

const DRAG_TEMP_POINT_ID = 'drag_wall_temp_point'

// --- Helper functions for merging colinear H/V constraints ---

interface CornerAdjacencyInfo {
  prevWall?: string
  nextWall?: string
}

interface ColinearChain {
  walls: string[] // Wall IDs in the chain (in order)
  startCornerId: string // Outermost start corner of chain
  endCornerId: string // Outermost end corner of chain
  constraintType: 'horizontal' | 'vertical' // Type of H/V constraints on all walls
}

function buildCornerAdjacencyMap(lines: SketchLine[]): Map<string, CornerAdjacencyInfo> {
  const map = new Map<string, CornerAdjacencyInfo>()

  for (const line of lines) {
    const start = map.get(line.p1_id) ?? {}
    map.set(line.p1_id, { ...start, nextWall: line.id })
    const end = map.get(line.p2_id) ?? {}
    map.set(line.p2_id, { ...end, prevWall: line.id })
  }

  return map
}

function findColinearChains(
  constraints: Record<string, Constraint>,
  wallMap: Map<string, SketchLine>,
  cornerAdjacencyMap: Map<string, CornerAdjacencyInfo>
): ColinearChain[] {
  const chains = new Map<string, ColinearChain>()
  const wallsWithHV = new Set<string>()
  const wallToConstraintType: Map<string, 'horizontal' | 'vertical'> = new Map<string, 'horizontal' | 'vertical'>()
  const colinearConstraints = new Set<string>()

  for (const [, constraint] of Object.entries(constraints)) {
    if (constraint.type === 'horizontal_l') {
      wallsWithHV.add(constraint.l_id)
      wallToConstraintType.set(constraint.l_id, 'horizontal')
    } else if (constraint.type === 'vertical_l') {
      wallsWithHV.add(constraint.l_id)
      wallToConstraintType.set(constraint.l_id, 'vertical')
    } else if (constraint.type === 'point_on_line_ppp') {
      const pointIds = [constraint.p_id, constraint.lp1_id, constraint.lp2_id].sort()
      colinearConstraints.add(pointIds.join('|'))
    }
  }

  for (const wallId of wallsWithHV) {
    const wallLine = wallMap.get(wallId)
    if (!wallLine) continue

    const prevWall = cornerAdjacencyMap.get(wallLine.p1_id)?.prevWall
    if (
      !prevWall ||
      !wallsWithHV.has(prevWall) ||
      wallToConstraintType.get(wallId) !== wallToConstraintType.get(prevWall)
    )
      continue

    const prevWallLine = wallMap.get(prevWall)
    if (!prevWallLine) continue
    const colinearPointIds = [prevWallLine.p1_id, wallLine.p1_id, wallLine.p2_id].sort()
    if (!colinearConstraints.has(colinearPointIds.join('|'))) continue

    const prevCorner = prevWallLine.p1_id
    const prevPrevWall = cornerAdjacencyMap.get(prevCorner)?.prevWall
    if (!prevPrevWall) continue

    const existingChainAfter = chains.get(wallId)
    const existingChainBefore = chains.get(prevPrevWall)

    let chain: ColinearChain
    if (existingChainBefore) {
      const walls = existingChainAfter
        ? [...existingChainBefore.walls, ...existingChainAfter.walls]
        : [...existingChainBefore.walls, wallId]

      chain = {
        walls,
        startCornerId: existingChainBefore.startCornerId,
        endCornerId: existingChainAfter?.endCornerId ?? wallLine.p2_id,
        constraintType: wallToConstraintType.get(wallId) ?? 'horizontal'
      }
    } else {
      const walls = existingChainAfter ? [prevWall, ...existingChainAfter.walls] : [prevWall, wallId]
      chain = {
        walls,
        startCornerId: prevCorner,
        endCornerId: existingChainAfter?.endCornerId ?? wallLine.p2_id,
        constraintType: wallToConstraintType.get(wallId) ?? 'horizontal'
      }
    }
    chains.set(chain.walls[0], chain)
  }

  return Array.from(chains.values())
}

function transformAdjacentHVConstraints(
  constraints: Record<string, Constraint>,
  lines: SketchLine[]
): Record<string, Constraint> {
  const cornerAdjacencyMap = buildCornerAdjacencyMap(lines)
  const wallMap = new Map(lines.map(l => [l.id, l]))
  const chains = findColinearChains(constraints, wallMap, cornerAdjacencyMap)

  const result = { ...constraints }
  const removedConstraintIds = new Set<string>()

  for (const chain of chains) {
    const mergedConstraintId = `merged_${chain.constraintType}_chain_${chain.walls.join('_')}`

    for (const wallId of chain.walls) {
      const constraint = Object.values(constraints).find(
        c => (c.type === 'horizontal_l' || c.type === 'vertical_l') && c.l_id === wallId
      )
      if (constraint) {
        removedConstraintIds.add(constraint.id)
      }
    }

    const gcsType = chain.constraintType === 'horizontal' ? 'horizontal_pp' : 'vertical_pp'
    result[mergedConstraintId] = {
      id: mergedConstraintId,
      type: gcsType,
      p1_id: chain.startCornerId,
      p2_id: chain.endCornerId,
      driving: true
    }
  }

  for (const id of removedConstraintIds) {
    delete result[id]
  }

  return result
}

interface DragState {
  pointIds: string[]
  initialPositions: Map<string, Vec2>
  constraints: { constraintXId: string; constraintYId: string; paramXPos: number; paramYPos: number }[]
}

class GcsService {
  private solveTimeout: NodeJS.Timeout | undefined

  constructor() {
    this.triggerSolve()
  }

  triggerSolve() {
    if (this.solveTimeout) {
      clearTimeout(this.solveTimeout)
    }
    this.solveTimeout = setTimeout(() => {
      const { updatePerimeterBoundary, getActiveStoreyId, getPerimeterById } = getModelActions()
      const activeStoreyId = getActiveStoreyId()
      const gcs = this.getGcs()
      if (gcs.solve()) {
        for (const perimeterId of Object.keys(getGcsState().perimeterRegistry) as PerimeterId[]) {
          const perimeter = getPerimeterById(perimeterId)
          if (perimeter.storeyId !== activeStoreyId) continue
          updatePerimeterBoundary(perimeterId, gcs.getPerimeterBoundary(perimeterId))
          gcs.applyWallNodePositions(perimeterId)
          gcs.applyWallEntityOffsets(perimeterId)
        }
      }
      getGcsActions().setTmpPoints()
      gcs.syncConstraintStatus()
      this.solveTimeout = undefined
    }, 100)
  }

  getGcs(fixedNodeIds?: PerimeterCornerId[], fixedPointIds: string[] = []): WrappedGcs {
    const gcsState = getGcsState()
    const modelActions = getModelActions()
    const activeStoreyId = modelActions.getActiveStoreyId()

    const perimeters: Perimeter[] = []
    const activePerimeterIds: PerimeterId[] = []
    for (const perimeterId of Object.keys(gcsState.perimeterRegistry) as PerimeterId[]) {
      const perimeter = modelActions.getPerimeterById(perimeterId)
      if (perimeter.storeyId === activeStoreyId) {
        activePerimeterIds.push(perimeterId)
        perimeters.push(perimeter)
      }
    }

    const activePointIds = new Set<string>()
    const activeLineIds = new Set<string>()
    for (const perimeterId of activePerimeterIds) {
      const entry = gcsState.perimeterRegistry[perimeterId]
      for (const pointId of entry.pointIds) activePointIds.add(pointId)
      for (const lineId of entry.lineIds) activeLineIds.add(lineId)
    }

    for (const pointIds of Object.values(gcsState.constraintPoints)) {
      for (const pointId of pointIds) activePointIds.add(pointId)
    }

    const fixedIds = new Set([...(fixedNodeIds ?? []).map(id => nodeRefSidePointId(id)), ...fixedPointIds])
    const allPoints = Object.values(gcsState.points)
    const points = allPoints.filter(p => activePointIds.has(p.id))
    const fixedPoints = points.map(p => (fixedIds.has(p.id) ? { ...p, fixed: true } : p))

    const lines = gcsState.lines.filter(l => activeLineIds.has(l.id))

    const allConstraints = transformAdjacentHVConstraints(gcsState.constraints, gcsState.lines)
    const constraints = Object.fromEntries(
      Object.entries(allConstraints).filter(([, constraint]) => {
        const pids = getPointIds(constraint)
        const lids = getLineIds(constraint)
        return pids.every(p => activePointIds.has(p)) && lids.every(l => activeLineIds.has(l))
      })
    )

    const primitives: SketchPrimitive[] = [...lines, ...Object.values(constraints)]

    return new WrappedGcs(createGcs(), fixedPoints, primitives, lines, constraints, perimeters)
  }
}

/** Module-level singleton instance */
export const gcsService = new GcsService()

export class WrappedGcs {
  private gcs: GcsWrapper
  private primitives: SketchPrimitive[]
  private dragState: DragState | null = null
  private points: SketchPoint[]
  private tempPoints: SketchPoint[] = []
  private tempPrimitives: SketchPrimitive[] = []
  private lines: SketchLine[]
  private constraints: Record<string, Constraint>
  private perimeters: Perimeter[]

  constructor(
    gcs: GcsWrapper,
    points: SketchPoint[],
    primitives: SketchPrimitive[],
    lines: SketchLine[],
    constraints: Record<string, Constraint>,
    perimeters: Perimeter[] = []
  ) {
    this.gcs = gcs
    this.points = points
    this.primitives = primitives
    this.lines = lines
    this.constraints = constraints
    this.perimeters = perimeters
    this.resetGcs()
  }

  // --- Domain-aware public API ---

  /**
   * Start dragging a perimeter corner.
   * Resolves the corner to its reference-side GCS point internally.
   * Returns the current position of the drag point.
   */
  startCornerDrag(cornerId: PerimeterCornerId): Vec2 {
    const pointId = nodeRefSidePointId(cornerId)
    const pos = this.findPointPosition(pointId)
    this.startDrag(pointId, pos)
    return pos
  }

  /**
   * Start dragging a perimeter wall.
   * Creates a temporary point at the wall midpoint constrained to the wall's inside line,
   * then starts dragging it.
   * Returns the current position of the drag point (the wall midpoint).
   */
  startWallDrag(wallId: PerimeterWallId): Vec2 {
    return this.startLineDrag(wallRefLineId(wallId))
  }

  startLineDrag(lineId: string): Vec2 {
    const line = this.lines.find(l => l.id === lineId)
    if (!line) {
      throw new Error(`GCS line "${lineId}" not found`)
    }

    const p1 = this.findPointPosition(line.p1_id)
    const p2 = this.findPointPosition(line.p2_id)
    const wallMid = midpoint(p1, p2)

    this.addTemporaryPrimitives(
      [{ id: DRAG_TEMP_POINT_ID, type: 'point', x: wallMid[0], y: wallMid[1], fixed: false }],
      [
        {
          id: `${DRAG_TEMP_POINT_ID}_on_line`,
          type: 'point_on_line_pl',
          p_id: DRAG_TEMP_POINT_ID,
          l_id: lineId
        }
      ]
    )

    this.startDrag(DRAG_TEMP_POINT_ID, wallMid)
    return wallMid
  }

  /**
   * Update the current drag to a new mouse position.
   */
  updateDrag(mouseX: number, mouseY: number): void {
    if (!this.dragState) return

    const position = newVec2(mouseX, mouseY)
    const initialPosition = this.dragState.initialPositions.get(this.dragState.pointIds[0])
    if (!initialPosition) return
    this.setDragConstraintPositions(position[0] - initialPosition[0], position[1] - initialPosition[1])
    this.solveDrag()
  }

  /** Start dragging an existing point. Updates use a delta from its position. */
  startPointDrag(pointId: string): Vec2 {
    const positions = [this.findPointPosition(pointId)]
    this.resetGcs()
    this.installDragConstraints([pointId], positions)
    return positions[0]
  }

  /** Update a point drag by applying a delta from its initial position. */
  updatePointDrag(deltaX: number, deltaY: number): void {
    if (!this.dragState) return
    this.setDragConstraintPositions(deltaX, deltaY)
    this.solveDrag()
  }

  public solve() {
    const solveStatus = this.gcs.solve(Algorithm.DogLeg)
    if (solveStatus !== SolveStatus.Success) {
      console.warn(`Solving GCS failed: ${solveStatus}`)
      console.log(this.gcs.get_gcs_redundant_constraints(), this.gcs.get_gcs_conflicting_constraints())
      this.showSolverFailureToast()
      return false
    }
    this.dismissSolverFailureToast()
    if (!this.applySolution()) {
      return false
    }
    return true
  }

  private showSolverFailureToast(): void {
    toast.error(
      t($ => $.gcs.solverFailed, { ns: 'errors' }),
      {
        id: 'gcs-solver-failure',
        duration: 10000
      }
    )
  }

  private dismissSolverFailureToast(): void {
    toast.dismiss('gcs-solver-failure')
  }

  syncConstraintStatus(): void {
    const conflictingIds = this.gcs.get_gcs_conflicting_constraints()
    const redundantIds = this.gcs.get_gcs_redundant_constraints()

    getGcsActions().setConstraintStatus(conflictingIds, redundantIds)
  }

  /**
   * End the current drag operation.
   */
  endDrag(): void {
    this.dragState = null
    this.tempPoints = []
    this.tempPrimitives = []
    this.resetGcs()
    getGcsActions().setTmpPoints()
  }

  /**
   * Get the solved perimeter boundary (reference-side corner positions in order).
   */
  getPerimeterBoundary(perimeterId: PerimeterId): Vec2[] {
    const perimeter = this.perimeters.find(p => p.id === perimeterId)
    if (!perimeter) {
      throw new Error(`Perimeter "${perimeterId}" not found`)
    }
    return perimeter.cornerIds.map(cornerId => this.findPointPosition(nodeRefSidePointId(cornerId)))
  }

  applyWallNodePositions(perimeterId: PerimeterId): void {
    const modelActions = getModelActions()
    const perimeter = modelActions.getPerimeterById(perimeterId)
    const positions = Object.fromEntries(
      perimeter.wallNodeIds.map(nodeId => [nodeId, this.findPointPosition(wallNodeRefPointId(nodeId))] as const)
    ) as Record<WallNodeId, Vec2>

    modelActions.applyGcsWallNodePositions(perimeterId, positions)
  }

  /**
   * Get the solved position of a single corner on its reference side.
   */
  getCornerPosition(cornerId: PerimeterCornerId): Vec2 {
    const pointId = nodeRefSidePointId(cornerId)
    return this.findPointPosition(pointId)
  }

  applyWallEntityOffsets(perimeterId: PerimeterId) {
    const modelActions = getModelActions()
    const perimeter = modelActions.getPerimeterById(perimeterId)
    const walls = [
      ...modelActions.getPerimeterWallsById(perimeterId),
      ...modelActions.getIntermediateWallsByPerimeter(perimeterId)
    ]

    const isInsideRef = perimeter.referenceSide === 'inside'

    const entityOffsets = new Map<EntityId, Length>()
    for (const wall of walls) {
      let wallStartPoint: Vec2
      if ('insideLine' in wall) {
        wallStartPoint = isInsideRef ? wall.insideLine.start : wall.outsideLine.start
      } else {
        wallStartPoint = wall.leftLine.start
      }

      for (const entityId of wall.entityIds) {
        const pointId = wallEntityPointId(entityId, 'center')
        const centerPoint = this.findPointPosition(pointId)

        const signedOffset = projectVec2(wallStartPoint, centerPoint, wall.direction)
        entityOffsets.set(entityId, signedOffset)
      }
    }

    for (const [entityId, centerOffsetFromWallStart] of entityOffsets) {
      if (isOpeningId(entityId)) {
        modelActions.updateWallOpening(entityId, { centerOffsetFromWallStart })
      } else if (isWallPostId(entityId)) {
        modelActions.updateWallPost(entityId, { centerOffsetFromWallStart })
      }
    }
  }

  /**
   * Get the current solved position of the drag point.
   * For corner drags this is the corner itself; for wall drags this is the temp midpoint.
   */
  getDragPointPosition(): Vec2 {
    if (!this.dragState) {
      throw new Error('No active drag')
    }
    return this.findPointPosition(this.dragState.pointIds[0])
  }

  /** Get the current solved position of an arbitrary GCS point. */
  getPointPosition(pointId: string): Vec2 {
    return this.findPointPosition(pointId)
  }

  getLineSegment(lineId: string): LineSegment2D {
    const line = this.lines.find(candidate => candidate.id === lineId)
    if (!line) throw new Error(`GCS line "${lineId}" not found`)
    return { start: this.findPointPosition(line.p1_id), end: this.findPointPosition(line.p2_id) }
  }

  // --- Private implementation ---

  private findPointPosition(pointId: string): Vec2 {
    const point = this.points.find(p => p.id === pointId) ?? this.tempPoints.find(p => p.id === pointId)
    if (!point) {
      throw new Error(`GCS point "${pointId}" not found`)
    }
    return newVec2(point.x, point.y)
  }

  private resetGcs(points = this.points): void {
    this.gcs.clear_data()
    this.gcs.push_primitives_and_params([...points, ...this.tempPoints])
    this.gcs.push_primitives_and_params([...this.primitives, ...this.tempPrimitives])
  }

  private addTemporaryPrimitives(points: SketchPoint[], primitives: SketchPrimitive[]): void {
    this.tempPoints = points
    this.tempPrimitives = primitives
    this.resetGcs()
  }

  private installDragConstraints(pointIds: string[], positions: Vec2[]): void {
    const constraints = pointIds.map((pointId, index) => {
      const suffix = `${Date.now()}_${index}`
      const constraintXId = `drag_${pointId}_x_${suffix}`
      const constraintYId = `drag_${pointId}_y_${suffix}`

      this.gcs.push_primitive({
        type: 'equal',
        id: constraintXId,
        param1: { o_id: pointId, prop: 'x' },
        param2: positions[index][0],
        temporary: true,
        driving: true
      })
      this.gcs.push_primitive({
        type: 'equal',
        id: constraintYId,
        param1: { o_id: pointId, prop: 'y' },
        param2: positions[index][1],
        temporary: true,
        driving: true
      })

      return {
        constraintXId,
        constraintYId,
        paramXPos: this.gcs.p_param_index.get(constraintXId) ?? -1,
        paramYPos: this.gcs.p_param_index.get(constraintYId) ?? -1
      }
    })

    this.dragState = {
      pointIds,
      initialPositions: new Map(pointIds.map((pointId, index) => [pointId, positions[index]])),
      constraints
    }
  }

  private setDragConstraintPositions(deltaX: number, deltaY: number): void {
    if (!this.dragState) return
    for (const [index, constraint] of this.dragState.constraints.entries()) {
      const initialPosition = this.dragState.initialPositions.get(this.dragState.pointIds[index])
      if (!initialPosition) continue
      this.gcs.gcs.set_p_param(constraint.paramXPos, initialPosition[0] + deltaX, true)
      this.gcs.gcs.set_p_param(constraint.paramYPos, initialPosition[1] + deltaY, true)
    }
  }

  private solveDrag(): void {
    if (!this.dragState) return
    const solveStatus = this.gcs.solve(Algorithm.DogLeg)
    if (solveStatus === SolveStatus.Success) {
      this.dismissSolverFailureToast()
      if (!this.applySolution()) {
        this.installDragConstraints(
          this.dragState.pointIds,
          this.dragState.pointIds.map(pointId => this.findPointPosition(pointId))
        )
      }
    } else {
      console.warn(`Solving GCS failed: ${solveStatus}`)
      console.log(this.gcs.get_gcs_redundant_constraints(), this.gcs.get_gcs_conflicting_constraints())
      this.showSolverFailureToast()
    }
  }

  private startDrag(pointId: string, mousePos: Vec2): void {
    this.resetGcs()
    this.installDragConstraints([pointId], [mousePos])
  }

  private applySolution(maxIterations = 3): boolean {
    let basePoints = this.points

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      this.gcs.apply_solution()

      const primitives = this.gcs.sketch_index.get_primitives()

      const updatePoints = (points: SketchPoint[]) =>
        points.map(point => {
          const newPoint = primitives.find(p => p.id === point.id) as SketchPoint | undefined
          return newPoint != null
            ? {
                ...point,
                x: newPoint.x,
                y: newPoint.y
              }
            : point
        })

      const newPoints = updatePoints(basePoints)
      const newTempPoints = updatePoints(this.tempPoints)

      const pointsMap = Object.fromEntries(newPoints.map(p => [p.id, p]))
      const linesMap = Object.fromEntries(this.lines.map(l => [l.id, l]))
      const validation = validateSolution(this.perimeters, pointsMap, this.constraints, linesMap)

      getGcsActions().setTmpPoints(pointsMap)

      if (validation.valid) {
        this.points = newPoints
        this.tempPoints = newTempPoints
        return true
      }

      if (validation.nudges && validation.nudges.length > 0) {
        const nudgedPoints = newPoints.map(point => ({ ...point }))
        for (const { pointId, nudgeDirection } of validation.nudges) {
          const point = nudgedPoints.find(p => p.id === pointId)
          if (point) {
            point.x += nudgeDirection[0] * COLLINEARITY_NUDGE_DISTANCE
            point.y += nudgeDirection[1] * COLLINEARITY_NUDGE_DISTANCE
          }
        }
        basePoints = nudgedPoints
        this.resetGcs(basePoints)
        if (this.gcs.solve(Algorithm.DogLeg) !== SolveStatus.Success) {
          this.showSolverFailureToast()
          break
        }
        continue
      }

      console.warn(validation)
      break
    }

    this.resetGcs()
    return false
  }
}
