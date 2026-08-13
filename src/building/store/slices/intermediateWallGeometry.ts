import isDeepEqual from 'fast-deep-equal'

import type { Perimeter } from '@/building/model'
import type { IntermediateWallId, PerimeterId, WallNodeId } from '@/building/model/ids'
import { isOpeningId } from '@/building/model/ids'
import type {
  InnerWallNode,
  InnerWallNodeGeometry,
  IntermediateWall,
  IntermediateWallGeometry,
  PerimeterWallNode,
  PerimeterWallNodeGeometry,
  WallAxis
} from '@/building/model/rooms'
import type { IntermediateWallsState } from '@/building/store/slices/intermediateWallsSlice'
import type { PerimetersState } from '@/building/store/slices/perimeterSlice'
import type { TimestampsState } from '@/building/store/slices/timestampsSlice'
import { updateTimestampDraft } from '@/building/store/slices/timestampsSlice'
import type { WallEntitiesState } from '@/building/store/slices/wallEntitiesSlice'
import {
  type Length,
  type Line2D,
  type Vec2,
  ZERO_VEC2,
  addVec2,
  direction,
  distVec2,
  dotVec2,
  eqVec2,
  lenVec2,
  lineIntersection,
  midpoint,
  negVec2,
  normVec2,
  perpendicularCCW,
  perpendicularCW,
  projectPointOntoLine,
  projectVec2,
  scaleAddVec2,
  scaleVec2,
  subVec2
} from '@/shared/geometry'
import { ensurePolygonIsClockwise } from '@/shared/geometry/polygon'

import { updateEntityGeometry } from './perimeterGeometry'

const COLINEAR_POINT_OFFSET = 10

export function updateAllWallNodeGeometry(
  state: IntermediateWallsState & PerimetersState & WallEntitiesState & TimestampsState,
  perimeterId: PerimeterId
): void {
  if (!(perimeterId in state.perimeters)) return
  const perimeter = state.perimeters[perimeterId]

  const nodePositions = getNodePositions(perimeter, state)
  const wallLines = getWallLines(perimeter, state, nodePositions)

  for (const nodeId of perimeter.wallNodeIds) {
    const node = state.wallNodes[nodeId]

    if (node.type === 'perimeter') {
      updatePerimeterNode(state, node, wallLines, nodePositions)
    } else {
      const connectedWallLines = node.connectedWallIds
        .map(wallId => {
          const lines = wallLines.get(wallId)
          const wall = state.intermediateWalls[wallId]
          if (!lines) return null
          const left = wall.start.nodeId === node.id ? lines.left : lines.right
          const right = wall.start.nodeId === node.id ? lines.right : lines.left
          return { wallId, left, right }
        })
        .filter(item => item != null)

      let points: Vec2[]
      if (connectedWallLines.length === 0) {
        points = [node.position]
      } else if (connectedWallLines.length === 1) {
        points = updateWallEnd(state, connectedWallLines[0], node)
      } else if (connectedWallLines.length === 2) {
        points = updateSimpleCorner(node, connectedWallLines[0], connectedWallLines[1], nodePositions, state)
      } else {
        points = updateComplexCorner(node, connectedWallLines, nodePositions, state)
      }

      const sum = points.reduce((acc, p) => addVec2(acc, p), ZERO_VEC2)
      const centroid = scaleVec2(sum, 1 / points.length)
      const newGeometry: InnerWallNodeGeometry = {
        center: centroid,
        boundary: points.length >= 3 ? ensurePolygonIsClockwise({ points }) : undefined
      }
      state._wallNodeGeometry[nodeId] = newGeometry
    }
  }

  for (const wallId of perimeter.intermediateWallIds) {
    updateWallGeometry(state._intermediateWallGeometry[wallId], state.intermediateWalls[wallId])
  }

  for (const wallId of perimeter.intermediateWallIds) {
    updateIntermediateWallEntities(state, wallId)
  }
}

