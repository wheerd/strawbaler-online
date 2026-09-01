import { type Constraint, type SketchLine, type SketchPoint } from '@salusoft89/planegcs'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { referenceSideToConstraintSide } from '@/building/gcs/constraintGenerator'
import type {
  Constraint as BuildingConstraint,
  ConstraintId,
  IntermediateWallId,
  PerimeterCornerId,
  PerimeterId,
  WallId,
  WallNodeId
} from '@/building/model'
import { isPerimeterWallId } from '@/building/model/ids'
import type { PerimeterCornerWithGeometry } from '@/building/model/perimeters'
import type { OpeningWithGeometry, WallPostWithGeometry } from '@/building/model/wallEntities'
import { getModelActions } from '@/building/store'
import { type Vec2, midpoint, projectVec2, scaleAddVec2 } from '@/shared/geometry/2d'

import {
  type TranslationContext,
  getReferencedCornerIds,
  getReferencedWallEntityIds,
  getReferencedWallIds,
  getReferencedWallNodeIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  translateBuildingConstraint,
  translatedConstraintIds,
  translatedPointIds,
  wallEndpointPointId,
  wallEntityOnLineConstraintId,
  wallEntityPointId,
  wallEntityWidthConstraintId,
  wallNodeInsideLineId,
  wallNodeOutsideLineId,
  wallNodeOutsidePointId,
  wallNodePointId,
  wallNodeRefPointId,
  wallNonRefLineId,
  wallNonRefSideProjectedPoint,
  wallRefLineId
} from './constraintTranslator'

interface PerimeterRegistryEntry {
  pointIds: string[]
  lineIds: string[]
  constraintIds: string[]
}

interface GcsStoreState {
  points: Record<string, SketchPoint>
  tmpPoints?: Record<string, SketchPoint>
  lines: SketchLine[]
  constraints: Record<string, Constraint>
  buildingConstraints: Record<string, BuildingConstraint>
  constraintPoints: Record<string, string[]>
  perimeterRegistry: Record<PerimeterId, PerimeterRegistryEntry>
  conflictingConstraintIds: Set<string>
  redundantConstraintIds: Set<string>
}

interface GcsStoreActions {
  addPerimeterGeometry: (perimeterId: PerimeterId) => void
  removePerimeterGeometry: (perimeterId: PerimeterId) => void

  addPoint: (id: string, pos: Vec2, fixed?: boolean) => void
  addLine: (id: string, p1Id: string, p2Id: string) => void
  addConstraint: (constraint: Constraint) => void

  updatePointPosition: (id: string, pos: Vec2) => void

  removePoints: (ids: string[]) => void
  removeLines: (ids: string[]) => void
  removeConstraints: (ids: string[]) => void

  addBuildingConstraint: (constraint: BuildingConstraint) => void
  removeBuildingConstraint: (id: ConstraintId) => void
  setConstraintStatus: (conflicting: string[], redundant: string[]) => void

  setTmpPoints: (tmpPoints?: Record<string, SketchPoint>) => void
}

type GcsStore = GcsStoreState & { actions: GcsStoreActions }

