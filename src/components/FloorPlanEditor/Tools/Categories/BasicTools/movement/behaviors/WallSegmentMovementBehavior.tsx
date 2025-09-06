import type { MovementBehavior, MovementContext, MouseMovementState } from '../MovementBehavior'
import type { SelectableId, OuterWallId, WallSegmentId } from '@/types/ids'
import type { StoreActions } from '@/model/store/types'
import type { OuterWallSegment, OuterWallPolygon } from '@/types/model'
import type { Vec2 } from '@/types/geometry'
import { add, dot, scale, perpendicular, midpoint } from '@/types/geometry'
import { isOuterWallId, isWallSegmentId } from '@/types/ids'
import React from 'react'
import { Group, Line, Circle } from 'react-konva'
import { COLORS } from '@/theme/colors'

// Wall segment movement needs access to the wall to update the boundary
interface WallSegmentEntityContext {
  wall: OuterWallPolygon
  segment: OuterWallSegment
  segmentIndex: number // Index of the segment in the wall
}

// Wall segment movement - move perpendicular to the segment
interface WallSegmentMovementState {
  originalMidpoint: Vec2
  newMidpoint: Vec2
  projectedDistance: number // Distance along perpendicular direction
}

export class WallSegmentMovementBehavior
  implements MovementBehavior<WallSegmentEntityContext, WallSegmentMovementState>
{
  getEntity(entityId: SelectableId, parentIds: SelectableId[], store: StoreActions): WallSegmentEntityContext {
    const parentWallId = parentIds.find(id => isOuterWallId(id as string)) as OuterWallId

    if (!parentWallId || !isWallSegmentId(entityId as string)) {
      throw new Error(`Invalid entity context for segment ${entityId}`)
    }

    const wall = store.getOuterWallById(parentWallId)
    const segment = store.getSegmentById(parentWallId, entityId as WallSegmentId)

    if (!wall || !segment) {
      throw new Error(`Could not find wall or segment ${entityId}`)
    }

    // Find which segment index this is
    const segmentIndex = wall.segments.findIndex(s => s.id === segment.id)
    if (segmentIndex === -1) {
      throw new Error(`Could not find segment index for ${entityId}`)
    }

    return { wall, segment, segmentIndex }
  }

  initializeState(
    _mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const originalMidpoint = midpoint(context.entity.segment.insideLine.start, context.entity.segment.insideLine.end)

    return {
      originalMidpoint,
      newMidpoint: originalMidpoint,
      projectedDistance: 0
    }
  }

  constrainAndSnap(
    mouseState: MouseMovementState,
    context: MovementContext<WallSegmentEntityContext>
  ): WallSegmentMovementState {
    const { segment } = context.entity
    const originalMidpoint = midpoint(segment.insideLine.start, segment.insideLine.end)

    // Get the perpendicular direction to the segment (pointing "outward")
    const perpendicularDirection = perpendicular(segment.direction)

    // Project the mouse delta onto the perpendicular direction
    const projectedDistance = dot(mouseState.delta, perpendicularDirection)

    // Calculate new midpoint
    const newMidpoint = add(originalMidpoint, scale(perpendicularDirection, projectedDistance))

    return {
      originalMidpoint,
      newMidpoint,
      projectedDistance
    }
  }

  validatePosition(
    movementState: WallSegmentMovementState,
    _context: MovementContext<WallSegmentEntityContext>
  ): boolean {
    // For now, allow any movement - TODO: add validation for self-intersections
    const { projectedDistance } = movementState

    // Don't allow zero movement
    if (Math.abs(projectedDistance) < 1) return false

    // TODO: Check that the new boundary wouldn't self-intersect
    return true
  }

  generatePreview(
    movementState: WallSegmentMovementState,
    isValid: boolean,
    context: MovementContext<WallSegmentEntityContext>
  ): React.ReactNode[] {
    const { originalMidpoint, newMidpoint } = movementState

    return [
      <Group key="segment-preview">
        {/* Show the new segment midpoint */}
        <Circle
          key="new-midpoint"
          x={newMidpoint[0]}
          y={newMidpoint[1]}
          radius={4}
          fill={isValid ? COLORS.ui.success : COLORS.ui.danger}
          stroke={COLORS.ui.white}
          strokeWidth={2}
          opacity={0.8}
          listening={false}
        />
        {/* Show movement line */}
        <Line
          key="movement-line"
          points={[originalMidpoint[0], originalMidpoint[1], newMidpoint[0], newMidpoint[1]]}
          stroke={COLORS.ui.gray600}
          strokeWidth={2}
          dash={[5, 5]}
          opacity={0.7}
          listening={false}
        />
        {/* Show the updated wall boundary preview */}
        {this.generateWallBoundaryPreview(movementState, isValid, context)}
      </Group>
    ]
  }

  private generateWallBoundaryPreview(
    movementState: WallSegmentMovementState,
    isValid: boolean,
    context: MovementContext<WallSegmentEntityContext>
  ): React.ReactNode {
    const { wall, segment, segmentIndex } = context.entity
    const { projectedDistance } = movementState

    // Get the perpendicular direction to the segment
    const perpendicularDirection = perpendicular(segment.direction)
    const offset = scale(perpendicularDirection, projectedDistance)

    // Create new boundary by moving the two boundary points of this segment
    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], offset)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      offset
    )

    return (
      <Line
        key="wall-boundary-preview"
        points={newBoundary.flatMap(p => [p[0], p[1]])}
        closed
        stroke={isValid ? COLORS.ui.primary : COLORS.ui.danger}
        strokeWidth={2}
        dash={[8, 4]}
        opacity={0.6}
        listening={false}
      />
    )
  }

  commitMovement(movementState: WallSegmentMovementState, context: MovementContext<WallSegmentEntityContext>): boolean {
    const { wall, segment, segmentIndex } = context.entity
    const { projectedDistance } = movementState

    // Get the perpendicular direction to the segment
    const perpendicularDirection = perpendicular(segment.direction)
    const offset = scale(perpendicularDirection, projectedDistance)

    // Create new boundary by moving the two boundary points of this segment
    const newBoundary = [...wall.boundary]
    newBoundary[segmentIndex] = add(wall.boundary[segmentIndex], offset)
    newBoundary[(segmentIndex + 1) % wall.boundary.length] = add(
      wall.boundary[(segmentIndex + 1) % wall.boundary.length],
      offset
    )

    // Use the store's updateOuterWallBoundary method
    return context.store.updateOuterWallBoundary(wall.id, newBoundary)
  }
}
