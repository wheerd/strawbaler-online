import { gcsService } from '@/building/gcs/service'
import type {
  Constraint,
  IntermediateWall,
  IntermediateWallGeometry,
  Perimeter,
  PerimeterCorner,
  PerimeterId,
  PerimeterWall,
  WallNode,
  WallNodeGeometry
} from '@/building/model'
import { isPerimeterWallId } from '@/building/model/ids'
import type {
  IntermediateWallId,
  PerimeterCornerId,
  PerimeterWallId,
  WallEntityId,
  WallNodeId
} from '@/building/model/ids'
import type { WallEntityGeometry } from '@/building/model/wallEntities'
import {
  getModelActions,
  subscribeToConstraints,
  subscribeToCorners,
  subscribeToIntermediateWallGeometry,
  subscribeToIntermediateWalls,
  subscribeToOpeningGeometry,
  subscribeToPerimeters,
  subscribeToWallNodeGeometry,
  subscribeToWallNodes,
  subscribeToWallOpenings,
  subscribeToWallPostGeometry,
  subscribeToWallPosts,
  subscribeToWalls
} from '@/building/store'
import { midpoint, projectVec2, scaleAddVec2 } from '@/shared/geometry/2d'

import {
  getReferencedCornerIds,
  getReferencedWallIds,
  getReferencedWallNodeIds,
  nodeNonRefSidePointForNextWall,
  nodeNonRefSidePointForPrevWall,
  nodeRefSidePointId,
  wallEndpointPointId,
  wallEntityPointId,
  wallEntityWidthConstraintId,
  wallNodeInsideLineId,
  wallNodeRefPointId,
  wallNonRefLineId,
  wallNonRefSideProjectedPoint,
  wallRefLineId
} from './constraintTranslator'
import { getGcsActions, getGcsState } from './store'

class GcsSyncService {
  constructor() {
    this.setupSubscriptions()
    this.initializeAllPerimeters()
  }

  private setupSubscriptions(): void {
    subscribeToPerimeters((id, current, previous) => {
      this.handlePerimeterChange(id, current, previous)
    })

    subscribeToConstraints((_id, current, previous) => {
      this.handleConstraintChange(current, previous)
    })

    subscribeToCorners((_id, current, previous) => {
      this.handleCornerChange(current, previous)
    })

    subscribeToWalls((_id, current, previous) => {
      this.handleWallChange(current, previous)
    })

    subscribeToIntermediateWalls((_id, current, previous) => {
      this.handleIntermediateWallChange(current, previous)
    })

    subscribeToWallNodes((_id, current, previous) => {
      this.handleWallNodeChange(current, previous)
    })

    subscribeToWallOpenings((id, current, previous) => {
      if (!current || !previous) return
      if (current.width !== previous.width) {
        this.updateEntityWidthConstraint(id, current.width)
        gcsService.triggerSolve()
      }
    })

    subscribeToWallPosts((id, current, previous) => {
      if (!current || !previous) return
      if (current.width !== previous.width) {
        this.updateEntityWidthConstraint(id, current.width)
        gcsService.triggerSolve()
      }
    })

    subscribeToOpeningGeometry(this.handleWallEntityGeometryChange.bind(this))
    subscribeToWallPostGeometry(this.handleWallEntityGeometryChange.bind(this))
    subscribeToIntermediateWallGeometry(this.handleIntermediateWallGeometryChange.bind(this))
    subscribeToWallNodeGeometry(this.handleWallNodeGeometryChange.bind(this))
  }

  private initializeAllPerimeters(): void {
    const gcsActions = getGcsActions()
    const modelActions = getModelActions()

    // Add all perimeters from all storeys
    const allPerimeters = modelActions.getAllPerimeters()
    for (const perimeter of allPerimeters) {
      gcsActions.addPerimeterGeometry(perimeter.id)
      this.syncConstraintsForPerimeter(perimeter.id)
    }
  }