const useGcsStore = create<GcsStore>()((set, get) => ({
  points: {},
  lines: [],
  constraints: {},
  buildingConstraints: {},
  constraintPoints: {},
  gcs: null,
  drag: null,
  cornerOrderMap: new Map(),
  perimeterRegistry: {},
  conflictingConstraintIds: new Set(),
  redundantConstraintIds: new Set(),

  actions: {
    addPoint: (id, pos, fixed = false) => {
      set(state => ({
        points: { ...state.points, [id]: { id, type: 'point', x: pos[0], y: pos[1], fixed } }
      }))
    },

    addLine: (id, p1Id, p2Id) => {
      set(state => ({
        lines: [...state.lines, { id, type: 'line', p1_id: p1Id, p2_id: p2Id }]
      }))
    },

    addConstraint: constraint => {
      set(state => ({
        constraints: { ...state.constraints, [constraint.id]: { ...constraint } }
      }))
    },

    updatePointPosition: (id, pos) => {
      set(state => ({
        points: { ...state.points, [id]: { ...state.points[id], x: pos[0], y: pos[1] } }
      }))
    },

    removePoints: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => {
        const newPoints = { ...state.points }
        for (const id of toRemove) {
          delete newPoints[id]
        }
        return { points: newPoints }
      })
    },

    removeLines: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => ({
        lines: state.lines.filter(l => !toRemove.has(l.id))
      }))
    },

    removeConstraints: ids => {
      if (ids.length === 0) return
      const toRemove = new Set(ids)
      set(state => {
        const newConstraints = { ...state.constraints }
        for (const id of toRemove) {
          delete newConstraints[id]
        }
        return { constraints: newConstraints }
      })
    },

    addBuildingConstraint: constraint => {
      const state = get()

      const getRegisteredEndpointPointId = (
        wallId: WallId,
        endpoint: 'start' | 'end',
        side: 'ref' | 'nonref'
      ): string => {
        const lineId = side === 'ref' ? wallRefLineId(wallId) : wallNonRefLineId(wallId)
        const line = state.lines.find(l => l.id === lineId)
        if (!line) return wallEndpointPointId(wallId, endpoint, side)
        return endpoint === 'start' ? line.p1_id : line.p2_id
      }

      // Check for duplicate
      if (constraint.id in state.buildingConstraints) {
        console.warn(`Building constraint with id "${constraint.id}" already exists, skipping.`)
        return constraint.id
      }

      // Validate that all referenced corners exist as GCS points
      const cornerIds = getReferencedCornerIds(constraint)
      for (const cornerId of cornerIds) {
        const refId = nodeRefSidePointId(cornerId)
        if (!(refId in state.points)) {
          throw new Error(`Cannot add building constraint: corner "${cornerId}" not found in GCS points.`)
        }
      }

      const wallNodeIds = getReferencedWallNodeIds(constraint)
      for (const wallNodeId of wallNodeIds) {
        const refId = wallNodeRefPointId(wallNodeId)
        if (!(refId in state.points)) {
          throw new Error(`Cannot add building constraint: wall node "${wallNodeId}" not found in GCS points.`)
        }
      }

      const entityIds = getReferencedWallEntityIds(constraint)
      for (const entityId of entityIds) {
        for (const side of ['start', 'center', 'end'] as const) {
          const pointId = wallEntityPointId(entityId, side)
          if (!(pointId in state.points)) {
            throw new Error(`Cannot add building constraint: wall entity "${entityId}" not found in GCS points.`)
          }
        }
      }

      // Validate that all referenced walls exist as GCS lines
      const wallIds = getReferencedWallIds(constraint)
      for (const wallId of wallIds) {
        const refLineId = wallRefLineId(wallId)
        if (!state.lines.some(l => l.id === refLineId)) {
          throw new Error(`Cannot add building constraint: wall "${wallId}" not found in GCS lines.`)
        }
      }

      // Translate and add the planegcs constraints
      const modelActionsRef = getModelActions()
      const context: TranslationContext = {
        getLineStartPointId: (lineId: string) => {
          const line = state.lines.find(l => l.id === lineId)
          return line?.p1_id
        },
        getWallNodeInsideLinePointIds: (nodeId: WallNodeId) => {
          const line = state.lines.find(l => l.id === wallNodeInsideLineId(nodeId))
          return line ? { start: line.p1_id, end: line.p2_id } : undefined
        },
        getWallNodeOutsideLinePointIds: (nodeId: WallNodeId) => {
          const line = state.lines.find(l => l.id === wallNodeOutsideLineId(nodeId))
          return line ? { start: line.p1_id, end: line.p2_id } : undefined
        },
        getWallNodeIds: (wallId: WallId, side: 'ref' | 'nonref') => {
          try {
            if (isPerimeterWallId(wallId)) {
              const wall = modelActionsRef.getPerimeterWallById(wallId)
              return {
                startId: wall.startCornerId,
                endId: wall.endCornerId,
                start:
                  side === 'ref'
                    ? nodeRefSidePointId(wall.startCornerId)
                    : nodeNonRefSidePointForNextWall(wall.startCornerId),
                end:
                  side === 'ref'
                    ? nodeRefSidePointId(wall.endCornerId)
                    : nodeNonRefSidePointForPrevWall(wall.endCornerId)
              }
            }
            const wall = modelActionsRef.getIntermediateWallById(wallId)
            return {
              startId: wall.start.nodeId,
              endId: wall.end.nodeId,
              start: getRegisteredEndpointPointId(wallId, 'start', side),
              end: getRegisteredEndpointPointId(wallId, 'end', side)
            }
          } catch {
            return undefined
          }
        },
        getCornerAdjacentWallIds: (cornerId: PerimeterCornerId) => {
          try {
            const corner = modelActionsRef.getPerimeterCornerById(cornerId)
            return { previousWallId: corner.previousWallId, nextWallId: corner.nextWallId }
          } catch {
            return undefined
          }
        },
        getReferenceSide: (entityId: WallId) => {
          const wall = isPerimeterWallId(entityId)
            ? modelActionsRef.getPerimeterWallById(entityId)
            : modelActionsRef.getIntermediateWallById(entityId)
          const perimeter = modelActionsRef.getPerimeterById(wall.perimeterId)
          return referenceSideToConstraintSide(perimeter.referenceSide)
        },
        getWallRefEndpointPointIds: (wallId, nodeId) => {
          try {
            const wall = modelActionsRef.getIntermediateWallById(wallId as IntermediateWallId)
            const atStart = wall.start.nodeId === nodeId
            const atEnd = wall.end.nodeId === nodeId
            if (!atStart && !atEnd) return undefined

            const atNodeEndpoint = atStart ? 'start' : 'end'
            const oppositeEndpoint = atStart ? 'end' : 'start'
            const atNodePointId = getRegisteredEndpointPointId(wall.id, atNodeEndpoint, 'ref')
            const oppositePointId = getRegisteredEndpointPointId(wall.id, oppositeEndpoint, 'ref')
            return { atNodePointId, oppositePointId }
          } catch {
            return undefined
          }
        },
        getWallNodeSideEndpointPointIds: (wallId, nodeId, side) => {
          try {
            const wall = modelActionsRef.getIntermediateWallById(wallId as IntermediateWallId)
            const atStart = wall.start.nodeId === nodeId
            const atEnd = wall.end.nodeId === nodeId
            if (!atStart && !atEnd) return undefined

            const endpoint: 'start' | 'end' = atStart ? 'start' : 'end'
            const oppositeEndpoint: 'start' | 'end' = atStart ? 'end' : 'start'
            const pointSide =
              side === 'left' ? (endpoint === 'start' ? 'ref' : 'nonref') : endpoint === 'start' ? 'nonref' : 'ref'
            return {
              atNodePointId: getRegisteredEndpointPointId(wall.id, endpoint, pointSide),
              oppositePointId: getRegisteredEndpointPointId(wall.id, oppositeEndpoint, pointSide)
            }
          } catch {
            return undefined
          }
        },
        getWallNodeSidePointId: (wallId, nodeId, side) => {
          try {
            const wall = modelActionsRef.getIntermediateWallById(wallId)
            const atStart = wall.start.nodeId === nodeId
            const atEnd = wall.end.nodeId === nodeId
            if (!atStart && !atEnd) return undefined

            const pointSide = side === 'left' ? 'ref' : 'nonref'
            const endpoint: 'start' | 'end' = atStart ? 'start' : 'end'
            return getRegisteredEndpointPointId(wall.id, endpoint, pointSide)
          } catch {
            return undefined
          }
        }
      }

      const translated = translateBuildingConstraint(constraint, constraint.id, context)

      const pointIds = translated.points.map(p => p.id)

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const c of translated.constraints) {
          newConstraints[c.id] = c
        }

        const newPoints = { ...state.points }
        for (const p of translated.points) {
          newPoints[p.id] = p
        }

        return {
          buildingConstraints: { ...state.buildingConstraints, [constraint.id]: constraint },
          constraints: newConstraints,
          points: newPoints,
          constraintPoints: { ...state.constraintPoints, [constraint.id]: pointIds }
        }
      })
    },

    removeBuildingConstraint: id => {
      const state = get()

      if (!(id in state.buildingConstraints)) {
        console.warn(`Building constraint with key "${id}" not found, skipping removal.`)
        return
      }

      const constraintIdsToRemove = new Set(translatedConstraintIds(id))
      const pointIdsToRemove = new Set(translatedPointIds(id))
      const storedPointIds = state.constraintPoints[id] ?? []
      for (const pid of storedPointIds) {
        pointIdsToRemove.add(pid)
      }

      set(state => {
        const newConstraints = { ...state.constraints }
        for (const cid of constraintIdsToRemove) {
          delete newConstraints[cid]
        }

        const newPoints = { ...state.points }
        for (const pid of pointIdsToRemove) {
          delete newPoints[pid]
        }

        const { [id]: _, ...remainingBuildingConstraints } = state.buildingConstraints
        const { [id]: __, ...remainingConstraintPoints } = state.constraintPoints

        return {
          buildingConstraints: remainingBuildingConstraints,
          constraints: newConstraints,
          points: newPoints,
          constraintPoints: remainingConstraintPoints
        }
      })
    },

    addPerimeterGeometry: perimeterId => {
      const state = get()
      const { actions } = state

      // If already tracked, remove first (graceful upsert)
      if (perimeterId in state.perimeterRegistry) {
        actions.removePerimeterGeometry(perimeterId)
      }

      const modelActions = getModelActions()
      const corners = modelActions.getPerimeterCornersById(perimeterId)
      const walls = modelActions.getPerimeterWallsById(perimeterId)

      const entry: PerimeterRegistryEntry = {
        pointIds: [],
        lineIds: [],
        constraintIds: []
      }

      // Build corner lookup map first
      const cornerGeomMap = new Map<PerimeterCornerId, PerimeterCornerWithGeometry>()
      for (const corner of corners) {
        cornerGeomMap.set(corner.id, corner)
      }

      const perimeter = modelActions.getPerimeterById(perimeterId)
      const isRefInside = perimeter.referenceSide === 'inside'

      // Add points for each corner
      for (const corner of corners) {
        const refPointId = nodeRefSidePointId(corner.id)
        const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
        const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

        const refPos = isRefInside ? corner.insidePoint : corner.outsidePoint
        const nonRefPos = isRefInside ? corner.outsidePoint : corner.insidePoint

        // Add reference side point
        actions.addPoint(refPointId, refPos, false)

        if (corner.interiorAngle !== 180) {
          actions.addPoint(nonRefPrevId, nonRefPos, false)
          actions.addPoint(nonRefNextId, nonRefPos, false)
        } else {
          // Add non-reference side points with wall-specific thickness offsets
          const prevWall = walls.find(w => w.endCornerId === corner.id)
          const nextWall = walls.find(w => w.startCornerId === corner.id)

          if (prevWall) {
            const prevPos = scaleAddVec2(
              refPos,
              prevWall.outsideDirection,
              isRefInside ? prevWall.thickness : -prevWall.thickness
            )
            actions.addPoint(nonRefPrevId, prevPos, false)
          }

          if (nextWall) {
            const nextPos = scaleAddVec2(
              refPos,
              nextWall.outsideDirection,
              isRefInside ? nextWall.thickness : -nextWall.thickness
            )
            actions.addPoint(nonRefNextId, nextPos, false)
          }
        }

        entry.pointIds.push(refPointId, nonRefPrevId, nonRefNextId)
      }

      const addWallEntityGeometry = (
        entity: OpeningWithGeometry | WallPostWithGeometry,
        entry: PerimeterRegistryEntry
      ): void => {
        const { insideLine, outsideLine, width } = entity

        // Calculate center points
        const insideCenter = midpoint(insideLine.start, insideLine.end)
        const outsideCenter = midpoint(outsideLine.start, outsideLine.end)

        const ref = isPerimeterWallId(entity.wallId)
          ? isRefInside
            ? { start: insideLine.start, center: insideCenter, end: insideLine.end }
            : { start: outsideLine.start, center: outsideCenter, end: outsideLine.end }
          : { start: outsideLine.start, center: outsideCenter, end: outsideLine.end }

        // Point IDs
        const startRef = wallEntityPointId(entity.id, 'start')
        const centerRef = wallEntityPointId(entity.id, 'center')
        const endRef = wallEntityPointId(entity.id, 'end')

        // Add all 3 points (start/center/end for ref side)
        actions.addPoint(startRef, ref.start, false)
        actions.addPoint(centerRef, ref.center, false)
        actions.addPoint(endRef, ref.end, false)

        entry.pointIds.push(startRef, centerRef, endRef)

        // Constraint: All points must be on the wall line
        const refLineId = wallRefLineId(entity.wallId)

        const startOnRef = wallEntityOnLineConstraintId(entity.id, 'start')
        const centerOnRef = wallEntityOnLineConstraintId(entity.id, 'center')
        const endOnRef = wallEntityOnLineConstraintId(entity.id, 'end')

        actions.addConstraint({ id: startOnRef, type: 'point_on_line_pl', p_id: startRef, l_id: refLineId })
        actions.addConstraint({ id: centerOnRef, type: 'point_on_line_pl', p_id: centerRef, l_id: refLineId })
        actions.addConstraint({ id: endOnRef, type: 'point_on_line_pl', p_id: endRef, l_id: refLineId })

        entry.constraintIds.push(startOnRef, centerOnRef, endOnRef)

        // Constraint: Center point must be on perpendicular bisector of start and end
        const centerBisectorRef = `${entity.id}_center_bisector_ref`
        actions.addConstraint({
          id: centerBisectorRef,
          type: 'point_on_perp_bisector_ppp',
          p_id: centerRef,
          lp1_id: startRef,
          lp2_id: endRef
        })
        entry.constraintIds.push(centerBisectorRef)

        // Constraint: Width must be maintained (distance between start and end)
        const widthRef = wallEntityWidthConstraintId(entity.id)
        actions.addConstraint({ id: widthRef, type: 'p2p_distance', p1_id: startRef, p2_id: endRef, distance: width })
        entry.constraintIds.push(widthRef)
      }

      for (const wall of walls) {
        const startRef = nodeRefSidePointId(wall.startCornerId)
        const startNonRef = nodeNonRefSidePointForNextWall(wall.startCornerId)
        const endRef = nodeRefSidePointId(wall.endCornerId)
        const endNonRef = nodeNonRefSidePointForPrevWall(wall.endCornerId)

        const startNonRefProj = wallNonRefSideProjectedPoint(wall.id, 'start')
        const endNonRefProj = wallNonRefSideProjectedPoint(wall.id, 'end')

        const refLine = isRefInside ? wall.insideLine : wall.outsideLine
        const startCorner = cornerGeomMap.get(wall.startCornerId)
        if (!startCorner) throw new Error(`Missing corner ${wall.startCornerId}`)
        const startPoint = isRefInside ? startCorner.outsidePoint : startCorner.insidePoint
        const startProjected = scaleAddVec2(
          refLine.start,
          wall.direction,
          projectVec2(refLine.start, startPoint, wall.direction)
        )
        actions.addPoint(startNonRefProj, startProjected)

        const endCorner = cornerGeomMap.get(wall.endCornerId)
        if (!endCorner) throw new Error(`Missing corner ${wall.endCornerId}`)
        const endPoint = isRefInside ? endCorner.outsidePoint : endCorner.insidePoint
        const endProjected = scaleAddVec2(
          refLine.end,
          wall.direction,
          projectVec2(refLine.end, endPoint, wall.direction)
        )
        actions.addPoint(endNonRefProj, endProjected)
        entry.pointIds.push(startNonRefProj, endNonRefProj)

        const refLineId = wallRefLineId(wall.id)
        const nonRefLineId = wallNonRefLineId(wall.id)
        actions.addLine(refLineId, startRef, endRef)
        actions.addLine(nonRefLineId, startNonRef, endNonRef)
        entry.lineIds.push(refLineId, nonRefLineId)

        const projStartOnLineId = `${wall.id}_proj_start_on_line`
        actions.addConstraint({
          id: projStartOnLineId,
          type: 'point_on_line_pl',
          p_id: startNonRefProj,
          l_id: refLineId
        })
        const projStartPerpId = `${wall.id}_proj_start_perp`
        actions.addConstraint({
          id: projStartPerpId,
          type: 'perpendicular_pppp',
          l1p1_id: startNonRefProj,
          l1p2_id: startNonRef,
          l2p1_id: startRef,
          l2p2_id: endRef
        })

        const projEndOnLineId = `${wall.id}_proj_end_on_line`
        actions.addConstraint({
          id: projEndOnLineId,
          type: 'point_on_line_pl',
          p_id: endNonRefProj,
          l_id: refLineId
        })
        const projEndPerpId = `${wall.id}_proj_end_perp`
        actions.addConstraint({
          id: projEndPerpId,
          type: 'perpendicular_pppp',
          l1p1_id: endNonRefProj,
          l1p2_id: endNonRef,
          l2p1_id: startRef,
          l2p2_id: endRef
        })

        const parallelId = `${wall.id}_parallel`
        actions.addConstraint({
          id: parallelId,
          type: 'parallel',
          l1_id: refLineId,
          l2_id: nonRefLineId
        })

        const thicknessId = `${wall.id}_thickness`
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: startNonRef,
          l_id: refLineId,
          distance: wall.thickness
        })
        entry.constraintIds.push(
          parallelId,
          thicknessId,
          projStartOnLineId,
          projEndOnLineId,
          projStartPerpId,
          projEndPerpId
        )

        for (const opening of modelActions.getWallOpeningsByWallId(wall.id)) {
          addWallEntityGeometry(opening, entry)
        }

        for (const post of modelActions.getWallPostsByWallId(wall.id)) {
          addWallEntityGeometry(post, entry)
        }
      }

      const wallNodes = perimeter.wallNodeIds.map(nodeId => modelActions.getWallNodeById(nodeId))
      const intermediateWalls = perimeter.intermediateWallIds.map(wallId =>
        modelActions.getIntermediateWallById(wallId)
      )

      for (const node of wallNodes) {
        const nodePointId = wallNodeRefPointId(node.id)
        actions.addPoint(nodePointId, node.position, false)
        entry.pointIds.push(nodePointId)

        const n = node.incidentWalls.length

        if (node.type === 'inner' && n === 1) {
          const otherPointId = wallNodePointId(node.id, 0)
          const incident = node.incidentWalls[0]
          const wall = intermediateWalls.find(w => w.id === incident.id)
          if (!wall) continue
          const otherPoint =
            wall.start.nodeId === node.id
              ? wall.start.axis === 'left'
                ? wall.rightLine.start
                : wall.leftLine.start
              : wall.end.axis === 'left'
                ? wall.rightLine.end
                : wall.leftLine.end
          actions.addPoint(otherPointId, otherPoint, false)
          entry.pointIds.push(otherPointId)
          continue
        }

        let insideLineStart = ''
        let insideLineEnd = ''
        for (let i = 0; i < n; i++) {
          const incident = node.incidentWalls[i]
          const pointId = wallNodePointId(node.id, i)
          const iNext = (i + 1) % n
          const next = node.incidentWalls[iNext]
          if (isPerimeterWallId(incident.id)) {
            if (!isPerimeterWallId(next.id)) {
              insideLineEnd = wallNodePointId(node.id, iNext)
            }
            continue
          }

          const wall = intermediateWalls.find(w => w.id === incident.id)
          if (!wall) continue

          if (isPerimeterWallId(next.id)) {
            const nextPoint = wall.start.nodeId === node.id ? wall.rightLine.start : wall.leftLine.end
            const nextPointId = wallNodePointId(node.id, iNext)
            actions.addPoint(nextPointId, nextPoint, false)
            entry.pointIds.push(nextPointId)
            insideLineStart = nextPointId
          }

          const point = wall.start.nodeId === node.id ? wall.leftLine.start : wall.rightLine.end
          actions.addPoint(pointId, point, false)
          entry.pointIds.push(pointId)
        }

        if (insideLineStart && insideLineEnd) {
          const insideLineId = wallNodeInsideLineId(node.id)
          actions.addLine(insideLineId, insideLineStart, insideLineEnd)
          entry.lineIds.push(insideLineId)

          if (node.type === 'perimeter') {
            const perimeterWall = walls.find(wall => wall.id === node.wallId)
            if (!perimeterWall) continue

            const outsideStart = wallNodeOutsidePointId(node.id, 'start')
            const outsideEnd = wallNodeOutsidePointId(node.id, 'end')
            const projectToOutsideLine = (point: Vec2): Vec2 =>
              scaleAddVec2(
                perimeterWall.outsideLine.start,
                perimeterWall.direction,
                projectVec2(perimeterWall.outsideLine.start, point, perimeterWall.direction)
              )
            actions.addPoint(outsideStart, projectToOutsideLine(node.insideLine.start), false)
            actions.addPoint(outsideEnd, projectToOutsideLine(node.insideLine.end), false)
            entry.pointIds.push(outsideStart, outsideEnd)

            const outsideLineId = wallNodeOutsideLineId(node.id)
            actions.addLine(outsideLineId, outsideStart, outsideEnd)
            entry.lineIds.push(outsideLineId)

            const wallInsideLineId = isRefInside ? wallRefLineId(node.wallId) : wallNonRefLineId(node.wallId)
            const wallOutsideLineId = isRefInside ? wallNonRefLineId(node.wallId) : wallRefLineId(node.wallId)

            const perimeterPointIds =
              node.connectedWallIds.length === 1
                ? [insideLineStart, insideLineEnd]
                : [insideLineStart, insideLineEnd, nodePointId]

            for (const pointId of perimeterPointIds) {
              const onPerimeterId = `${pointId}_on_perimeter`
              actions.addConstraint({
                id: onPerimeterId,
                type: 'point_on_line_pl',
                p_id: pointId,
                l_id: wallInsideLineId,
                driving: true
              })
              entry.constraintIds.push(onPerimeterId)
            }

            for (const [insidePointId, outsidePointId, suffix] of [
              [insideLineStart, outsideStart, 'start'],
              [insideLineEnd, outsideEnd, 'end']
            ] as const) {
              const outsideOnLineId = `${outsideLineId}_${suffix}_on_perimeter`
              const outsidePerpendicularId = `${outsideLineId}_${suffix}_perpendicular`
              actions.addConstraint({
                id: outsideOnLineId,
                type: 'point_on_line_pl',
                p_id: outsidePointId,
                l_id: wallOutsideLineId,
                driving: true
              })
              actions.addConstraint({
                id: outsidePerpendicularId,
                type: 'perpendicular_pppp',
                l1p1_id: insidePointId,
                l1p2_id: outsidePointId,
                l2p1_id: insideLineStart,
                l2p2_id: insideLineEnd,
                driving: true
              })
              entry.constraintIds.push(outsideOnLineId, outsidePerpendicularId)
            }
          }
        }
      }

      const resolveEndpointPointId = (wallId: WallId, endpoint: 'start' | 'end', side: 'ref' | 'nonref'): string => {
        const wall = intermediateWalls.find(candidate => candidate.id === wallId)
        if (!wall) return wallEndpointPointId(wallId, endpoint, side)
        const nodeId = wall[endpoint].nodeId
        const node = wallNodes.find(n => n.id === nodeId)
        if (!node) return wallEndpointPointId(wallId, endpoint, side)
        const incidentWallCount = node.incidentWalls.length
        if (incidentWallCount === 0) return wallEndpointPointId(wallId, endpoint, side)

        if (node.type === 'inner' && incidentWallCount === 1) {
          const useNodeRef = (wall[endpoint].axis === 'left') === (side === 'ref')
          return useNodeRef ? wallNodeRefPointId(node.id) : wallNodePointId(node.id, 0)
        }

        const wallIndex = node.incidentWalls.findIndex(w => w.id === wallId)
        if (wallIndex < 0) return wallEndpointPointId(wallId, endpoint, side)
        const useNextPoint = (endpoint === 'start') === (side === 'nonref')
        const pointIndex = (incidentWallCount + wallIndex + (useNextPoint ? 1 : 0)) % incidentWallCount
        const originalId = wallNodePointId(node.id, pointIndex)
        return originalId
      }

      for (const wall of intermediateWalls) {
        const leftStart = resolveEndpointPointId(wall.id, 'start', 'ref')
        const leftEnd = resolveEndpointPointId(wall.id, 'end', 'ref')
        const rightStart = resolveEndpointPointId(wall.id, 'start', 'nonref')
        const rightEnd = resolveEndpointPointId(wall.id, 'end', 'nonref')
        const rightStartProjected = wallNonRefSideProjectedPoint(wall.id, 'start')
        const rightEndProjected = wallNonRefSideProjectedPoint(wall.id, 'end')
        const projectOntoLeftLine = (point: Vec2): Vec2 =>
          scaleAddVec2(wall.leftLine.start, wall.direction, projectVec2(wall.leftLine.start, point, wall.direction))

        actions.addPoint(rightStartProjected, projectOntoLeftLine(wall.rightLine.start), false)
        actions.addPoint(rightEndProjected, projectOntoLeftLine(wall.rightLine.end), false)
        entry.pointIds.push(rightStartProjected, rightEndProjected)

        const leftLineId = wallRefLineId(wall.id)
        const rightLineId = wallNonRefLineId(wall.id)
        actions.addLine(leftLineId, leftStart, leftEnd)
        actions.addLine(rightLineId, rightStart, rightEnd)
        entry.lineIds.push(leftLineId, rightLineId)

        const parallelSidesId = `${wall.id}_parallel`
        const thicknessId = `${wall.id}_thickness`
        actions.addConstraint({ id: parallelSidesId, type: 'parallel', l1_id: leftLineId, l2_id: rightLineId })
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: rightStart,
          l_id: leftLineId,
          distance: wall.thickness
        })
        entry.constraintIds.push(parallelSidesId, thicknessId)

        const projectedPoints = [
          { id: rightStartProjected, endpoint: rightStart, suffix: 'start' },
          { id: rightEndProjected, endpoint: rightEnd, suffix: 'end' }
        ]
        for (const { id, endpoint, suffix } of projectedPoints) {
          const onLineId = `${wall.id}_proj_${suffix}_on_line`
          const perpendicularId = `${wall.id}_proj_${suffix}_perp`
          actions.addConstraint({ id: onLineId, type: 'point_on_line_pl', p_id: id, l_id: leftLineId })
          actions.addConstraint({
            id: perpendicularId,
            type: 'perpendicular_pppp',
            l1p1_id: id,
            l1p2_id: endpoint,
            l2p1_id: leftStart,
            l2p2_id: leftEnd
          })
          entry.constraintIds.push(onLineId, perpendicularId)
        }

        for (const endpoint of ['start', 'end'] as const) {
          const attachment = wall[endpoint]
          const selectedLineId = attachment.axis === 'left' ? wallRefLineId(wall.id) : wallNonRefLineId(wall.id)
          const nodePointId = wallNodeRefPointId(attachment.nodeId)

          const node = wallNodes.find(n => n.id === attachment.nodeId)
          if (!node) continue
          if (node.type === 'inner' && node.connectedWallIds.length === 1) {
            const otherId = resolveEndpointPointId(wall.id, endpoint === 'start' ? 'end' : 'start', 'ref')
            const perpendicularId = `${node.id}_end_perp`
            actions.addConstraint({
              id: perpendicularId,
              type: 'perpendicular_pppp',
              l1p1_id: nodePointId,
              l1p2_id: otherId,
              l2p1_id: wallNodePointId(node.id, 0),
              l2p2_id: nodePointId,
              driving: true
            })
            entry.constraintIds.push(perpendicularId)
            continue
          }

          const attachmentId = `${wall.id}_${endpoint}_attachment`
          actions.addConstraint({
            id: attachmentId,
            type: 'point_on_line_pl',
            p_id: nodePointId,
            l_id: selectedLineId,
            driving: true
          })
          entry.constraintIds.push(attachmentId)
        }

        for (const opening of modelActions.getWallOpeningsByWallId(wall.id)) {
          addWallEntityGeometry(opening, entry)
        }

        for (const post of modelActions.getWallPostsByWallId(wall.id)) {
          addWallEntityGeometry(post, entry)
        }
      }

      // Add corner structure constraints for non-reference side
      for (const corner of corners) {
        const refPointId = nodeRefSidePointId(corner.id)
        const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
        const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

        const prevWall = walls.find(w => w.endCornerId === corner.id)
        const nextWall = walls.find(w => w.startCornerId === corner.id)

        if (!prevWall || !nextWall) continue

        const isColinear = corner.interiorAngle === 180

        if (isColinear) {
          const prevCornerRefId = nodeRefSidePointId(prevWall.startCornerId)
          const perp1Id = `corner_${corner.id}_nonref_perp1`
          actions.addConstraint({
            id: perp1Id,
            type: 'perpendicular_pppp',
            l1p1_id: prevCornerRefId,
            l1p2_id: refPointId,
            l2p1_id: refPointId,
            l2p2_id: nonRefPrevId,
            driving: true
          })
          entry.constraintIds.push(perp1Id)

          const nextCornerRefId = nodeRefSidePointId(nextWall.endCornerId)
          const perp2Id = `corner_${corner.id}_nonref_perp2`
          actions.addConstraint({
            id: perp2Id,
            type: 'perpendicular_pppp',
            l1p1_id: refPointId,
            l1p2_id: nextCornerRefId,
            l2p1_id: refPointId,
            l2p2_id: nonRefNextId,
            driving: true
          })
          entry.constraintIds.push(perp2Id)
        } else {
          const equalityId = `corner_${corner.id}_nonref_eq`
          actions.addConstraint({
            id: equalityId,
            type: 'p2p_coincident',
            p1_id: nonRefPrevId,
            p2_id: nonRefNextId,
            driving: true
          })
          entry.constraintIds.push(equalityId)
        }
      }

      set(state => ({
        perimeterRegistry: { ...state.perimeterRegistry, [perimeterId]: entry }
      }))
    },

    removePerimeterGeometry: perimeterId => {
      const state = get()
      const { actions } = state

      if (!(perimeterId in state.perimeterRegistry)) {
        console.warn(`Perimeter "${perimeterId}" not found in GCS registry, skipping removal.`)
        return
      }

      const entry = state.perimeterRegistry[perimeterId]
      actions.removeConstraints(entry.constraintIds)
      actions.removeLines(entry.lineIds)
      actions.removePoints(entry.pointIds)

      set(state => {
        const { [perimeterId]: _, ...remainingRegistry } = state.perimeterRegistry
        return {
          perimeterRegistry: remainingRegistry,
          drag: null
        }
      })
    },

    setConstraintStatus: (conflicting, redundant) => {
      set(() => ({
        conflictingConstraintIds: new Set(conflicting),
        redundantConstraintIds: new Set(redundant)
      }))
    },

    setTmpPoints(tmpPoints) {
      set(() => ({ tmpPoints }))
    }
  }
}))

