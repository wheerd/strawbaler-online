import { toast } from 'sonner'

import { gcsService } from '@/building/gcs/service'
import { useConstraintStatus } from '@/building/gcs/store'
import type { Constraint, IntermediateWallId, WallLengthConstraint } from '@/building/model'
import { isOpeningId } from '@/building/model/ids'
import { getModelActions, useConstraintsForEntity, useIntermediateWallById } from '@/building/store'
import { LengthIndicator } from '@/editor/canvas/components/LengthIndicator'
import {
  DIMENSION_DEFAULT_FONT_SIZE,
  DIMENSION_DEFAULT_STROKE_WIDTH,
  WALL_DIM_LAYER_OFFSET
} from '@/editor/canvas/dimensions'
import { OpeningShape } from '@/editor/canvas/layers/walls/OpeningShape'
import { WallPostShape } from '@/editor/canvas/layers/walls/WallPostShape'
import { activateLengthInput } from '@/editor/canvas/services/length-input'
import { useSelectionStore } from '@/editor/canvas/state/selectionStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { type Length, type Vec2, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

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
              const { addBuildingConstraint, updateIntermediateWallAlignmentPreservingGeometry } = getModelActions()
              const { worldToStage } = viewportActions()
              const position = worldToStage(midpoint(startPoint, endPoint))
              activateLengthInput({
                showImmediately: true,
                position: { x: position[0], y: position[1] },
                initialValue: constraint?.length ?? currentLength,
                placeholder: 'Enter length...',
                onCommit: enteredValue => {
                  try {
                    updateIntermediateWallAlignmentPreservingGeometry(wallId, side)
                    addBuildingConstraint({ type: 'wallLength', wall: wallId, side, length: enteredValue })
                    gcsService.triggerSolve()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'Could not change wall attachment axis')
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

export function IntermediateWallShape({ wallId }: { wallId: IntermediateWallId }): React.JSX.Element {
  const wall = useIntermediateWallById(wallId)
  const { isCurrentSelection } = useSelectionStore()
  const constraints = useConstraintsForEntity(wallId)
  const leftConstraint = findLengthConstraint(constraints, wallId, 'left')
  const rightConstraint = findLengthConstraint(constraints, wallId, 'right')
  const isSelected = isCurrentSelection(wallId)
  const fillColor = MATERIAL_COLORS.strawbale
  const wallPath = polygonToSvgPath(wall.boundary)

  return (
    <g
      data-entity-id={wall.id}
      data-entity-type="intermediate-wall"
      data-parent-ids={JSON.stringify([wall.perimeterId])}
    >
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />
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
      {wall.entityIds.map(id =>
        isOpeningId(id) ? (
          <OpeningShape key={`opening-${id}`} openingId={id} />
        ) : (
          <WallPostShape key={`post-${id}`} postId={id} />
        )
      )}
    </g>
  )
}
