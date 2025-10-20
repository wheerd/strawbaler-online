import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { FloorOpening } from '@/building/model/model'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'

interface FloorOpeningShapeProps {
  opening: FloorOpening
}

export function FloorOpeningShape({ opening }: FloorOpeningShapeProps): React.JSX.Element {
  const theme = useCanvasTheme()
  const points = opening.area.points.flatMap(point => [point[0], point[1]])

  return (
    <Group
      name={`floor-opening-${opening.id}`}
      entityId={opening.id}
      entityType="floor-opening"
      parentIds={[]}
      listening
    >
      <Line
        points={points}
        closed
        fill={theme.bgCanvas}
        stroke={theme.warning}
        dash={[80, 40]}
        strokeWidth={10}
        listening
      />
    </Group>
  )
}
