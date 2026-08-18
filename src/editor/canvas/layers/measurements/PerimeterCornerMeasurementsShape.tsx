import { useCallback, useMemo, useState } from 'react'

import { gcsService } from '@/building/gcs/service'
import { useConstraintStatus } from '@/building/gcs/store'
import type {
  ColinearCornerConstraint,
  CornerAngleConstraint,
  LockedCornerConstraint,
  PerimeterCornerId,
  PerpendicularCornerConstraint
} from '@/building/model'
import {
  useConstraintsForEntity,
  useModelActions,
  usePerimeterById,
  usePerimeterCornerById,
  usePerimeterWallById
} from '@/building/store'
import { AngleInput } from '@/editor/canvas/components/AngleInput'
import { ConstraintBadge } from '@/editor/canvas/overlay/ConstraintBadge'
import { useSelectionStore } from '@/editor/canvas/state/selectionStore'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import {
  ZERO_VEC2,
  angleVec2,
  degreesToRadians,
  direction,
  distSqrVec2,
  negVec2,
  radiansToDegrees,
  rotateVec2,
  scaleAddVec2
} from '@/shared/geometry'

export function PerimeterCornerMeasurementsShape({ cornerId }: { cornerId: PerimeterCornerId }): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(cornerId)
  const modelActions = useModelActions()
  const viewportActions = useViewportActions()

  const corner = usePerimeterCornerById(cornerId)
  const previousWall = usePerimeterWallById(corner.previousWallId)
  const nextWall = usePerimeterWallById(corner.nextWallId)
  const perimeter = usePerimeterById(corner.perimeterId)

  const [angleInputOpen, setAngleInputOpen] = useState(false)
  const [angleInputValue, setAngleInputValue] = useState(0)
  const [angleInputPosition, setAngleInputPosition] = useState({ x: 0, y: 0 })

  // Check if corner is nearly straight (close to 180°)
  const interiorAngleDegrees = corner.interiorAngle
  const exteriorAngleDegrees = corner.exteriorAngle
  const isNearStraight = Math.abs(interiorAngleDegrees - 180) <= 5 || Math.abs(exteriorAngleDegrees - 180) <= 5

  // Calculate overlay rectangle for near-straight corners
  const outsideDirection = direction(corner.insidePoint, corner.outsidePoint)
  const insideDirection = negVec2(outsideDirection)

  // Look up constraints for this corner
  const cornerConstraints = useConstraintsForEntity(cornerId)

  // Find colinear constraints for this corner
  const colinearConstraint = useMemo(
    () =>
      cornerConstraints.find(
        (c): c is ColinearCornerConstraint => c.type === 'colinearCorner' && c.corner === cornerId
      ),
    [cornerConstraints, cornerId]
  )

  // Find perpendicular constraint for this corner
  const perpendicularConstraint = useMemo(
    () =>
      cornerConstraints.find(
        (c): c is PerpendicularCornerConstraint => c.type === 'perpendicularCorner' && c.corner === cornerId
      ),
    [cornerConstraints, cornerId]
  )

  // Find angle constraint for this corner
  const angleConstraint = useMemo(
    () => cornerConstraints.find((c): c is CornerAngleConstraint => c.type === 'cornerAngle' && c.corner === cornerId),
    [cornerConstraints, cornerId]
  )
  const badgeAngle =
    angleConstraint != null ? (180 + radiansToDegrees(angleConstraint.angle)) % 360 : corner.interiorAngle

  // Find locked corner constraint
  const lockedConstraint = useMemo(
    () =>
      cornerConstraints.find((c): c is LockedCornerConstraint => c.type === 'lockedCorner' && c.corner === cornerId),
    [cornerConstraints, cornerId]
  )

  // Determine if the corner is close to 90° (for suggesting perpendicular constraint)
  /** 5-degree tolerance for perpendicular suggestion. */
  const isNearPerpendicular =
    !perpendicularConstraint && (Math.abs(corner.interiorAngle - 90) <= 5 || Math.abs(corner.exteriorAngle - 90) <= 5)

  // Get constraint status for each constraint
  const perpendicularStatus = useConstraintStatus(perpendicularConstraint?.id)
  const colinearStatus = useConstraintStatus(colinearConstraint?.id)
  const angleStatus = useConstraintStatus(angleConstraint?.id)
  const lockedStatus = useConstraintStatus(lockedConstraint?.id)

  const showPerpendicularBadge = perpendicularConstraint != null || (isSelected && isNearPerpendicular)
  const showColinearBadge = colinearConstraint != null || (isSelected && isNearStraight)
  const showAngleBadge = angleConstraint != null || isSelected

  // Check if corner reference point is near origin (for suggesting lock)
  const refPoint = perimeter.referenceSide === 'inside' ? corner.insidePoint : corner.outsidePoint
  const isNearOrigin = distSqrVec2(refPoint, ZERO_VEC2) < 25 * 25 // 25mm tolerance

  // Determine tooltip key based on whether position is/would be at origin
  const isLockedAtOrigin = lockedConstraint != null && distSqrVec2(lockedConstraint.position, ZERO_VEC2) < 1
  const wouldLockAtOrigin = lockedConstraint != null ? isLockedAtOrigin : isNearOrigin
  const lockedTooltipKey = wouldLockAtOrigin ? 'lockedCornerOrigin' : 'lockedCornerArbitrary'

  // Show lock badge when locked or when selected
  const showLockedBadge = lockedConstraint != null || isSelected

  const getBadgeStatus = (status: { conflicting: boolean; redundant: boolean }) => {
    if (status.conflicting) return 'conflicting'
    if (status.redundant) return 'redundant'
    return 'normal'
  }

  // --- Perpendicular constraint handlers ---
  const handleAddPerpendicular = useCallback(() => {
    modelActions.addBuildingConstraint({
      type: 'perpendicularCorner',
      corner: cornerId
    })
    gcsService.triggerSolve()
  }, [modelActions, cornerId])

  const handleRemovePerpendicular = useCallback(() => {
    if (!perpendicularConstraint) return
    modelActions.removeBuildingConstraint(perpendicularConstraint.id)
    gcsService.triggerSolve()
  }, [modelActions, perpendicularConstraint])

  // --- Colinear constraint handlers ---
  const handleAddColinear = useCallback(() => {
    modelActions.addBuildingConstraint({
      type: 'colinearCorner',
      corner: cornerId
    })
    gcsService.triggerSolve()
  }, [modelActions, cornerId])

  const handleRemoveColinear = useCallback(() => {
    if (!colinearConstraint) return
    modelActions.removeBuildingConstraint(colinearConstraint.id)
    gcsService.triggerSolve()
  }, [modelActions, colinearConstraint])

  // --- Angle constraint handlers ---
  const handleAngleClick = useCallback(() => {
    if (!isSelected) return

    // Calculate the angle bisector direction for positioning the input
    const prevDir = previousWall.direction
    const nextDir = nextWall.direction

    // Get angle from previous wall to next wall
    const angle = angleVec2(prevDir, nextDir)

    // Use half angle to get bisector direction
    const halfAngle = angle / 2
    const bisectorDir = rotateVec2(prevDir, ZERO_VEC2, halfAngle)

    // Position the input inside the corner
    const inputPos = scaleAddVec2(corner.insidePoint, bisectorDir, -120)

    // Convert to stage coordinates
    const stagePos = viewportActions.worldToStage(inputPos)
    setAngleInputPosition({ x: stagePos[0], y: stagePos[1] })

    // Set initial value
    setAngleInputValue(badgeAngle)
    setAngleInputOpen(true)
  }, [isSelected, previousWall, nextWall, corner, angleConstraint, viewportActions])

  const handleAngleCommit = useCallback(
    (angleDegrees: number) => {
      const constraintAngle = (180 + angleDegrees) % 360
      const angleRadians = degreesToRadians(constraintAngle)
      modelActions.addBuildingConstraint({
        type: 'cornerAngle',
        corner: cornerId,
        angle: angleRadians
      })
      gcsService.triggerSolve()
      setAngleInputOpen(false)
    },
    [modelActions, cornerId]
  )

  const handleAngleCancel = useCallback(() => {
    if (angleConstraint) {
      modelActions.removeBuildingConstraint(angleConstraint.id)
      gcsService.triggerSolve()
    }
    setAngleInputOpen(false)
  }, [modelActions, angleConstraint])

  // --- Locked corner constraint handlers ---
  const handleAddLocked = useCallback(() => {
    const position = isNearOrigin ? ZERO_VEC2 : corner.referencePoint
    modelActions.addBuildingConstraint({
      type: 'lockedCorner',
      corner: cornerId,
      position
    })
    gcsService.triggerSolve()
  }, [modelActions, cornerId, corner.referencePoint, isNearOrigin])

  const handleRemoveLocked = useCallback(() => {
    if (!lockedConstraint) return
    modelActions.removeBuildingConstraint(lockedConstraint.id)
    gcsService.triggerSolve()
  }, [modelActions, lockedConstraint])

  return (
    <>
      <g>
        {/* Angle constraint badge inside the corner */}
        {showAngleBadge && (
          <ConstraintBadge
            label={`${Math.round(badgeAngle)}°`}
            dimLayer={2}
            startPoint={corner.insidePoint}
            endPoint={corner.insidePoint}
            outsideDirection={insideDirection}
            locked={angleConstraint != null}
            onClick={isSelected ? handleAngleClick : undefined}
            tooltipKey="angle"
            status={getBadgeStatus(angleStatus)}
          />
        )}

        {/* Colinear constraint badge on the outside of the corner */}
        {showColinearBadge && (
          <ConstraintBadge
            label={'\u2550'}
            dimLayer={2}
            startPoint={corner.outsidePoint}
            endPoint={corner.outsidePoint}
            outsideDirection={outsideDirection}
            locked={colinearConstraint != null}
            onClick={isSelected ? (colinearConstraint ? handleRemoveColinear : handleAddColinear) : undefined}
            tooltipKey="colinear"
            status={getBadgeStatus(colinearStatus)}
          />
        )}

        {/* Perpendicular constraint badge on the outside of the corner */}
        {showPerpendicularBadge && (
          <ConstraintBadge
            label="⊥"
            dimLayer={1}
            startPoint={corner.outsidePoint}
            endPoint={corner.outsidePoint}
            outsideDirection={outsideDirection}
            locked={perpendicularConstraint != null}
            onClick={
              isSelected ? (perpendicularConstraint ? handleRemovePerpendicular : handleAddPerpendicular) : undefined
            }
            tooltipKey="perpendicular"
            status={getBadgeStatus(perpendicularStatus)}
          />
        )}

        {/* Locked corner constraint badge on the outside of the corner */}
        {showLockedBadge && (
          <ConstraintBadge
            label="🔒"
            dimLayer={3}
            startPoint={corner.outsidePoint}
            endPoint={corner.outsidePoint}
            outsideDirection={outsideDirection}
            locked={lockedConstraint != null}
            onClick={isSelected ? (lockedConstraint ? handleRemoveLocked : handleAddLocked) : undefined}
            tooltipKey={lockedTooltipKey}
            status={getBadgeStatus(lockedStatus)}
          />
        )}
      </g>

      <AngleInput
        isOpen={angleInputOpen}
        value={angleInputValue}
        position={angleInputPosition}
        onCommit={handleAngleCommit}
        onCancel={handleAngleCancel}
      />
    </>
  )
}
