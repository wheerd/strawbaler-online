import { vec2 } from 'gl-matrix'
import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  FloorOpeningEntityContext,
  FloorOpeningMovementState
} from '@/editor/tools/basic/movement/behaviors/FloorOpeningMovementBehavior'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function FloorOpeningMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<FloorOpeningEntityContext, FloorOpeningMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const previewPoints = context.entity.opening.area.points.map(point =>
    vec2.add(vec2.create(), point, movementState.movementDelta)
  )

  return (
    <Group>
      <SnappingLines snapResult={movementState.snapResult} />
      <Line
        points={previewPoints.flatMap(point => [point[0], point[1]])}
        closed
        stroke={isValid ? theme.warning : theme.danger}
        strokeWidth={12}
        dash={[40, 20]}
        opacity={0.7}
        listening={false}
      />
      <Line
        points={previewPoints.flatMap(point => [point[0], point[1]])}
        closed
        fill={isValid ? theme.warning : theme.danger}
        opacity={0.15}
        listening={false}
      />
    </Group>
  )
}
