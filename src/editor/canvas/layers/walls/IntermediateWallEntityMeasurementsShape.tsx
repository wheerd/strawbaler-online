import { gcsService } from '@/building/gcs/service'
import { useConstraintStatus } from '@/building/gcs/store'
import type {
  Constraint,
  WallEntity,
  WallEntityAbsoluteConstraint,
  WallEntityGeometry,
  WallEntityRelativeConstraint
} from '@/building/model'
import type { IntermediateWallId, NodeId, WallEntityId } from '@/building/model/ids'
import { getModelActions, useConstraintsForEntity, useIntermediateWallById, useModelActions } from '@/building/store'
import { LengthIndicator } from '@/editor/canvas/components/LengthIndicator'
import {
  DIMENSION_DEFAULT_FONT_SIZE,
  DIMENSION_DEFAULT_STROKE_WIDTH,
  WALL_DIM_LAYER_OFFSET
} from '@/editor/canvas/dimensions'
import { activateLengthInput } from '@/editor/canvas/services/length-input'
import { useCurrentSelection } from '@/editor/canvas/state/selectionStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { type Length, midpoint } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

type IntermediateWallEntity = WallEntity & WallEntityGeometry & { wallId: IntermediateWallId }

export function IntermediateWallEntityMeasurementsShape({
  entity
}: {
  entity: IntermediateWallEntity
}): React.JSX.Element {
  const wall = useIntermediateWallById(entity.wallId)
  const modelActions = useModelActions()
  const constraints = useConstraintsForEntity(entity.id)
  const isSelected = useCurrentSelection() === entity.id
  const entities = wall.entityIds
    .map(id => modelActions.getWallEntityById(id) as IntermediateWallEntity)
    .sort((a, b) => a.centerOffsetFromWallStart - b.centerOffsetFromWallStart)
  const index = entities.findIndex(item => item.id === entity.id)
  const previous = index > 0 ? entities[index - 1] : undefined
  const next = index >= 0 && index < entities.length - 1 ? entities[index + 1] : undefined

  const startConstraint = findAbsoluteConstraint(constraints, entity.id, wall.start.nodeId)
  const endConstraint = findAbsoluteConstraint(constraints, entity.id, wall.end.nodeId)
  const previousConstraint = previous ? findRelativeConstraint(constraints, entity.id, previous.id) : undefined
  const nextConstraint = next ? findRelativeConstraint(constraints, entity.id, next.id) : undefined

  return (
    <>
      {(isSelected || startConstraint) && (
        <IntermediateEntityDistance
          entity={entity}
          point={wall.centerLine.start}
          constraint={startConstraint}
          isSelected={isSelected}
          absoluteReference={wall.start.nodeId}
          side="start"
          currentOffset={entity.centerOffsetFromWallStart}
        />
      )}
      {(isSelected || endConstraint) && (
        <IntermediateEntityDistance
          entity={entity}
          point={wall.centerLine.end}
          constraint={endConstraint}
          isSelected={isSelected}
          absoluteReference={wall.end.nodeId}
          side="end"
          currentOffset={wall.wallLength - entity.centerOffsetFromWallStart}
        />
      )}
      {previous && (isSelected || previousConstraint) && (
        <IntermediateRelativeDistance
          entity={entity}
          other={previous}
          constraint={previousConstraint}
          isSelected={isSelected}
          mode="previous"
        />
      )}
      {next && (isSelected || nextConstraint) && (
        <IntermediateRelativeDistance
          entity={entity}
          other={next}
          constraint={nextConstraint}
          isSelected={isSelected}
          mode="next"
        />
      )}
    </>
  )
}

