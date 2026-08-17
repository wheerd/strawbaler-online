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
import { CenterModeToggleBadge } from '@/editor/canvas/overlay/CenterModeToggleBadge'
import { activateLengthInput } from '@/editor/canvas/services/length-input'
import { useCurrentSelection } from '@/editor/canvas/state/selectionStore'
import { useConstraintDisplayMode } from '@/editor/canvas/state/useConstraintDisplayMode'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import { type Length, type Vec2, midpoint, scaleAddVec2 } from '@/shared/geometry'
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
  const { mode, toggleMode } = useConstraintDisplayMode()
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
  const useCenter = mode === 'center'

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
          direction={wall.direction}
          useCenter={startConstraint ? startConstraint.entitySide === 'center' : useCenter}
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
          direction={wall.direction}
          useCenter={endConstraint ? endConstraint.entitySide === 'center' : useCenter}
        />
      )}
      {previous && (isSelected || previousConstraint) && (
        <IntermediateRelativeDistance
          entity={entity}
          other={previous}
          constraint={previousConstraint}
          isSelected={isSelected}
          mode="previous"
          direction={wall.direction}
          useCenter={previousConstraint ? previousConstraint.entityASide === 'center' : useCenter}
        />
      )}
      {next && (isSelected || nextConstraint) && (
        <IntermediateRelativeDistance
          entity={entity}
          other={next}
          constraint={nextConstraint}
          isSelected={isSelected}
          mode="next"
          direction={wall.direction}
          useCenter={nextConstraint ? nextConstraint.entityASide === 'center' : useCenter}
        />
      )}
      {isSelected && <CenterModeToggleBadge mode={mode} position={entity.center} onClick={toggleMode} />}
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
  currentOffset,
  direction,
  useCenter
}: {
  entity: IntermediateWallEntity
  point: Vec2
  constraint?: WallEntityAbsoluteConstraint
  isSelected: boolean
  absoluteReference: NodeId
  side: 'start' | 'end'
  currentOffset: Length
  direction: Vec2
  useCenter: boolean
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const wall = useIntermediateWallById(entity.wallId)
  const color = getMeasurementColor(status, isSelected)
  const entityStart = scaleAddVec2(entity.center, direction, -entity.width / 2)
  const entityEnd = scaleAddVec2(entity.center, direction, entity.width / 2)
  const entityPoint = useCenter ? entity.center : side === 'start' ? entityStart : entityEnd
  const startPoint = side === 'start' ? point : entityPoint
  const endPoint = side === 'start' ? entityPoint : point
  const offset = constraint?.distance ?? currentOffset

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : formatLength(offset)}
      offset={wall.thickness / 2 + 2 * WALL_DIM_LAYER_OFFSET}
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
                    entitySide: useCenter ? 'center' : side,
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
  mode,
  direction,
  useCenter
}: {
  entity: IntermediateWallEntity
  other: IntermediateWallEntity
  constraint?: WallEntityRelativeConstraint
  isSelected: boolean
  mode: 'previous' | 'next'
  direction: Vec2
  useCenter: boolean
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const wall = useIntermediateWallById(entity.wallId)
  const color = getMeasurementColor(status, isSelected)
  const entityStart = scaleAddVec2(entity.center, direction, -entity.width / 2)
  const entityEnd = scaleAddVec2(entity.center, direction, entity.width / 2)
  const otherStart = scaleAddVec2(other.center, direction, -other.width / 2)
  const otherEnd = scaleAddVec2(other.center, direction, other.width / 2)
  const startPoint = useCenter
    ? mode === 'previous'
      ? other.center
      : entity.center
    : mode === 'previous'
      ? otherEnd
      : entityEnd
  const endPoint = useCenter
    ? mode === 'previous'
      ? entity.center
      : other.center
    : mode === 'previous'
      ? entityStart
      : otherStart
  const currentDistance = Math.abs(entity.centerOffsetFromWallStart - other.centerOffsetFromWallStart)

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : formatLength(currentDistance)}
      offset={wall.thickness / 2 + WALL_DIM_LAYER_OFFSET}
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
                    entityASide: useCenter ? 'center' : mode === 'previous' ? 'end' : 'start',
                    entityB: other.id,
                    entityBSide: useCenter ? 'center' : mode === 'previous' ? 'start' : 'end',
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