function updateIntermediateWallEntities(
  state: IntermediateWallsState & PerimetersState & WallEntitiesState & TimestampsState,
  wallId: IntermediateWallId
): void {
  const wall = state.intermediateWalls[wallId]
  const geometry = state._intermediateWallGeometry[wallId]

  const source = {
    insideLine: geometry.leftLine,
    outsideLine: geometry.rightLine,
    direction: geometry.direction
  }

  for (const entityId of wall.entityIds) {
    if (isOpeningId(entityId)) {
      if (!(entityId in state.openings)) continue
      const entity = state.openings[entityId]
      const nextGeometry = updateEntityGeometry(source, entity)
      if (!isGeometryEqual(state._openingGeometry[entityId], nextGeometry)) {
        updateTimestampDraft(state, entityId)
      }
      state._openingGeometry[entityId] = nextGeometry
    } else {
      if (!(entityId in state.wallPosts)) continue
      const entity = state.wallPosts[entityId]
      const nextGeometry = updateEntityGeometry(source, entity)
      if (!isGeometryEqual(state._wallPostGeometry[entityId], nextGeometry)) {
        updateTimestampDraft(state, entityId)
      }
      state._wallPostGeometry[entityId] = nextGeometry
    }
  }
}

function isGeometryEqual(a: unknown, b: unknown): boolean {
  return isDeepEqual(a, b)
}

function updateWallGeometry(geometry: IntermediateWallGeometry, wall: IntermediateWall) {
  const leftStart = geometry.leftLine.start
  const leftEnd = geometry.leftLine.end
  const rightStart = geometry.rightLine.start
  const rightEnd = geometry.rightLine.end
  const halfThickness = wall.thickness / 2

  const center = midpoint(midpoint(leftStart, leftEnd), midpoint(rightStart, rightEnd))
  const leftStartProjection = Math.abs(projectVec2(center, leftStart, geometry.direction))
  const rightStartProjection = Math.abs(projectVec2(center, rightStart, geometry.direction))

  const centerStart =
    leftStartProjection < rightStartProjection
      ? scaleAddVec2(leftStart, geometry.leftDirection, -halfThickness)
      : scaleAddVec2(rightStart, geometry.leftDirection, halfThickness)

  const leftEndProjection = Math.abs(projectVec2(center, leftEnd, geometry.direction))
  const rightEndProjection = Math.abs(projectVec2(center, rightEnd, geometry.direction))

  const centerEnd =
    leftEndProjection < rightEndProjection
      ? scaleAddVec2(leftEnd, geometry.leftDirection, -halfThickness)
      : scaleAddVec2(rightEnd, geometry.leftDirection, halfThickness)

  geometry.centerLine = { start: centerStart, end: centerEnd }
  geometry.wallLength = distVec2(centerStart, centerEnd)
  geometry.leftLength = distVec2(leftStart, leftEnd)
  geometry.rightLength = distVec2(rightStart, rightEnd)
  geometry.boundary = ensurePolygonIsClockwise({ points: [leftStart, leftEnd, rightEnd, rightStart] })
}

function updateComplexCorner(
  node: InnerWallNode,
  connectedWallLines: { left: Line2D; right: Line2D; wallId: IntermediateWallId }[],
  nodePositions: Map<WallNodeId, Vec2>,
  state: IntermediateWallsState & PerimetersState & TimestampsState
) {
  connectedWallLines.sort((a, b) => {
    const aDir = a.left.direction
    const bDir = b.left.direction
    const angleA = Math.atan2(aDir[1], aDir[0])
    const angleB = Math.atan2(bDir[1], bDir[0])
    return angleA - angleB
  })

  const points: Vec2[] = []
  for (let i = 0; i < connectedWallLines.length; i++) {
    const iNext = (i + 1) % connectedWallLines.length
    const a = connectedWallLines[i].right
    const b = connectedWallLines[iNext].left

    let aPos: Vec2, bPos: Vec2

    const dot = dotVec2(a.direction, b.direction)
    if (Math.abs(dot) > 0.99) {
      // Lines are parallel -> add points along the wall line at the node position
      const nodePos = nodePositions.get(node.id)
      if (!nodePos) {
        throw new Error(`Node position not found for node ${node.id}`)
      }

      aPos = projectPointOntoLine(nodePos, a)
      bPos = projectPointOntoLine(nodePos, b)
    } else {
      const intersection = lineIntersection(a, b)
      if (!intersection) {
        throw new Error(`No intersection found between wall lines at node ${node.id}`)
      }
      aPos = intersection
      bPos = intersection
    }

    if (eqVec2(aPos, bPos)) {
      points.push(aPos)
    } else {
      points.push(aPos, bPos)
    }

    const wallAId = connectedWallLines[i].wallId
    const wallA = state.intermediateWalls[wallAId]
    const geometryA = state._intermediateWallGeometry[wallAId]
    if (wallA.start.nodeId === node.id) {
      geometryA.rightLine.start = aPos
    } else {
      geometryA.leftLine.end = aPos
    }

    const wallBId = connectedWallLines[iNext].wallId
    const wallB = state.intermediateWalls[wallBId]
    const geometryB = state._intermediateWallGeometry[wallBId]
    if (wallB.start.nodeId === node.id) {
      geometryB.leftLine.start = bPos
    } else {
      geometryB.rightLine.end = bPos
    }
  }
  return points
}

