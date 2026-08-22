import type {
  IntermediateWallEntityContext,
  IntermediateWallMovementState
} from '@/editor/tools/basic/movement/behaviors/IntermediateWallMovementBehavior'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/types'

export function IntermediateWallMovementPreview({
  movementState,
  isValid
}: MovementPreviewComponentProps<IntermediateWallEntityContext, IntermediateWallMovementState>): React.JSX.Element {
  const color = isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'
  return (
    <g pointerEvents="none">
      <line
        x1={movementState.centerLine.start[0]}
        y1={movementState.centerLine.start[1]}
        x2={movementState.centerLine.end[0]}
        y2={movementState.centerLine.end[1]}
        stroke={color}
        strokeWidth={30}
        opacity={0.65}
      />
      <line
        x1={movementState.centerLine.start[0]}
        y1={movementState.centerLine.start[1]}
        x2={movementState.centerLine.end[0]}
        y2={movementState.centerLine.end[1]}
        stroke={color}
        strokeWidth={10}
        strokeDasharray="80 40"
      />
    </g>
  )
}