function IntermediateEntityDistance({
  entity,
  point,
  constraint,
  isSelected,
  absoluteReference,
  side,
  currentOffset
}: {
  entity: IntermediateWallEntity
  point: import('@/shared/geometry').Vec2
  constraint?: WallEntityAbsoluteConstraint
  isSelected: boolean
  absoluteReference: NodeId
  side: 'start' | 'end'
  currentOffset: Length
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const color = getMeasurementColor(status, isSelected)
  const startPoint = side === 'start' ? point : entity.center
  const endPoint = side === 'start' ? entity.center : point
  const offset = constraint?.distance ?? currentOffset

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : formatLength(offset)}
      offset={side === 'start' ? WALL_DIM_LAYER_OFFSET : -WALL_DIM_LAYER_OFFSET}
      color={color}
      fontSize={DIMENSION_DEFAULT_FONT_SIZE}
      strokeWidth={DIMENSION_DEFAULT_STROKE_WIDTH}
      onClick={
        isSelected
          ? measurement => {
              const { worldToStage } = viewportActions()
              const position = worldToStage(midpoint(startPoint, endPoint))
              activateLengthInput({
                showImmediately: true,
                position: { x: position[0], y: position[1] },
                initialValue: constraint?.distance ?? measurement,
                placeholder: 'Enter offset...',
                onCommit: enteredValue => {
                  getModelActions().addBuildingConstraint({
                    type: 'wallEntityAbsolute',
                    wall: entity.wallId,
                    entity: entity.id,
                    side: 'left',
                    entitySide: 'center',
                    node: absoluteReference,
                    distance: enteredValue
                  })
                  gcsService.triggerSolve()
                },
                onCancel: () => {
                  if (constraint) getModelActions().removeBuildingConstraint(constraint.id)
                }
              })
            }
          : undefined
      }
    />
  )
}

function IntermediateRelativeDistance({
  entity,
  other,
  constraint,
  isSelected,
  mode
}: {
  entity: IntermediateWallEntity
  other: IntermediateWallEntity
  constraint?: WallEntityRelativeConstraint
  isSelected: boolean
  mode: 'previous' | 'next'
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const color = getMeasurementColor(status, isSelected)
  const startPoint = mode === 'previous' ? other.center : entity.center
  const endPoint = mode === 'previous' ? entity.center : other.center
  const currentDistance = Math.abs(entity.centerOffsetFromWallStart - other.centerOffsetFromWallStart)

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : formatLength(currentDistance)}
      offset={WALL_DIM_LAYER_OFFSET}
      color={color}
      fontSize={DIMENSION_DEFAULT_FONT_SIZE}
      strokeWidth={DIMENSION_DEFAULT_STROKE_WIDTH}
      onClick={
        isSelected
          ? measurement => {
              const position = viewportActions().worldToStage(midpoint(startPoint, endPoint))
              activateLengthInput({
                showImmediately: true,
                position: { x: position[0], y: position[1] },
                initialValue: constraint?.distance ?? measurement,
                placeholder: 'Enter distance...',
                onCommit: enteredValue => {
                  getModelActions().addBuildingConstraint({
                    type: 'wallEntityRelative',
                    wall: entity.wallId,
                    entityA: entity.id,
                    entityASide: 'center',
                    entityB: other.id,
                    entityBSide: 'center',
                    distance: enteredValue
                  })
                  gcsService.triggerSolve()
                },
                onCancel: () => {
                  if (constraint) getModelActions().removeBuildingConstraint(constraint.id)
                }
              })
            }
          : undefined
      }
    />
  )
}

function getMeasurementColor(status: { conflicting: boolean; redundant: boolean }, isSelected: boolean): string {
  if (status.conflicting) return 'var(--color-red-600)'
  if (status.redundant) return 'var(--color-amber-500)'
  return isSelected ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
}

function findAbsoluteConstraint(
  constraints: readonly Constraint[],
  entityId: WallEntityId,
  nodeId: NodeId
): WallEntityAbsoluteConstraint | undefined {
  return constraints.find(
    (constraint): constraint is WallEntityAbsoluteConstraint =>
      constraint.type === 'wallEntityAbsolute' && constraint.entity === entityId && constraint.node === nodeId
  )
}

function findRelativeConstraint(
  constraints: readonly Constraint[],
  entityA: WallEntityId,
  entityB: WallEntityId
): WallEntityRelativeConstraint | undefined {
  return constraints.find(
    (constraint): constraint is WallEntityRelativeConstraint =>
      constraint.type === 'wallEntityRelative' &&
      ((constraint.entityA === entityA && constraint.entityB === entityB) ||
        (constraint.entityA === entityB && constraint.entityB === entityA))
  )
}
