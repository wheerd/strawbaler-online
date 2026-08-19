import { type Constraint, type SketchLine, type SketchPoint } from '@salusoft89/planegcs'
import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

import { referenceSideToConstraintSide } from '@/building/gcs/constraintGenerator'
import type {
  Constraint as BuildingConstraint,
  ConstraintId,
  PerimeterCornerId,
  PerimeterId,
  WallId
} from '@/building/model'
import { isPerimeterWallId } from '@/building/model/ids'
import type { PerimeterCornerWithGeometry } from '@/building/model/perimeters'
import type { OpeningWithGeometry, WallPostWithGeometry } from '@/building/model/wallEntities'
import { getModelActions } from '@/building/store'
import { type Vec2, midpoint, projectVec2, scaleAddVec2, scaleVec2 } from '@/shared/geometry/2d'

import {
  type TranslationContext,
  getReferencedCornerIds,
  getReferencedWallIds,
  intermediateWallEndpointPointId,
  intermediateWallEntityReferencePointId,
  intermediateWallLineId,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  translateBuildingConstraint,
  translatedConstraintIds,
  translatedPointIds,
  wallEntityOnLineConstraintId,
  wallEntityPointId,
  wallEntityWidthConstraintId,
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

      // Check for duplicate
      if (constraint.id in state.buildingConstraints) {
        console.warn(`Building constraint with id "${constraint.id}" already exists, skipping.`)
        return constraint.id
      }

      // Validate that all referenced corners exist as GCS points
      const cornerIds = getReferencedCornerIds(constraint)
      for (const cornerId of cornerIds) {
        const refId = `corner_${cornerId}_ref`
        if (!(refId in state.points)) {
          throw new Error(`Cannot add building constraint: corner "${cornerId}" not found in GCS points.`)
        }
      }

      // Validate that all referenced walls exist as GCS lines
      const wallIds = getReferencedWallIds(constraint)
      for (const wallId of wallIds) {
        const refLineId = `wall_${wallId}_ref`
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
        getWallCornerIds: (wallId: WallId) => {
          try {
            const wall = modelActionsRef.getPerimeterWallById(wallId as `outwall_${string}`)
            return { startCornerId: wall.startCornerId, endCornerId: wall.endCornerId }
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
        getReferenceSide: (cornerId: PerimeterCornerId) => {
          const corner = modelActionsRef.getPerimeterCornerById(cornerId)
          const perimeter = modelActionsRef.getPerimeterById(corner.perimeterId)
          return referenceSideToConstraintSide(perimeter.referenceSide)
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

        // Determine ref vs nonref based on which side is "inside"
        const ref = isRefInside
          ? { start: insideLine.start, center: insideCenter, end: insideLine.end }
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
        const refLineId = isPerimeterWallId(entity.wallId)
          ? wallRefLineId(entity.wallId)
          : intermediateWallLineId(entity.wallId, 'entityReference')

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

      for (const node of wallNodes) {
        const nodePointId = wallNodeRefPointId(node.id)
        actions.addPoint(nodePointId, node.position, false)
        entry.pointIds.push(nodePointId)

        if (node.type === 'perimeter') {
          const perimeterLineId = isRefInside ? wallRefLineId(node.wallId) : wallNonRefLineId(node.wallId)
          const nodeOnPerimeterId = `${nodePointId}_on_perimeter`
          actions.addConstraint({
            id: nodeOnPerimeterId,
            type: 'point_on_line_pl',
            p_id: nodePointId,
            l_id: perimeterLineId,
            driving: true
          })
          entry.constraintIds.push(nodeOnPerimeterId)
        }
      }

      const intermediateWalls = perimeter.intermediateWallIds.map(wallId =>
        modelActions.getIntermediateWallById(wallId)
      )

      for (const wall of intermediateWalls) {
        const leftStart = intermediateWallEndpointPointId(wall.id, 'start', 'left')
        const leftEnd = intermediateWallEndpointPointId(wall.id, 'end', 'left')
        const rightStart = intermediateWallEndpointPointId(wall.id, 'start', 'right')
        const rightEnd = intermediateWallEndpointPointId(wall.id, 'end', 'right')
        const referenceStart = intermediateWallEntityReferencePointId(wall.id, 'start')
        const referenceEnd = intermediateWallEntityReferencePointId(wall.id, 'end')

        actions.addPoint(leftStart, wall.leftLine.start, false)
        actions.addPoint(leftEnd, wall.leftLine.end, false)
        actions.addPoint(rightStart, wall.rightLine.start, false)
        actions.addPoint(rightEnd, wall.rightLine.end, false)
        actions.addPoint(referenceStart, wall.centerLine.start, false)
        actions.addPoint(referenceEnd, wall.centerLine.end, false)
        entry.pointIds.push(leftStart, leftEnd, rightStart, rightEnd, referenceStart, referenceEnd)

        const leftLineId = intermediateWallLineId(wall.id, 'left')
        const rightLineId = intermediateWallLineId(wall.id, 'right')
        const referenceLineId = intermediateWallLineId(wall.id, 'entityReference')
        actions.addLine(leftLineId, leftStart, leftEnd)
        actions.addLine(rightLineId, rightStart, rightEnd)
        actions.addLine(referenceLineId, referenceStart, referenceEnd)
        entry.lineIds.push(leftLineId, rightLineId, referenceLineId)

        const parallelSidesId = `${wall.id}_parallel_sides`
        const parallelReferenceId = `${wall.id}_parallel_entity_reference`
        const thicknessId = `${wall.id}_thickness`
        const referenceOffsetId = `${wall.id}_entity_reference_offset`
        actions.addConstraint({ id: parallelSidesId, type: 'parallel', l1_id: leftLineId, l2_id: rightLineId })
        actions.addConstraint({ id: parallelReferenceId, type: 'parallel', l1_id: referenceLineId, l2_id: leftLineId })
        actions.addConstraint({
          id: thicknessId,
          type: 'p2l_distance',
          p_id: rightStart,
          l_id: leftLineId,
          distance: wall.thickness
        })
        actions.addConstraint({
          id: referenceOffsetId,
          type: 'p2l_distance',
          p_id: referenceStart,
          l_id: leftLineId,
          distance: wall.thickness / 2
        })
        entry.constraintIds.push(parallelSidesId, parallelReferenceId, thicknessId, referenceOffsetId)

        for (const endpoint of ['start', 'end'] as const) {
          const attachment = wall[endpoint]
          const selectedLineId = intermediateWallLineId(wall.id, attachment.axis)
          const nodePointId = wallNodeRefPointId(attachment.nodeId)
          const attachedWallCount = intermediateWalls.filter(
            candidate => candidate.start.nodeId === attachment.nodeId || candidate.end.nodeId === attachment.nodeId
          ).length
          const selectedEndpointPointId = intermediateWallEndpointPointId(wall.id, endpoint, attachment.axis)
          const attachmentId = `${wall.id}_${endpoint}_attachment`
          if (attachedWallCount === 1) {
            actions.addConstraint({
              id: `${attachmentId}_coincident`,
              type: 'p2p_coincident',
              p1_id: selectedEndpointPointId,
              p2_id: nodePointId,
              driving: true
            })
            entry.constraintIds.push(`${attachmentId}_coincident`)
          } else {
            actions.addConstraint({
              id: attachmentId,
              type: 'point_on_line_pl',
              p_id: nodePointId,
              l_id: selectedLineId,
              driving: true
            })
            entry.constraintIds.push(attachmentId)
          }
        }

        for (const opening of modelActions.getWallOpeningsByWallId(wall.id)) {
          addWallEntityGeometry(opening, entry)
        }

        for (const post of modelActions.getWallPostsByWallId(wall.id)) {
          addWallEntityGeometry(post, entry)
        }
      }

      for (const node of wallNodes) {
        const incidents = intermediateWalls
          .filter(wall => wall.start.nodeId === node.id || wall.end.nodeId === node.id)
          .map(wall => {
            const atStart = wall.start.nodeId === node.id
            const direction = atStart ? wall.direction : scaleVec2(wall.direction, -1)
            return {
              wall,
              direction,
              leftPoint: intermediateWallEndpointPointId(
                wall.id,
                atStart ? 'start' : 'end',
                atStart ? 'left' : 'right'
              ),
              rightPoint: intermediateWallEndpointPointId(
                wall.id,
                atStart ? 'start' : 'end',
                atStart ? 'right' : 'left'
              )
            }
          })
          .sort((a, b) => Math.atan2(b.direction[1], b.direction[0]) - Math.atan2(a.direction[1], a.direction[0]))

        if (incidents.length < 2) continue
        for (let index = 0; index < incidents.length; index++) {
          const current = incidents[index]
          const next = incidents[(index + 1) % incidents.length]
          const coincidentId = `${node.id}_corner_${index}`
          actions.addConstraint({
            id: coincidentId,
            type: 'p2p_coincident',
            p1_id: current.rightPoint,
            p2_id: next.leftPoint,
            driving: true
          })
          entry.constraintIds.push(coincidentId)
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
} => {
  return useGcsStore(
    useShallow(state => ({
      conflictingCount: state.conflictingConstraintIds.size,
      redundantCount: state.redundantConstraintIds.size
    }))
  )
}

export const getGcsActions = (): GcsStoreActions => useGcsStore.getState().actions
export const getGcsState = (): GcsStoreState => useGcsStore.getState()