function updateSimpleCorner(
  node: InnerWallNode,
  a: { left: Line2D; right: Line2D; wallId: IntermediateWallId },
  b: { left: Line2D; right: Line2D; wallId: IntermediateWallId },
  nodePositions: Map<WallNodeId, Vec2>,
  state: IntermediateWallsState & PerimetersState & TimestampsState
) {
  const dot = dotVec2(a.left.direction, b.left.direction)
  if (Math.abs(dot) > 0.99) {
    // Lines are almost parallel -> cutoff perpendicular at the node position
    const nodePos = nodePositions.get(node.id)
    if (!nodePos) {
      throw new Error(`Node position not found for node ${node.id}`)
    }

    const aLeft = scaleAddVec2(a.left.point, a.left.direction, projectVec2(a.left.point, nodePos, a.left.direction))
    const aRight = scaleAddVec2(
      a.right.point,
      a.right.direction,
      projectVec2(a.right.point, nodePos, a.right.direction)
    )

    const wallA = state.intermediateWalls[a.wallId]
    const geometryA = state._intermediateWallGeometry[a.wallId]
    if (wallA.start.nodeId === node.id) {
      geometryA.leftLine.start = aLeft
      geometryA.rightLine.start = aRight
    } else {
      geometryA.leftLine.end = aRight
      geometryA.rightLine.end = aLeft
    }
    const aDir = wallA.start.nodeId === node.id ? negVec2(a.left.direction) : a.left.direction
    const p1 = scaleAddVec2(aLeft, aDir, COLINEAR_POINT_OFFSET)
    const p2 = scaleAddVec2(aRight, aDir, COLINEAR_POINT_OFFSET)

    const bLeft = scaleAddVec2(b.left.point, b.left.direction, projectVec2(b.left.point, nodePos, b.left.direction))
    const bRight = scaleAddVec2(
      b.right.point,
      b.right.direction,
      projectVec2(b.right.point, nodePos, b.right.direction)
    )

    const wallB = state.intermediateWalls[b.wallId]
    const geometryB = state._intermediateWallGeometry[b.wallId]
    if (wallB.start.nodeId === node.id) {
      geometryB.leftLine.start = bLeft
      geometryB.rightLine.start = bRight
    } else {
      geometryB.leftLine.end = bLeft
      geometryB.rightLine.end = bRight
    }
    const bDir = wallB.start.nodeId === node.id ? negVec2(b.left.direction) : b.left.direction
    const p3 = scaleAddVec2(bRight, bDir, COLINEAR_POINT_OFFSET)
    const p4 = scaleAddVec2(bLeft, bDir, COLINEAR_POINT_OFFSET)

    return [p1, p2, p3, p4]
  } else {
    // Lines are not parallel -> use intersection points
    const i1 = lineIntersection(a.left, b.right)
    const i2 = lineIntersection(a.left, b.left)
    const i3 = lineIntersection(a.right, b.left)
    const i4 = lineIntersection(a.right, b.right)

    if (!i1 || !i2 || !i3 || !i4) {
      throw new Error(`Could not compute all intersection points at node ${node.id}`)
    }

    const wallA = state.intermediateWalls[a.wallId]
    const geometryA = state._intermediateWallGeometry[a.wallId]
    if (wallA.start.nodeId === node.id) {
      geometryA.leftLine.start = i2
      geometryA.rightLine.start = i4
    } else {
      geometryA.rightLine.end = i2
      geometryA.leftLine.end = i4
    }

    const wallB = state.intermediateWalls[b.wallId]
    const geometryB = state._intermediateWallGeometry[b.wallId]
    if (wallB.start.nodeId === node.id) {
      geometryB.leftLine.start = i2
      geometryB.rightLine.start = i4
    } else {
      geometryB.leftLine.end = i2
      geometryB.rightLine.end = i4
    }

    return [i1, i2, i3, i4]
  }
}

