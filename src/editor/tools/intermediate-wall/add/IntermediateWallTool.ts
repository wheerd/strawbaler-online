import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/config/store'
import { type SnapCandidate } from '@/editor/canvas/services/SnappingService'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import {
  BasePolylineTool,
  type PolylineToolStateBase,
  type PolylineValidationContext
} from '@/editor/tools/shared/polyline/BasePolylineTool'
import type { ToolSystem } from '@/editor/tools/system/ToolSystem'
import type { ToolImplementation } from '@/editor/tools/system/types'
import { type Length, type LineSegment2D, type Vec2, distanceToLineSegment, newVec2 } from '@/shared/geometry'
import { isPointInPolygon } from '@/shared/geometry/polygon'

import { IntermediateWallToolInspector } from './IntermediateWallToolInspector'
import { IntermediateWallToolOverlay } from './IntermediateWallToolOverlay'

interface IntermediateWallToolState extends PolylineToolStateBase {
  thickness: Length
}

const SNAP_TOLERANCE = 200

export class IntermediateWallTool extends BasePolylineTool<IntermediateWallToolState> implements ToolImplementation {
  readonly id = 'intermediate-wall.add'
  readonly overlayComponent = IntermediateWallToolOverlay
  readonly inspectorComponent = IntermediateWallToolInspector

  constructor(toolSystem: ToolSystem) {
    super(toolSystem, {
      thickness: 120
    })
  }

  public setThickness(thickness: Length): void {
    this.state.thickness = thickness
    this.triggerRender()
  }

  protected onToolActivated(): void {
    getViewModeActions().ensureMode('walls')
    const configStore = getConfigActions()
    this.state.thickness = configStore.getDefaultInteriorWallThickness() ?? 120
    this.updateValidationContext()
  }

  protected createInitialValidationContext(): PolylineValidationContext {
    return {
      existingWalls: []
    }
  }

  protected updateValidationContext(): void {
    const modelActions = getModelActions()
    const walls = modelActions.getAllIntermediateWalls()
    this.state.validationContext.existingWalls = walls.map(w => ({
      centerLine: w.geometry.centerLine
    }))
  }

  protected extendSnapCandidates(candidates: SnapCandidate<void>[]): SnapCandidate<void>[] {
    const modelActions = getModelActions()
    const perimeters = modelActions.getAllPerimeters()
    const walls = modelActions.getAllIntermediateWalls()
    const wallNodes = modelActions.getAllWallNodes()

    const extended = [...candidates]

    for (const wall of walls) {
      extended.push({ type: 'point', position: wall.geometry.centerLine.start, mode: 'snap' })
      extended.push({ type: 'point', position: wall.geometry.centerLine.end, mode: 'snap' })
    }

    for (const node of wallNodes) {
      extended.push({ type: 'point', position: node.center, mode: 'snap' })
    }

    for (const wall of walls) {
      extended.push({ type: 'segment', segment: wall.geometry.centerLine })
    }

    for (const perimeter of perimeters) {
      for (let i = 0; i < perimeter.wallIds.length; i++) {
        const wall = modelActions.getPerimeterWallById(perimeter.wallIds[i])
        extended.push({ type: 'segment', segment: wall.insideLine })
      }
    }

    return extended
  }

  protected shouldTerminateAtSnap(
    _snapResult: import('@/editor/canvas/services/SnappingService2').SnapResult<void> | undefined
  ): boolean {
    return false
  }

  protected onPolylineCompleted(points: Vec2[]): void {
    if (points.length < 2) return

    const modelActions = getModelActions()
    const perimeters = modelActions.getAllPerimeters()

    let perimeterId = this.findPerimeterContainingPoint(points[0])
    if (!perimeterId) {
      perimeterId = this.findPerimeterContainingPoint(points[points.length - 1])
    }
    if (!perimeterId) {
      for (const p of perimeters) {
        perimeterId = p.id
        break
      }
    }
    if (!perimeterId) {
      console.error('No perimeter found for intermediate wall')
      return
    }

    for (let i = 0; i < points.length - 1; i++) {
      const startPoint = points[i]
      const endPoint = points[i + 1]

      const startNode = this.getOrCreateNodeForPoint(startPoint, perimeterId)
      const endNode = this.getOrCreateNodeForPoint(endPoint, perimeterId)

      modelActions.addIntermediateWall(
        perimeterId,
        { nodeId: startNode.id, axis: 'center' },
        { nodeId: endNode.id, axis: 'center' },
        this.state.thickness
      )
    }
  }

  private findPerimeterContainingPoint(point: Vec2): import('@/building/model/ids').PerimeterId | null {
    const modelActions = getModelActions()
    const perimeters = modelActions.getAllPerimeters()

    for (const perimeter of perimeters) {
      if (isPointInPolygon(point, perimeter.boundaryPolygon)) {
        return perimeter.id
      }
    }
    return null
  }