  private handlePerimeterChange(perimeterId: PerimeterId, current?: Perimeter, previous?: Perimeter): void {
    const gcsActions = getGcsActions()

    if (!current && previous) {
      // Perimeter removed — clean up if it was tracked
      if (perimeterId in getGcsState().perimeterRegistry) {
        gcsActions.removePerimeterGeometry(perimeterId)
      }
    } else if (current && !previous) {
      // Perimeter added — always add geometry and sync constraints
      gcsActions.addPerimeterGeometry(perimeterId)
      this.syncConstraintsForPerimeter(perimeterId)
    } else if (current && previous) {
      // Perimeter updated (e.g. corner removed → cornerIds/wallIds changed)
      // addPerimeterGeometry handles upsert (removes old data first)
      gcsActions.addPerimeterGeometry(perimeterId)
      this.syncConstraintsForPerimeter(perimeterId)
    }
  }

  /**
   * After addPerimeterGeometry creates/recreates GCS points and lines for a perimeter,
   * ensure all building constraints from the model store that reference this perimeter's
   * entities are present in the GCS store. This handles cases where the constraint
   * subscription fires before geometry exists (e.g. during redo) or where an upsert
   * rebuilds geometry that existing translated constraints reference.
   *
   * The GCS store's addBuildingConstraint has a duplicate check, so re-adding
   * constraints that are already present is harmless (logs a warning and returns).
   */
  private syncConstraintsForPerimeter(perimeterId: PerimeterId): void {
    const modelActions = getModelActions()
    const gcsActions = getGcsActions()

    // Collect the set of corner and wall IDs belonging to this perimeter
    const perimeter = modelActions.getPerimeterById(perimeterId)
    const perimeterCornerIds = new Set<PerimeterCornerId>(perimeter.cornerIds)
    const perimeterWallIds = new Set<PerimeterWallId>(perimeter.wallIds)
    const intermediateWallIds = new Set<IntermediateWallId>(perimeter.intermediateWallIds)
    const wallNodeIds = new Set<WallNodeId>(perimeter.wallNodeIds)

    // Find all model-store constraints that reference any of these entities
    const allConstraints = modelActions.getAllBuildingConstraints()
    for (const constraint of allConstraints) {
      const referencedCorners = getReferencedCornerIds(constraint)
      const referencedWalls = getReferencedWallIds(constraint)
      const referencedWallNodes = getReferencedWallNodeIds(constraint)

      const referencesPerimeter =
        referencedCorners.some(c => perimeterCornerIds.has(c)) ||
        referencedWalls.some(
          w => (isPerimeterWallId(w) && perimeterWallIds.has(w)) || intermediateWallIds.has(w as IntermediateWallId)
        ) ||
        referencedWallNodes.some(node => wallNodeIds.has(node))

      if (referencesPerimeter) {
        try {
          gcsActions.addBuildingConstraint({ ...constraint })
        } catch (e) {
          // This can happen if the constraint references entities from multiple
          // perimeters and the other perimeter's geometry doesn't exist yet.
          // It will be synced when that other perimeter's geometry is created.
          console.warn(`Failed to sync building constraint to GCS store:`, e)
        }
      }
    }
  }

  private handleConstraintChange(current?: Constraint, previous?: Constraint): void {
    const gcsActions = getGcsActions()

    if (previous) {
      gcsActions.removeBuildingConstraint(previous.id)
    }

    if (current) {
      try {
        gcsActions.addBuildingConstraint({ ...current })
      } catch (e) {
        console.warn(`Failed to add building constraint to GCS store (will be synced by perimeter):`, e)
      }
    }
  }

