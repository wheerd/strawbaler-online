import type {
  WallNodeEntityContext,
  WallNodeMovementState
} from '@/editor/tools/basic/movement/behaviors/WallNodeMovementBehavior'
import type { MovementPreviewComponentProps } from '@/editor/tools/basic/movement/types'

export function WallNodeMovementPreview({
  movementState,
  isValid
}: MovementPreviewComponentProps<WallNodeEntityContext, WallNodeMovementState>): React.JSX.Element {
  const lines = movementState.previewLines
  return (
    <g pointerEvents="none">
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.start[0]}
          y1={line.start[1]}
          x2={line.end[0]}
          y2={line.end[1]}
          stroke="var(--color-border-contrast)"
          strokeWidth={10}
          strokeDasharray="50 50"
          opacity={0.7}
        />
      ))}
      <circle
        cx={movementState.position[0]}
        cy={movementState.position[1]}
        r={30}
        fill={isValid ? 'var(--color-green-600)' : 'var(--color-red-600)'}
        stroke="var(--color-border-contrast)"
        strokeWidth={5}
        opacity={0.8}
      />
    </g>
  )
}