export const useGcsPoints = (): GcsStoreState['points'] => useGcsStore(state => state.tmpPoints ?? state.points)
export const useGcsLines = (): GcsStoreState['lines'] => useGcsStore(state => state.lines)
export const useGcsConstraints = (): GcsStoreState['constraints'] => useGcsStore(state => state.constraints)
export const useGcsBuildingConstraints = (): GcsStoreState['buildingConstraints'] =>
  useGcsStore(state => state.buildingConstraints)
export const useGcsPerimeterRegistry = (): GcsStoreState['perimeterRegistry'] =>
  useGcsStore(state => state.perimeterRegistry)
export const useGcsActions = (): GcsStoreActions => useGcsStore(state => state.actions)

export const useConstraintStatus = (
  constraintId: ConstraintId | undefined
): {
  conflicting: boolean
  redundant: boolean
} => {
  return useGcsStore(
    useShallow(state => {
      if (!constraintId) {
        return { conflicting: false, redundant: false }
      }
      const possibleIds = translatedConstraintIds(constraintId)
      return {
        conflicting: possibleIds.some(id => state.conflictingConstraintIds.has(id)),
        redundant: possibleIds.some(id => state.redundantConstraintIds.has(id))
      }
    })
  )
}

export const useAllConstraintStatus = (): {
  conflictingCount: number
  redundantCount: number
  conflicting: Set<string>
  redundant: Set<string>
} => {
  return useGcsStore(
    useShallow(state => ({
      conflictingCount: state.conflictingConstraintIds.size,
      redundantCount: state.redundantConstraintIds.size,
      conflicting: state.conflictingConstraintIds,
      redundant: state.redundantConstraintIds
    }))
  )
}

export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
