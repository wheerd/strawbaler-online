import { vec2 } from 'gl-matrix'
import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { SnappingLines } from '@/editor/canvas/utils/SnappingLines'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/MovementBehavior'
import type {
  FloorAreaEntityContext,
  FloorAreaMovementState
} from '@/editor/tools/basic/movement/behaviors/FloorAreaMovementBehavior'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

export function FloorAreaMovementPreview({
  movementState,
  isValid,
  context
}: MovementPreviewComponentProps<FloorAreaEntityContext, FloorAreaMovementState>): React.JSX.Element {
  const theme = useCanvasTheme()
  const previewPoints = context.entity.floorArea.area.points.map(point =>
    vec2.add(vec2.create(), point, movementState.movementDelta)
  )

  return (
    <Group>
      <SnappingLines snapResult={movementState.snapResult} />
      <Line
        points={previewPoints.flatMap(point => [point[0], point[1]])}
        closed
        stroke={isValid ? theme.primary : theme.danger}
        strokeWidth={16}
        dash={[60, 30]}
        opacity={0.6}
        listening={false}
      />
      <Line
        points={previewPoints.flatMap(point => [point[0], point[1]])}
        closed
        fill={isValid ? theme.primaryLight : theme.danger}
        opacity={0.2}
        listening={false}
      />
    </Group>
  )
}