  private handleCornerChange(current?: PerimeterCorner, previous?: PerimeterCorner): void {
    // Only handle updates — additions/removals are covered by the perimeter subscription
    // (which fires when cornerIds changes on the Perimeter record).
    if (!current || !previous) return

    const cornerId = current.id
    const perimeterId = current.perimeterId
    const { perimeterRegistry } = getGcsState()
    const { getPerimeterCornerById, getPerimeterById, getPerimeterWallById } = getModelActions()
    const { updatePointPosition } = getGcsActions()

    // Only update if this corner's perimeter is currently tracked
    if (!(perimeterId in perimeterRegistry)) return

    // Read the fresh computed geometry (insidePoint/outsidePoint derived from referencePoint)
    const corner = getPerimeterCornerById(cornerId)
    const perimeter = getPerimeterById(perimeterId)

    const refPointId = nodeRefSidePointId(corner.id)
    const nonRefPrevId = nodeNonRefSidePointForPrevWall(corner.id)
    const nonRefNextId = nodeNonRefSidePointForNextWall(corner.id)

    const isRefInside = perimeter.referenceSide === 'inside'
    const refPos = isRefInside ? corner.insidePoint : corner.outsidePoint
    const nonRefPos = isRefInside ? corner.outsidePoint : corner.insidePoint

    updatePointPosition(refPointId, refPos)

    const prevWall = getPerimeterWallById(corner.previousWallId)
    const nextWall = getPerimeterWallById(corner.nextWallId)

    if (corner.interiorAngle !== 180) {
      updatePointPosition(nonRefPrevId, nonRefPos)
      updatePointPosition(nonRefNextId, nonRefPos)
    } else {
      const prevPos = scaleAddVec2(
        refPos,
        prevWall.outsideDirection,
        isRefInside ? prevWall.thickness : -prevWall.thickness
      )
      updatePointPosition(nonRefPrevId, prevPos)

      const nextPos = scaleAddVec2(
        refPos,
        nextWall.outsideDirection,
        isRefInside ? nextWall.thickness : -nextWall.thickness
      )
      updatePointPosition(nonRefNextId, nextPos)
    }

    const nonRefPoint = isRefInside ? corner.outsidePoint : corner.insidePoint
    const prevRefLine = isRefInside ? prevWall.insideLine : prevWall.outsideLine
    const prevProjected = scaleAddVec2(
      prevRefLine.start,
      prevWall.direction,
      projectVec2(prevRefLine.start, nonRefPoint, prevWall.direction)
    )
    updatePointPosition(wallNonRefSideProjectedPoint(prevWall.id, 'end'), prevProjected)

    const nextRefLine = isRefInside ? nextWall.insideLine : nextWall.outsideLine
    const nextProjected = scaleAddVec2(
      nextRefLine.start,
      nextWall.direction,
      projectVec2(nextRefLine.start, nonRefPoint, nextWall.direction)
    )
    updatePointPosition(wallNonRefSideProjectedPoint(nextWall.id, 'start'), nextProjected)
  }

  private handleWallChange(current?: PerimeterWall, previous?: PerimeterWall): void {
    // Only handle updates — additions/removals are covered by the perimeter subscription
    if (!current || !previous) return

    // Only handle thickness or wall entity changes
    if (
      current.thickness === previous.thickness &&
      current.entityIds.length === previous.entityIds.length &&
      current.entityIds.every(id => previous.entityIds.includes(id))
    )
      return

    getGcsActions().addPerimeterGeometry(current.perimeterId)

    if (current.thickness !== previous.thickness) {
      gcsService.triggerSolve()
    }
  }

  private handleIntermediateWallChange(current?: IntermediateWall, previous?: IntermediateWall): void {
    // Only handle updates — additions/removals are covered by the perimeter subscription
    if (!current || !previous) return

    // Only handle thickness or wall entity changes
    if (
      current.thickness === previous.thickness &&
      current.entityIds.length === previous.entityIds.length &&
      current.entityIds.every(id => previous.entityIds.includes(id))
    )
      return

    getGcsActions().addPerimeterGeometry(current.perimeterId)

    if (current.thickness !== previous.thickness) {
      gcsService.triggerSolve()
    }
  }

  private handleWallNodeChange(current?: WallNode, previous?: WallNode): void {
    // Only handle updates — additions/removals are covered by the perimeter subscription
    if (!current || !previous) return

    // Only update if this node's perimeter is currently tracked
    if (!(current.perimeterId in getGcsState().perimeterRegistry)) return

    if ('position' in current) {
      getGcsActions().updatePointPosition(wallNodeRefPointId(current.id), current.position)
    }
  }

