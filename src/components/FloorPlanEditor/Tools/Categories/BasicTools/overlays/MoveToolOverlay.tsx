import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { MoveTool } from '../MoveTool'
import { Group, Circle, Text } from 'react-konva'
import { useReactiveTool } from '../../../hooks/useReactiveTool'
import { COLORS } from '@/theme/colors'

export function MoveToolOverlay({ tool }: ToolOverlayComponentProps<MoveTool>) {
  useReactiveTool(tool)
  const toolState = tool.getToolState()

  if (!toolState.isMoving || !toolState.currentMovementState) {
    return null
  }

  const { behavior, context, currentMovementState, isValid } = toolState
  if (!behavior || !context) return null

  const previewElements = behavior.generatePreview(currentMovementState, isValid, context)

  return (
    <Group>
      {previewElements}
      {!isValid && (
        <Group>
          <Circle
            x={toolState.mouseState?.currentPosition[0] || 0}
            y={toolState.mouseState?.currentPosition[1] || 0}
            radius={8}
            fill={COLORS.ui.danger}
            stroke={COLORS.ui.white}
            strokeWidth={2}
            opacity={0.9}
          />
          <Text
            text="Invalid position"
            fill={COLORS.ui.danger}
            fontSize={12}
            x={(toolState.mouseState?.currentPosition[0] || 0) + 15}
            y={(toolState.mouseState?.currentPosition[1] || 0) - 5}
          />
        </Group>
      )}
    </Group>
  )
}
