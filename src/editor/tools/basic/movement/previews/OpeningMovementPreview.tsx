import React from 'react'

import type {
  OpeningEntityContext,
  OpeningMovementState
} from '@/editor/tools/basic/movement/behaviors/OpeningMovementBehavior'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/types'
import { getWallMovementGeometry } from '@/editor/tools/basic/movement/wallMovementGeometry'
import { normVec2, scaleAddVec2, subVec2 } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function OpeningMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<OpeningEntityContext, OpeningMovementState>): React.JSX.Element {
  const { wall, opening } = context.entity
  const wallGeometry = getWallMovementGeometry(wall)

  // Calculate the opening rectangle in new position
  const wallStart = wallGeometry.insideLine.start
  const outsideDirection = normVec2(subVec2(wallGeometry.outsideLine.start, wallStart))
  const outsideDistance = Math.hypot(
    wallGeometry.outsideLine.start[0] - wallStart[0],
    wallGeometry.outsideLine.start[1] - wallStart[1]
  )
  const halfWidth = opening.width / 2

  const openingStart = scaleAddVec2(wallStart, wall.direction, movementState.newOffset - halfWidth)
  const openingEnd = scaleAddVec2(wallStart, wall.direction, movementState.newOffset + halfWidth)

  // Create opening rectangle
  const insideStart = openingStart
  const insideEnd = openingEnd
  const outsideStart = scaleAddVec2(openingStart, outsideDirection, outsideDistance)
  const outsideEnd = scaleAddVec2(openingEnd, outsideDirection, outsideDistance)

  // Original position for movement indicator
  const originalStart = scaleAddVec2(wallStart, wall.direction, opening.centerOffsetFromWallStart)

  const pathData = polygonToSvgPath({ points: [insideStart, insideEnd, outsideEnd, outsideStart] })

  return (
    <g pointerEvents="none">
      {/* Show opening rectangle */}
      <path
        d={pathData}
        fill={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        stroke="var(--color-border-contrast)"
        strokeWidth={5}
        opacity={0.6}
      />

      {/* Show movement indicator */}
      <line
        x1={originalStart[0]}
        y1={originalStart[1]}
        x2={openingStart[0]}
        y2={openingStart[1]}
        stroke="var(--color-border-contrast)"
        strokeWidth={10}
        strokeDasharray="20 20"
        opacity={0.7}
      />
    </g>
  )
}