function updateWallEnd(
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  connectedWall: { left: Line2D; right: Line2D; wallId: IntermediateWallId },
  node: InnerWallNode
) {
  const wall = state.intermediateWalls[connectedWall.wallId]
  const geometry = state._intermediateWallGeometry[connectedWall.wallId]
  const leftLine = connectedWall.left
  const left = scaleAddVec2(
    leftLine.point,
    leftLine.direction,
    projectVec2(leftLine.point, node.position, leftLine.direction)
  )
  const rightLine = connectedWall.right
  const right = scaleAddVec2(
    rightLine.point,
    rightLine.direction,
    projectVec2(rightLine.point, node.position, rightLine.direction)
  )

  if (wall.start.nodeId === node.id) {
    geometry.leftLine.start = left
    geometry.rightLine.start = right
  } else {
    geometry.rightLine.end = left
    geometry.leftLine.end = right
  }

  // TODO: Properly handle single wall case by creating a rectangle based on the wall line and node position
  return [left, right]
}

function updatePerimeterNode(
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  node: PerimeterWallNode,
  wallLines: Map<IntermediateWallId, { left: Line2D; right: Line2D }>,
  nodePositions: Map<WallNodeId, Vec2>
) {
  const wall = state.perimeterWalls[node.wallId]
  const wallGeometry = state._perimeterWallGeometry[node.wallId]
  const start = wallGeometry.insideLine.start

  const nodePos = nodePositions.get(node.id)
  if (!nodePos) {
    throw new Error(`Node position not found for perimeter wall node ${node.id}`)
  }

  if (node.connectedWallIds.length === 0) {
    state._wallNodeGeometry[node.id] = {
      position: nodePos,
      center: nodePos
    }
    return
  }

  let minOffset = Infinity
  let maxOffset = -Infinity
  for (const wallId of node.connectedWallIds) {
    const geometry = wallLines.get(wallId)
    if (!geometry) continue

    const leftIntersection = lineIntersection({ point: start, direction: wallGeometry.direction }, geometry.left)
    if (leftIntersection) {
      const projection = projectVec2(start, leftIntersection, wallGeometry.direction)
      minOffset = Math.min(minOffset, projection)
      maxOffset = Math.max(maxOffset, projection)
    }

    const rightIntersection = lineIntersection({ point: start, direction: wallGeometry.direction }, geometry.right)
    if (rightIntersection) {
      const projection = projectVec2(start, rightIntersection, wallGeometry.direction)
      minOffset = Math.min(minOffset, projection)
      maxOffset = Math.max(maxOffset, projection)
    }

    if (leftIntersection && rightIntersection) {
      const iWall = state.intermediateWalls[wallId]
      if (iWall.start.nodeId === node.id) {
        state._intermediateWallGeometry[wallId].leftLine.start = leftIntersection
        state._intermediateWallGeometry[wallId].rightLine.start = rightIntersection
      } else {
        state._intermediateWallGeometry[wallId].leftLine.end = leftIntersection
        state._intermediateWallGeometry[wallId].rightLine.end = rightIntersection
      }
    }
  }

  const minInside = scaleAddVec2(start, wallGeometry.direction, minOffset)
  const maxInside = scaleAddVec2(start, wallGeometry.direction, maxOffset)
  const minOutside = scaleAddVec2(minInside, wallGeometry.outsideDirection, wall.thickness)
  const maxOutside = scaleAddVec2(maxInside, wallGeometry.outsideDirection, wall.thickness)

  const newGeometry: PerimeterWallNodeGeometry = {
    position: nodePos,
    center: midpoint(minInside, maxOutside),
    boundary: ensurePolygonIsClockwise({
      points: [minInside, maxInside, maxOutside, minOutside]
    })
  }

  state._wallNodeGeometry[node.id] = newGeometry
}