  private getOrCreateNodeForPoint(
    point: Vec2,
    perimeterId: import('@/building/model/ids').PerimeterId
  ): { id: import('@/building/model/ids').WallNodeId } {
    const modelActions = getModelActions()

    const perimeterWallNode = this.findPerimeterWallNodeAtPoint(point, perimeterId)
    if (perimeterWallNode) {
      return { id: perimeterWallNode.id }
    }

    const existingWallNode = this.findExistingWallNodeAtPoint(point, perimeterId)
    if (existingWallNode) {
      return { id: existingWallNode.id }
    }

    const intermediateWallSplit = this.findIntermediateWallToSplitAtPoint(point, perimeterId)
    if (intermediateWallSplit) {
      const newNodeId = modelActions.splitIntermediateWallAtPoint(intermediateWallSplit.wallId, point)
      return { id: newNodeId }
    }

    return modelActions.addInnerWallNode(perimeterId, point)
  }

  private findPerimeterWallNodeAtPoint(
    point: Vec2,
    _perimeterId: import('@/building/model/ids').PerimeterId
  ): { id: import('@/building/model/ids').WallNodeId } | null {
    const modelActions = getModelActions()
    const perimeters = modelActions.getAllPerimeters()

    for (const perimeter of perimeters) {
      for (const wallId of perimeter.wallIds) {
        const wall = modelActions.getPerimeterWallById(wallId)
        const distStart = distanceToLineSegment(point, wall.insideLine)
        const distEnd = distanceToLineSegment(point, wall.insideLine)

        if (distStart < SNAP_TOLERANCE || distEnd < SNAP_TOLERANCE) {
          const distToInsideLine = distanceToLineSegment(point, wall.insideLine)
          if (distToInsideLine < SNAP_TOLERANCE) {
            const wallLength = wall.insideLength
            const t = this.calculateParametricPosition(point, wall.insideLine)
            const offset = Math.round(t * wallLength)

            const existingNodes = modelActions.getWallNodesByPerimeter(perimeter.id)
            for (const node of existingNodes) {
              if (
                node.type === 'perimeter' &&
                node.wallId === wallId &&
                Math.abs(node.offsetFromCornerStart - offset) < SNAP_TOLERANCE
              ) {
                return { id: node.id }
              }
            }

            const newNode = modelActions.addPerimeterWallNode(perimeter.id, wallId, offset)
            return { id: newNode.id }
          }
        }
      }
    }
    return null
  }

  private findExistingWallNodeAtPoint(
    point: Vec2,
    perimeterId: import('@/building/model/ids').PerimeterId
  ): { id: import('@/building/model/ids').WallNodeId } | null {
    const modelActions = getModelActions()
    const nodes = modelActions.getWallNodesByPerimeter(perimeterId)

    for (const node of nodes) {
      const dist = Math.sqrt((point[0] - node.center[0]) ** 2 + (point[1] - node.center[1]) ** 2)
      if (dist < SNAP_TOLERANCE) {
        return { id: node.id }
      }
    }
    return null
  }

  private findIntermediateWallToSplitAtPoint(
    point: Vec2,
    perimeterId: import('@/building/model/ids').PerimeterId
  ): { wallId: import('@/building/model/ids').IntermediateWallId } | null {
    const modelActions = getModelActions()
    const walls = modelActions.getIntermediateWallsByPerimeter(perimeterId)

    for (const wall of walls) {
      const dist = distanceToLineSegment(point, wall.geometry.centerLine)
      if (dist < SNAP_TOLERANCE) {
        const centerLine = wall.geometry.centerLine
        const lineLength = Math.sqrt(
          (centerLine.end[0] - centerLine.start[0]) ** 2 + (centerLine.end[1] - centerLine.start[1]) ** 2
        )
        const distToStart = Math.sqrt((point[0] - centerLine.start[0]) ** 2 + (point[1] - centerLine.start[1]) ** 2)
        const distToEnd = Math.sqrt((point[0] - centerLine.end[0]) ** 2 + (point[1] - centerLine.end[1]) ** 2)

        if (distToStart > SNAP_TOLERANCE && distToEnd > SNAP_TOLERANCE && lineLength > SNAP_TOLERANCE * 2) {
          return { wallId: wall.id }
        }
      }
    }
    return null
  }

  private calculateParametricPosition(point: Vec2, line: LineSegment2D): number {
    const lineVec = newVec2(line.end[0] - line.start[0], line.end[1] - line.start[1])
    const pointVec = newVec2(point[0] - line.start[0], point[1] - line.start[1])

    const lineLengthSq = lineVec[0] * lineVec[0] + lineVec[1] * lineVec[1]
    if (lineLengthSq === 0) return 0

    const dot = pointVec[0] * lineVec[0] + pointVec[1] * lineVec[1]
    return Math.max(0, Math.min(1, dot / lineLengthSq))
  }
}
