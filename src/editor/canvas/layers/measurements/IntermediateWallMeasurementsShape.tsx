import { toast } from 'sonner'

import { gcsService } from '@/building/gcs/service'
import { useConstraintStatus } from '@/building/gcs/store'
import type {
  Constraint,
  HorizontalWallConstraint,
  IntermediateWallId,
  VerticalWallConstraint,
  WallLengthConstraint
} from '@/building/model'
import { getModelActions, useConstraintsForEntity, useIntermediateWallById } from '@/building/store'
import { LengthIndicator } from '@/editor/canvas/components/LengthIndicator'
import {
  DIMENSION_DEFAULT_FONT_SIZE,
  DIMENSION_DEFAULT_STROKE_WIDTH,
  WALL_DIM_LAYER_OFFSET
} from '@/editor/canvas/dimensions'
import { ConstraintBadge } from '@/editor/canvas/overlay/ConstraintBadge'
import { activateLengthInput } from '@/editor/canvas/services/length-input'
import { useSelectionStore } from '@/editor/canvas/state/selectionStore'
import { useViewMode } from '@/editor/canvas/state/viewModeStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { type Length, type Vec2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

export function IntermediateWallMeasurementsShape({
  wallId
}: {
  wallId: IntermediateWallId
}): React.JSX.Element | null {
  const mode = useViewMode()
  const wall = useIntermediateWallById(wallId)
  const constraints = useConstraintsForEntity(wallId)
  const { isCurrentSelection } = useSelectionStore()
  const leftConstraint = findLengthConstraint(constraints, wallId, 'left')
  const rightConstraint = findLengthConstraint(constraints, wallId, 'right')
  const hvConstraint = findHVConstraint(constraints, wallId)
  const suggestedHVType = getSuggestedHVType(wall.direction)
  const isSelected = isCurrentSelection(wallId)

  if (mode !== 'walls') return null

  return (
    <>
      {(hvConstraint != null || (isSelected && suggestedHVType != null)) && (
        <IntermediateWallHVConstraintBadge
          wall={wall}
          hvConstraint={hvConstraint}
          suggestedHVType={suggestedHVType}
          isSelected={isSelected}
        />
      )}
      {(isSelected || leftConstraint) && (
        <IntermediateWallLengthIndicator
          wallId={wallId}
          side="left"
          startPoint={wall.leftLine.start}
          endPoint={wall.leftLine.end}
          currentLength={wall.leftLength}
          constraint={leftConstraint}
          isSelected={isSelected}
        />
      )}
      {(isSelected || rightConstraint) && (
        <IntermediateWallLengthIndicator
          wallId={wallId}
          side="right"
          startPoint={wall.rightLine.start}
          endPoint={wall.rightLine.end}
          currentLength={wall.rightLength}
          constraint={rightConstraint}
          isSelected={isSelected}
        />
      )}
    </>
  )
}

function findHVConstraint(
  constraints: readonly Constraint[],
  wallId: IntermediateWallId
): HorizontalWallConstraint | VerticalWallConstraint | undefined {
  return constraints.find(
    (constraint): constraint is HorizontalWallConstraint | VerticalWallConstraint =>
      (constraint.type === 'horizontalWall' || constraint.type === 'verticalWall') && constraint.wall === wallId
  )
}

const SUGGESTION_SIN_TOLERANCE = Math.sin((5 * Math.PI) / 180)

function getSuggestedHVType(direction: Vec2): 'horizontalWall' | 'verticalWall' | null {
  if (Math.abs(direction[1]) < SUGGESTION_SIN_TOLERANCE) return 'horizontalWall'
  if (Math.abs(direction[0]) < SUGGESTION_SIN_TOLERANCE) return 'verticalWall'
  return null
}