function getWallLines(
  perimeter: Perimeter,
  state: IntermediateWallsState & PerimetersState & TimestampsState,
  nodePositions: Map<WallNodeId, Vec2>
) {
  const wallLines = new Map<IntermediateWallId, { left: Line2D; right: Line2D }>()
  for (const wallId of perimeter.intermediateWallIds) {
    const wall = state.intermediateWalls[wallId]
    const startPos = nodePositions.get(wall.start.nodeId)
    const endPos = nodePositions.get(wall.end.nodeId)
    if (!startPos || !endPos) continue

    const lines = computeWallLines(startPos, wall.start.axis, endPos, wall.end.axis, wall.thickness)

    state._intermediateWallGeometry[wallId] = {
      direction: lines.left.direction,
      leftDirection: perpendicularCCW(lines.left.direction),
      boundary: { points: [] },
      centerLine: { start: ZERO_VEC2, end: ZERO_VEC2 },
      wallLength: 0,
      leftLength: 0,
      leftLine: { start: ZERO_VEC2, end: ZERO_VEC2 },
      rightLength: 0,
      rightLine: { start: ZERO_VEC2, end: ZERO_VEC2 }
    }

    wallLines.set(wallId, lines)
  }

  return wallLines
}

function getNodePositions(perimeter: Perimeter, state: IntermediateWallsState & PerimetersState & TimestampsState) {
  const nodePositions = new Map<WallNodeId, Vec2>()
  for (const nodeId of perimeter.wallNodeIds) {
    const node = state.wallNodes[nodeId]

    if (node.type === 'perimeter') {
      const wallGeometry = state._perimeterWallGeometry[node.wallId]
      const position = scaleAddVec2(wallGeometry.insideLine.start, wallGeometry.direction, node.offsetFromCornerStart)

      nodePositions.set(nodeId, position)
    } else {
      nodePositions.set(nodeId, node.position)
    }
  }
  return nodePositions
}

export function computeWallLines(
  start: Vec2,
  startAxis: WallAxis,
  end: Vec2,
  endAxis: WallAxis,
  thickness: Length
): { left: Line2D; right: Line2D } {
  if (startAxis === endAxis) {
    const dir = direction(start, end)
    const leftDir = perpendicularCCW(dir)
    const halfThickness = thickness / 2

    const leftBase =
      startAxis === 'left'
        ? start
        : startAxis === 'center'
          ? scaleAddVec2(start, leftDir, halfThickness)
          : scaleAddVec2(start, leftDir, thickness)
    const rightBase =
      startAxis === 'right'
        ? start
        : startAxis === 'center'
          ? scaleAddVec2(start, leftDir, -halfThickness)
          : scaleAddVec2(start, leftDir, -thickness)

    return {
      left: { point: leftBase, direction: dir },
      right: { point: rightBase, direction: dir }
    }
  }

  const v = subVec2(end, start)
  const len = lenVec2(v)

  if (thickness > len) {
    throw new Error('Wall thickness larger than distance between points')
  }

  const vDir = normVec2(v)
  const perp = perpendicularCCW(vDir)

  const alpha = thickness / len
  const beta = Math.sqrt(1 - alpha * alpha)

  // normal between the two lines
  const n = addVec2(scaleVec2(vDir, alpha), scaleVec2(perp, beta))

  // direction of both lines
  const dir = perpendicularCW(n)
  const leftDir = perpendicularCCW(dir)

  const leftBase =
    startAxis === 'left'
      ? start
      : endAxis === 'left'
        ? end
        : scaleAddVec2(start, leftDir, startAxis === 'center' ? thickness / 2 : thickness)

  const rightBase =
    startAxis === 'right'
      ? start
      : endAxis === 'right'
        ? end
        : scaleAddVec2(start, leftDir, startAxis === 'center' ? -thickness / 2 : -thickness)

  return {
    left: { point: leftBase, direction: dir },
    right: { point: rightBase, direction: dir }
  }
}
