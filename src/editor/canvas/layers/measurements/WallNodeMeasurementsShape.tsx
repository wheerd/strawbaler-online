import { useState } from 'react'

import { gcsService } from '@/building/gcs/service'
import { useConstraintStatus } from '@/building/gcs/store'
import type {
  Constraint,
  IntermediateWallWithGeometry,
  PerimeterWallNodeWithGeometry,
  PerimeterWallWithGeometry,
  WallNodePositionConstraint,
  WallNodeWithGeometry
} from '@/building/model'
import type { WallId, WallNodeId } from '@/building/model/ids'
import {
  getModelActions,
  useConstraintsForEntity,
  useIntermediateWallsByPerimeter,
  usePerimeterWallById,
  useWallNodeById
} from '@/building/store'
import { AngleInput } from '@/editor/canvas/components/AngleInput'
import { LengthIndicator } from '@/editor/canvas/components/LengthIndicator'
import {
  DIMENSION_DEFAULT_FONT_SIZE,
  DIMENSION_DEFAULT_STROKE_WIDTH,
  WALL_DIM_LAYER_OFFSET
} from '@/editor/canvas/dimensions'
import { ConstraintBadge } from '@/editor/canvas/overlay/ConstraintBadge'
import { activateLengthInput } from '@/editor/canvas/services/length-input'
import { useSelectionStore } from '@/editor/canvas/state/selectionStore'
import { viewportActions } from '@/editor/canvas/state/viewportStore'
import {
  type Vec2,
  angleVec2,
  degreesToRadians,
  midpoint,
  perpendicular,
  radiansToDegrees,
  scaleVec2
} from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'

import {
  type PerimeterWallMeasurementReference,
  getAdjacentPerimeterWallReferences,
  getPerimeterWallMeasurementReferences,
  getReferencePoint
} from './perimeterWallMeasurementReferences'