function handleHVConstraintToggle(
  wallId: IntermediateWallId,
  hvConstraint: HorizontalWallConstraint | VerticalWallConstraint | undefined,
  suggestedHVType: 'horizontalWall' | 'verticalWall' | null
): void {
  const { addBuildingConstraint, removeBuildingConstraint } = getModelActions()

  if (hvConstraint) {
    removeBuildingConstraint(hvConstraint.id)
  } else if (suggestedHVType) {
    addBuildingConstraint({ type: suggestedHVType, wall: wallId })
  }
  gcsService.triggerSolve()
}

function IntermediateWallHVConstraintBadge({
  wall,
  hvConstraint,
  suggestedHVType,
  isSelected
}: {
  wall: ReturnType<typeof useIntermediateWallById>
  hvConstraint: HorizontalWallConstraint | VerticalWallConstraint | undefined
  suggestedHVType: 'horizontalWall' | 'verticalWall' | null
  isSelected: boolean
}): React.JSX.Element {
  const status = useConstraintStatus(hvConstraint?.id)
  const label = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? '—'
      : '\u2223'
    : suggestedHVType === 'horizontalWall'
      ? '—'
      : '\u2223'

  const tooltipKey = hvConstraint
    ? hvConstraint.type === 'horizontalWall'
      ? ('horizontal' as const)
      : ('vertical' as const)
    : suggestedHVType === 'horizontalWall'
      ? ('horizontal' as const)
      : ('vertical' as const)

  return (
    <ConstraintBadge
      label={label}
      basePoint={midpoint(wall.leftLine.start, wall.leftLine.end)}
      offsetDirection={wall.leftDirection}
      offsetDistance={2 * WALL_DIM_LAYER_OFFSET}
      locked={hvConstraint != null}
      onClick={
        isSelected
          ? () => {
              handleHVConstraintToggle(wall.id, hvConstraint, suggestedHVType)
            }
          : undefined
      }
      tooltipKey={tooltipKey}
      status={status.conflicting ? 'conflicting' : status.redundant ? 'redundant' : 'normal'}
    />
  )
}

function findLengthConstraint(
  constraints: readonly Constraint[],
  wallId: IntermediateWallId,
  side: 'left' | 'right'
): WallLengthConstraint | undefined {
  return constraints.find(
    (constraint): constraint is WallLengthConstraint =>
      constraint.type === 'wallLength' && constraint.wall === wallId && constraint.side === side
  )
}

function IntermediateWallLengthIndicator({
  wallId,
  side,
  startPoint,
  endPoint,
  currentLength,
  constraint,
  isSelected
}: {
  wallId: IntermediateWallId
  side: 'left' | 'right'
  startPoint: Vec2
  endPoint: Vec2
  currentLength: Length
  constraint?: WallLengthConstraint
  isSelected: boolean
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const color = status.conflicting
    ? 'var(--color-red-600)'
    : status.redundant
      ? 'var(--color-amber-500)'
      : isSelected
        ? 'var(--color-foreground)'
        : 'var(--color-muted-foreground)'

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.length)} \uD83D\uDD12` : formatLength(currentLength)}
      offset={(side === 'left' ? 1 : -1) * WALL_DIM_LAYER_OFFSET}
      color={color}
      fontSize={DIMENSION_DEFAULT_FONT_SIZE}
      strokeWidth={DIMENSION_DEFAULT_STROKE_WIDTH}
      onClick={
        isSelected
          ? () => {
              const { addBuildingConstraint } = getModelActions()
              const { worldToStage } = viewportActions()
              const position = worldToStage(midpoint(startPoint, endPoint))
              activateLengthInput({
                showImmediately: true,
                position: { x: position[0], y: position[1] },
                initialValue: constraint?.length ?? currentLength,
                placeholder: 'Enter length...',
                onCommit: enteredValue => {
                  try {
                    addBuildingConstraint({ type: 'wallLength', wall: wallId, side, length: enteredValue })
                    gcsService.triggerSolve()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Could not add length constraint')
                  }
                },
                onCancel: () => {
                  if (constraint) {
                    getModelActions().removeBuildingConstraint(constraint.id)
                    gcsService.triggerSolve()
                  }
                }
              })
            }
          : undefined
      }
    />
  )
}
