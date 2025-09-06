import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { MoveTool } from '../MoveTool'
import { Group, Circle, Text } from 'react-konva'
import { useReactiveTool } from '../../../hooks/useReactiveTool'

export function MoveToolOverlay({ tool }: ToolOverlayComponentProps<MoveTool>) {
  useReactiveTool(tool)
  const toolState = tool.getToolState()

  if (!toolState.isMoving || !toolState.currentMovementState) {
    return null
  }

  const { behavior, context, currentMovementState } = toolState
  if (!behavior || !context) return null

  const previewElements = behavior.generatePreview(currentMovementState, context)

  return (
    <Group>
      {previewElements}
      {!currentMovementState.isValidPosition && (
        <Group>
          <Circle
            x={currentMovementState.finalPosition[0]}
            y={currentMovementState.finalPosition[1]}
            radius={8}
            fill="red"
            opacity={0.7}
          />
          <Text
            text="Invalid position"
            fill="red"
            fontSize={12}
            x={currentMovementState.finalPosition[0] + 15}
            y={currentMovementState.finalPosition[1] - 5}
          />
        </Group>
      )}
    </Group>
  )
}
