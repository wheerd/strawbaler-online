import React from 'react'

import { SnappingLines } from '@/editor/canvas/components/SnappingLines'
import type { PolygonMovementState } from '@/editor/tools/basic/movement/behaviors/PolygonMovementBehavior'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/types'
import type { Vec2 } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PolygonMovementPreview<TEntity>({
  movementState,
  isValid
}: MovementPreviewComponentProps<TEntity, PolygonMovementState>): React.JSX.Element {
  const pathData = polygonToSvgPath({ points: movementState.previewPolygon as Vec2[] })

  return (
    <g pointerEvents="none">
      <SnappingLines snapResults={movementState.snapResults} />

      {movementState.snapResults.map((snapResult, index) => (
        <circle
          key={`snap-point-${index}`}
          cx={snapResult.position[0]}
          cy={snapResult.position[1]}
          r={50}
          fill="var(--color-blue-600)"
          stroke="var(--color-border-contrast)"
          strokeWidth={5}
          opacity={0.8}
        />
      ))}

      <path
        d={pathData}
        fill="none"
        stroke={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        strokeWidth={20}
        strokeDasharray="80 40"
        opacity={0.6}
      />

      <path
        d={pathData}
        fill={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        stroke="none"
        opacity={0.3}
      />
    </g>
  )
}