  private handleIntermediateWallGeometryChange(
    id: IntermediateWallId,
    current?: IntermediateWallGeometry,
    _previous?: IntermediateWallGeometry
  ): void {
    if (!current) return

    const wall = getModelActions().getIntermediateWallById(id)
    const state = getGcsState()
    if (!(wall.perimeterId in state.perimeterRegistry)) return

    const { updatePointPosition } = getGcsActions()

    const resolveEndpoint = (endpoint: 'start' | 'end', side: 'ref' | 'nonref'): string => {
      const lineId = side === 'ref' ? wallRefLineId(id) : wallNonRefLineId(id)
      const line = state.lines.find(l => l.id === lineId)
      if (!line) return wallEndpointPointId(id, endpoint, side)
      return endpoint === 'start' ? line.p1_id : line.p2_id
    }
    updatePointPosition(resolveEndpoint('start', 'ref'), current.leftLine.start)
    updatePointPosition(resolveEndpoint('end', 'ref'), current.leftLine.end)
    updatePointPosition(resolveEndpoint('start', 'nonref'), current.rightLine.start)
    updatePointPosition(resolveEndpoint('end', 'nonref'), current.rightLine.end)

    const projectOntoLeftLine = (point: typeof current.leftLine.start) =>
      scaleAddVec2(
        current.leftLine.start,
        current.direction,
        projectVec2(current.leftLine.start, point, current.direction)
      )
    updatePointPosition(wallNonRefSideProjectedPoint(id, 'start'), projectOntoLeftLine(current.rightLine.start))
    updatePointPosition(wallNonRefSideProjectedPoint(id, 'end'), projectOntoLeftLine(current.rightLine.end))
  }

  private handleWallNodeGeometryChange(id: WallNodeId, current?: WallNodeGeometry, _previous?: WallNodeGeometry): void {
    if (!current) return

    const node = getModelActions().getWallNodeById(id)
    if (!(node.perimeterId in getGcsState().perimeterRegistry)) return

    if ('position' in current) {
      const insideLine = getGcsState().lines.find(line => line.id === wallNodeInsideLineId(id))
      getGcsActions().updatePointPosition(wallNodeRefPointId(id), current.position)
      if (insideLine) {
        getGcsActions().updatePointPosition(insideLine.p1_id, current.insideLine.start)
        getGcsActions().updatePointPosition(insideLine.p2_id, current.insideLine.end)
      }
    }
  }

  private updateEntityWidthConstraint(entityId: WallEntityId, width: number): void {
    const gcsActions = getGcsActions()
    const refStart = wallEntityPointId(entityId, 'start')
    const refEnd = wallEntityPointId(entityId, 'end')
    const constraintId = wallEntityWidthConstraintId(entityId)

    gcsActions.removeConstraints([constraintId])
    gcsActions.addConstraint({
      id: constraintId,
      type: 'p2p_distance',
      p1_id: refStart,
      p2_id: refEnd,
      distance: width,
      driving: true
    })
  }

  private handleWallEntityGeometryChange(
    id: WallEntityId,
    current?: WallEntityGeometry,
    previous?: WallEntityGeometry
  ): void {
    const { updatePointPosition } = getGcsActions()
    if (!current || !previous) return
    const { getWallEntityById } = getModelActions()

    const entity = getWallEntityById(id)
    const perimeter = getModelActions().getPerimeterById(entity.perimeterId)
    const isRefInside = isPerimeterWallId(entity.wallId) ? perimeter.referenceSide === 'inside' : false

    const insideCenter = midpoint(current.insideLine.start, current.insideLine.end)
    const outsideCenter = midpoint(current.outsideLine.start, current.outsideLine.end)

    const ref = isRefInside
      ? {
          start: current.insideLine.start,
          center: insideCenter,
          end: current.insideLine.end
        }
      : {
          start: current.outsideLine.start,
          center: outsideCenter,
          end: current.outsideLine.end
        }

    updatePointPosition(wallEntityPointId(id, 'start'), ref.start)
    updatePointPosition(wallEntityPointId(id, 'center'), ref.center)
    updatePointPosition(wallEntityPointId(id, 'end'), ref.end)
  }
}

// Module-level singleton — subscriptions start at import time.
// The GCS store's add/remove actions only update Zustand state (not the WASM instance),
// so there's no dependency on GCS WASM being loaded.
void new GcsSyncService()
