import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { FloorArea } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface FloorAreaShapeProps {
  area: FloorArea
}

export function FloorAreaShape({ area }: FloorAreaShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = area.area.points.flatMap(point => [point[0], point[1]])

  return (
    <Group
      name={`floor-area-${area.id}`}
      entityId={area.id}
      entityType="floor-area"
      parentIds={[area.storeyId]}
      listening
    >
      <Line
        points={points}
        closed
        fill={theme.primaryLight}
        opacity={0.25}
        stroke={theme.primary}
        strokeWidth={1}
        listening
      />
    </Group>
  )
}