export function WallNodeMeasurementsShape({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const node = useWallNodeById(nodeId)
  const constraints = useConstraintsForEntity(nodeId)
  const isSelected = useSelectionStore(state => state.isCurrentSelection(nodeId))
  const intermediateWalls = useIntermediateWallsByPerimeter(node.perimeterId)

  return (
    <>
      {node.type === 'perimeter' && (
        <PerimeterWallNodeMeasurements nodeId={nodeId} constraints={constraints} isSelected={isSelected} />
      )}
      <WallNodeConstraintBadges
        node={node}
        constraints={constraints}
        intermediateWalls={intermediateWalls}
        isSelected={isSelected}
      />
    </>
  )
}

interface IncidentWall {
  id: WallId
  direction: Vec2
}

function WallNodeConstraintBadges({
  node,
  constraints,
  intermediateWalls,
  isSelected
}: {
  node: WallNodeWithGeometry
  constraints: readonly Constraint[]
  intermediateWalls: IntermediateWallWithGeometry[]
  isSelected: boolean
}): React.JSX.Element {
  if (node.type === 'perimeter') {
    return (
      <PerimeterWallNodeConstraintBadges
        node={node}
        constraints={constraints}
        intermediateWalls={intermediateWalls}
        isSelected={isSelected}
      />
    )
  }
  return (
    <InnerWallNodeConstraintBadges
      node={node}
      constraints={constraints}
      intermediateWalls={intermediateWalls}
      isSelected={isSelected}
    />
  )
}

function PerimeterWallNodeConstraintBadges({
  node,
  constraints,
  intermediateWalls,
  isSelected
}: {
  node: Extract<WallNodeWithGeometry, { type: 'perimeter' }>
  constraints: readonly Constraint[]
  intermediateWalls: IntermediateWallWithGeometry[]
  isSelected: boolean
}): React.JSX.Element {
  const perimeterWall = usePerimeterWallById(node.wallId)
  const incidents: IncidentWall[] = [
    { id: perimeterWall.id, direction: perimeterWall.direction },
    ...intermediateWalls
      .filter(wall => node.connectedWallIds.includes(wall.id))
      .map(wall => ({ id: wall.id, direction: getDirectionAwayFromNode(wall, node.id) }))
  ]
  return <WallNodePairBadges node={node} incidents={incidents} constraints={constraints} isSelected={isSelected} />
}

function InnerWallNodeConstraintBadges({
  node,
  constraints,
  intermediateWalls,
  isSelected
}: {
  node: Extract<WallNodeWithGeometry, { type: 'inner' }>
  constraints: readonly Constraint[]
  intermediateWalls: IntermediateWallWithGeometry[]
  isSelected: boolean
}): React.JSX.Element {
  const incidents = intermediateWalls
    .filter(wall => node.connectedWallIds.includes(wall.id))
    .map(wall => ({ id: wall.id, direction: getDirectionAwayFromNode(wall, node.id) }))
  return <WallNodePairBadges node={node} incidents={incidents} constraints={constraints} isSelected={isSelected} />
}

function WallNodePairBadges({
  node,
  incidents,
  constraints,
  isSelected
}: {
  node: WallNodeWithGeometry
  incidents: IncidentWall[]
  constraints: readonly Constraint[]
  isSelected: boolean
}): React.JSX.Element {
  const [angleInput, setAngleInput] = useState<{
    position: { x: number; y: number }
    pair: [WallId, WallId]
    value: number
  } | null>(null)
  const modelActions = getModelActions()
  const pairs: [IncidentWall, IncidentWall][] = []
  for (let i = 0; i < incidents.length; i++) {
    for (let j = i + 1; j < incidents.length; j++) pairs.push([incidents[i], incidents[j]])
  }

  return (
    <>
      {pairs.map(([wallA, wallB]) => (
        <WallNodePairBadge
          key={`${wallA.id}-${wallB.id}`}
          node={node}
          wallA={wallA}
          wallB={wallB}
          constraints={constraints}
          isSelected={isSelected}
          onAngleOpen={(pair, value) => {
            const position = viewportActions().worldToStage(node.center)
            setAngleInput({ position: { x: position[0], y: position[1] }, pair, value })
          }}
        />
      ))}
      <AngleInput
        isOpen={angleInput != null}
        value={angleInput?.value ?? 0}
        position={angleInput?.position ?? { x: 0, y: 0 }}
        onCommit={value => {
          if (!angleInput) return
          const existing = findNodePairConstraint(
            constraints,
            'wallNodeAngle',
            node.id,
            angleInput.pair[0],
            angleInput.pair[1]
          )
          if (existing) modelActions.removeBuildingConstraint(existing.id)
          modelActions.addBuildingConstraint({
            type: 'wallNodeAngle',
            node: node.id,
            wallA: angleInput.pair[0] as never,
            wallB: angleInput.pair[1] as never,
            angle: degreesToRadians(value)
          })
          gcsService.triggerSolve()
          setAngleInput(null)
        }}
        onCancel={() => {
          if (angleInput) {
            const existing = findNodePairConstraint(
              constraints,
              'wallNodeAngle',
              node.id,
              angleInput.pair[0],
              angleInput.pair[1]
            )
            if (existing) modelActions.removeBuildingConstraint(existing.id)
            gcsService.triggerSolve()
          }
          setAngleInput(null)
        }}
      />
    </>
  )
}

function WallNodePairBadge({
  node,
  wallA,
  wallB,
  constraints,
  isSelected,
  onAngleOpen
}: {
  node: WallNodeWithGeometry
  wallA: IncidentWall
  wallB: IncidentWall
  constraints: readonly Constraint[]
  isSelected: boolean
  onAngleOpen: (pair: [WallId, WallId], value: number) => void
}): React.JSX.Element {
  const modelActions = getModelActions()
  const perpendicularConstraint = findNodePairConstraint(
    constraints,
    'wallNodePerpendicular',
    node.id,
    wallA.id,
    wallB.id
  )
  const colinearConstraint = findNodePairConstraint(constraints, 'wallNodeColinear', node.id, wallA.id, wallB.id)
  const angleConstraint = findNodePairConstraint(constraints, 'wallNodeAngle', node.id, wallA.id, wallB.id)
  const perpendicularStatus = useConstraintStatus(perpendicularConstraint?.id)
  const colinearStatus = useConstraintStatus(colinearConstraint?.id)
  const angleStatus = useConstraintStatus(angleConstraint?.id)
  const dot = Math.abs(wallA.direction[0] * wallB.direction[0] + wallA.direction[1] * wallB.direction[1])
  const isPerpendicular = dot < Math.sin((5 * Math.PI) / 180)
  const isColinear = dot > Math.cos((5 * Math.PI) / 180)
  const outsideDirection = perpendicular(wallA.direction)
  const angle = angleConstraint
    ? radiansToDegrees(angleConstraint.angle)
    : radiansToDegrees(angleVec2(wallA.direction, wallB.direction))
  const status = (value: { conflicting: boolean; redundant: boolean }) =>
    value.conflicting ? 'conflicting' : value.redundant ? 'redundant' : 'normal'
  const toggle = (constraint: Constraint | undefined, type: 'wallNodePerpendicular' | 'wallNodeColinear') => {
    if (constraint) modelActions.removeBuildingConstraint(constraint.id)
    else modelActions.addBuildingConstraint({ type, node: node.id, wallA: wallA.id, wallB: wallB.id })
    gcsService.triggerSolve()
  }

  return (
    <g>
      {(perpendicularConstraint ?? (isSelected && isPerpendicular)) && (
        <ConstraintBadge
          label="⊥"
          dimLayer={1}
          startPoint={node.center}
          endPoint={node.center}
          outsideDirection={outsideDirection}
          locked={perpendicularConstraint != null}
          onClick={
            isSelected
              ? () => {
                  toggle(perpendicularConstraint, 'wallNodePerpendicular')
                }
              : undefined
          }
          tooltipKey="perpendicular"
          status={status(perpendicularStatus)}
        />
      )}
      {(colinearConstraint ?? (isSelected && isColinear)) && (
        <ConstraintBadge
          label="\u2550"
          dimLayer={2}
          startPoint={node.center}
          endPoint={node.center}
          outsideDirection={outsideDirection}
          locked={colinearConstraint != null}
          onClick={
            isSelected
              ? () => {
                  toggle(colinearConstraint, 'wallNodeColinear')
                }
              : undefined
          }
          tooltipKey="colinear"
          status={status(colinearStatus)}
        />
      )}
      {(angleConstraint ?? isSelected) && (
        <ConstraintBadge
          label={`${Math.round(angle)}°`}
          dimLayer={3}
          startPoint={node.center}
          endPoint={node.center}
          outsideDirection={outsideDirection}
          locked={angleConstraint != null}
          onClick={
            isSelected
              ? () => {
                  onAngleOpen([wallA.id, wallB.id], angle)
                }
              : undefined
          }
          tooltipKey="angle"
          status={status(angleStatus)}
        />
      )}
    </g>
  )
}

function getDirectionAwayFromNode(wall: IntermediateWallWithGeometry, nodeId: WallNodeId): Vec2 {
  return wall.start.nodeId === nodeId ? wall.direction : scaleVec2(wall.direction, -1)
}

function findNodePairConstraint<T extends 'wallNodePerpendicular' | 'wallNodeColinear' | 'wallNodeAngle'>(
  constraints: readonly Constraint[],
  type: T,
  node: WallNodeId,
  wallA: string,
  wallB: string
): Extract<Constraint, { type: T }> | undefined {
  return constraints.find(
    (constraint): constraint is Extract<Constraint, { type: T }> =>
      constraint.type === type &&
      constraint.node === node &&
      ((constraint.wallA === wallA && constraint.wallB === wallB) ||
        (constraint.wallA === wallB && constraint.wallB === wallA))
  )
}

function PerimeterWallNodeMeasurements({
  nodeId,
  constraints,
  isSelected
}: {
  nodeId: WallNodeId
  constraints: readonly Constraint[]
  isSelected: boolean
}): React.JSX.Element {
  const node = useWallNodeById(nodeId)
  if (node.type !== 'perimeter') return <></>

  return <PerimeterWallNodeMeasurementContent node={node} constraints={constraints} isSelected={isSelected} />
}

function PerimeterWallNodeMeasurementContent({
  node,
  constraints,
  isSelected
}: {
  node: PerimeterWallNodeWithGeometry
  constraints: readonly Constraint[]
  isSelected: boolean
}): React.JSX.Element {
  const wall = usePerimeterWallById(node.wallId)
  const modelActions = getModelActions()
  const references = getPerimeterWallMeasurementReferences(
    wall,
    modelActions.getPerimeterCornerById,
    modelActions.getWallNodeById
  )
  const { next, previous } = getAdjacentPerimeterWallReferences(references, node.offsetFromCornerStart, node.id)

  return (
    <>
      {previous ? (
        <WallNodeOffsetMeasurement
          node={node}
          reference={previous}
          wall={wall}
          constraint={findPositionConstraint(constraints, node.id, wall.id, previous.id)}
          isSelected={isSelected}
          direction="previous"
        />
      ) : null}
      {next ? (
        <WallNodeOffsetMeasurement
          node={node}
          reference={next}
          wall={wall}
          constraint={findPositionConstraint(constraints, node.id, wall.id, next.id)}
          isSelected={isSelected}
          direction="next"
        />
      ) : null}
    </>
  )
}

function WallNodeOffsetMeasurement({
  node,
  reference,
  wall,
  constraint,
  isSelected,
  direction
}: {
  node: PerimeterWallNodeWithGeometry
  reference: PerimeterWallMeasurementReference
  wall: PerimeterWallWithGeometry
  constraint?: WallNodePositionConstraint
  isSelected: boolean
  direction: 'previous' | 'next'
}): React.JSX.Element | null {
  const { formatLength } = useFormatters()
  const status = useConstraintStatus(constraint?.id)
  if (!isSelected && !constraint) return null
  const referencePoint = getReferencePoint(reference, 'inside', direction === 'previous' ? 'end' : 'start')
  const nodePoint = getReferencePoint(node, 'inside', direction === 'previous' ? 'start' : 'end')
  const color = status.conflicting
    ? 'var(--color-red-600)'
    : status.redundant
      ? 'var(--color-amber-500)'
      : isSelected
        ? 'var(--color-foreground)'
        : 'var(--color-muted-foreground)'

  const onCommit = (enteredValue: number): void => {
    getModelActions().addBuildingConstraint({
      type: 'wallNodePosition',
      node: node.id,
      perimeterWall: wall.id,
      reference: reference.id,
      offset: enteredValue
    })
    gcsService.triggerSolve()
  }

  const onCancel = () => {
    if (constraint) getModelActions().removeBuildingConstraint(constraint.id)
  }

  const clickHandler = (measurement: number): void => {
    const position = viewportActions().worldToStage(midpoint(referencePoint, node.position))

    activateLengthInput({
      showImmediately: true,
      position: { x: position[0], y: position[1] },
      initialValue: constraint?.offset ?? measurement,
      placeholder: 'Enter offset...',
      onCommit,
      onCancel
    })
  }
  return (
    <LengthIndicator
      startPoint={direction === 'next' ? referencePoint : nodePoint}
      endPoint={direction === 'previous' ? referencePoint : nodePoint}
      label={constraint ? `${formatLength(constraint.offset)} \uD83D\uDD12` : undefined}
      offset={2 * WALL_DIM_LAYER_OFFSET}
      color={color}
      fontSize={DIMENSION_DEFAULT_FONT_SIZE}
      strokeWidth={DIMENSION_DEFAULT_STROKE_WIDTH}
      onClick={isSelected ? clickHandler : undefined}
    />
  )
}

function findPositionConstraint(
  constraints: readonly Constraint[],
  node: WallNodeId,
  perimeterWall: string,
  reference: string
): WallNodePositionConstraint | undefined {
  return constraints.find(
    (constraint): constraint is WallNodePositionConstraint =>
      constraint.type === 'wallNodePosition' &&
      constraint.node === node &&
      constraint.perimeterWall === perimeterWall &&
      constraint.reference === reference
  )
}
