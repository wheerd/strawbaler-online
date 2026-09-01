import { Fragment } from 'react'

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
import { midpoint } from '@/shared/geometry'
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

  const previousConstraint = previous ? findRelativeConstraint(constraints, entity.id, previous.id) : undefined
  const nextConstraint = next ? findRelativeConstraint(constraints, entity.id, next.id) : undefined
  const useCenter = mode === 'center'

  return (
    <>
      {(['left', 'right'] as const).map(wallSide => {
        const startSideConstraint = findAbsoluteConstraint(constraints, entity.id, wall.start.nodeId, wallSide)
        const endSideConstraint = findAbsoluteConstraint(constraints, entity.id, wall.end.nodeId, wallSide)
        const previousSideConstraint = previousConstraint
        const nextSideConstraint = nextConstraint

        return (
          <Fragment key={wallSide}>
            {(isSelected || startSideConstraint) && (
              <IntermediateEntityDistance
                entity={entity}
                wallSide={wallSide}
                constraint={startSideConstraint}
                isSelected={isSelected}
                absoluteReference={wall.start.nodeId}
                endpointSide="start"
                useCenter={startSideConstraint ? startSideConstraint.entitySide === 'center' : useCenter}
              />
            )}
            {(isSelected || endSideConstraint) && (
              <IntermediateEntityDistance
                entity={entity}
                wallSide={wallSide}
                constraint={endSideConstraint}
                isSelected={isSelected}
                absoluteReference={wall.end.nodeId}
                endpointSide="end"
                useCenter={endSideConstraint ? endSideConstraint.entitySide === 'center' : useCenter}
              />
            )}
            {previous && (isSelected || previousSideConstraint) && (
              <IntermediateRelativeDistance
                entity={entity}
                other={previous}
                constraint={previousSideConstraint}
                isSelected={isSelected}
                mode="previous"
                wallSide={wallSide}
                useCenter={previousSideConstraint ? previousSideConstraint.entityASide === 'center' : useCenter}
              />
            )}
            {next && (isSelected || nextSideConstraint) && (
              <IntermediateRelativeDistance
                entity={entity}
                other={next}
                constraint={nextSideConstraint}
                isSelected={isSelected}
                mode="next"
                wallSide={wallSide}
                useCenter={nextSideConstraint ? nextSideConstraint.entityASide === 'center' : useCenter}
              />
            )}
          </Fragment>
        )
      })}
      {isSelected && <CenterModeToggleBadge mode={mode} position={entity.center} onClick={toggleMode} />}
    </>
  )
}

function IntermediateEntityDistance({
  entity,
  wallSide,
  constraint,
  isSelected,
  absoluteReference,
  endpointSide,
  useCenter
}: {
  entity: IntermediateWallEntity
  wallSide: 'left' | 'right'
  constraint?: WallEntityAbsoluteConstraint
  isSelected: boolean
  absoluteReference: NodeId
  endpointSide: 'start' | 'end'
  useCenter: boolean
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const wall = useIntermediateWallById(entity.wallId)
  const color = getMeasurementColor(status, isSelected)
  const wallLine = wallSide === 'left' ? wall.leftLine : wall.rightLine
  const entityLine = wallSide === 'left' ? entity.outsideLine : entity.insideLine
  const wallPoint = endpointSide === 'start' ? wallLine.start : wallLine.end
  const entityPoint = useCenter
    ? midpoint(entityLine.start, entityLine.end)
    : endpointSide === 'start'
      ? entityLine.start
      : entityLine.end
  const startPoint = endpointSide === 'start' ? wallPoint : entityPoint
  const endPoint = endpointSide === 'start' ? entityPoint : wallPoint
  const label = constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : undefined

  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={label}
      offset={(wallSide === 'left' ? 1 : -1) * (wall.thickness / 2 + 2 * WALL_DIM_LAYER_OFFSET)}
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
                    side: wallSide,
                    entitySide: useCenter ? 'center' : endpointSide,
                    node: absoluteReference,
                    nodeSide: endpointSide === 'start' ? 'end' : 'start',
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
  wallSide,
  useCenter
}: {
  entity: IntermediateWallEntity
  other: IntermediateWallEntity
  constraint?: WallEntityRelativeConstraint
  isSelected: boolean
  mode: 'previous' | 'next'
  wallSide: 'left' | 'right'
  useCenter: boolean
}): React.JSX.Element {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  const wall = useIntermediateWallById(entity.wallId)
  const color = getMeasurementColor(status, isSelected)
  const entityLine = wallSide === 'left' ? entity.outsideLine : entity.insideLine
  const otherLine = wallSide === 'left' ? other.outsideLine : other.insideLine
  const entityStart = entityLine.start
  const entityEnd = entityLine.end
  const otherStart = otherLine.start
  const otherEnd = otherLine.end
  const entityCenter = midpoint(entityLine.start, entityLine.end)
  const otherCenter = midpoint(otherLine.start, otherLine.end)
  const startPoint = useCenter
    ? mode === 'previous'
      ? otherCenter
      : entityCenter
    : mode === 'previous'
      ? otherEnd
      : entityEnd
  const endPoint = useCenter
    ? mode === 'previous'
      ? entityCenter
      : otherCenter
    : mode === 'previous'
      ? entityStart
      : otherStart
  return (
    <LengthIndicator
      startPoint={startPoint}
      endPoint={endPoint}
      label={constraint ? `${formatLength(constraint.distance)} \uD83D\uDD12` : undefined}
      offset={(wallSide === 'left' ? 1 : -1) * (wall.thickness / 2 + WALL_DIM_LAYER_OFFSET)}
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
  nodeId: NodeId,
  side: 'left' | 'right'
): WallEntityAbsoluteConstraint | undefined {
  return constraints.find(
    (constraint): constraint is WallEntityAbsoluteConstraint =>
      constraint.type === 'wallEntityAbsolute' &&
      constraint.entity === entityId &&
      constraint.node === nodeId &&
      constraint.side === side
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
