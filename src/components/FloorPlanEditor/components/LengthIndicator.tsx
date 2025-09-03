import { Group, Line, Text } from 'react-konva'
import { distance, subtract, normalize, perpendicularCCW, add, scale, midpoint, angle } from '@/types/geometry'
import type { Vec2 } from '@/types/geometry'
import { useViewport } from '../hooks/useEditorStore'

interface LengthIndicatorProps {
  startPoint: Vec2
  endPoint: Vec2
  label?: string
  offset?: number
  color?: string
  fontSize?: number
  endMarkerSize?: number
  listening?: boolean
  zoom?: number
}

export function LengthIndicator({
  startPoint,
  endPoint,
  label,
  offset = 50,
  color = '#333',
  fontSize = 40,
  endMarkerSize = 20,
  listening = false,
  zoom
}: LengthIndicatorProps): React.JSX.Element {
  const viewport = useViewport()
  const effectiveZoom = zoom ?? viewport.zoom
  // Calculate the measurement vector and length
  const measurementVector = subtract(endPoint, startPoint)
  const measurementLength = distance(startPoint, endPoint)

  // Get the perpendicular vector for offset
  const perpendicular = measurementLength > 0 ? perpendicularCCW(normalize(measurementVector)) : [0, 0]

  // Calculate offset positions
  const offsetStartPoint = add(startPoint, scale(perpendicular, offset))
  const offsetEndPoint = add(endPoint, scale(perpendicular, offset))

  // Calculate midpoint for label
  const labelPosition = midpoint(offsetStartPoint, offsetEndPoint)

  // Calculate text rotation angle
  const measurementAngle = measurementLength > 0 ? angle(startPoint, endPoint) : 0
  let angleDegrees = (measurementAngle * 180) / Math.PI

  // Keep text readable (between -90 and +90 degrees)
  if (angleDegrees > 90) {
    angleDegrees -= 180
  } else if (angleDegrees < -90) {
    angleDegrees += 180
  }

  // Auto-generate label if not provided
  const displayLabel = label ?? `${(measurementLength / 1000).toFixed(2)}m`

  // Scale line widths and sizes based on zoom for consistent visual appearance
  const scaledStrokeWidth = Math.max(0.5, 2 / effectiveZoom)
  const scaledConnectionStrokeWidth = Math.max(0.3, 1 / effectiveZoom)
  const scaledFontSize = Math.max(20, fontSize / effectiveZoom)
  const scaledEndMarkerSize = Math.max(10, endMarkerSize / effectiveZoom)

  // Calculate end marker positions (perpendicular to measurement line)
  const endMarkerDirection = scale(perpendicular, scaledEndMarkerSize / 2)

  return (
    <Group listening={listening}>
      {/* Main dimension line */}
      <Line
        points={[offsetStartPoint[0], offsetStartPoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* Connection lines from measurement points to dimension line */}
      <Line
        points={[startPoint[0], startPoint[1], offsetStartPoint[0], offsetStartPoint[1]]}
        stroke={color}
        strokeWidth={scaledConnectionStrokeWidth}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={[endPoint[0], endPoint[1], offsetEndPoint[0], offsetEndPoint[1]]}
        stroke={color}
        strokeWidth={scaledConnectionStrokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* End markers (small perpendicular lines) */}
      <Line
        points={[
          offsetStartPoint[0] - endMarkerDirection[0],
          offsetStartPoint[1] - endMarkerDirection[1],
          offsetStartPoint[0] + endMarkerDirection[0],
          offsetStartPoint[1] + endMarkerDirection[1]
        ]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />
      <Line
        points={[
          offsetEndPoint[0] - endMarkerDirection[0],
          offsetEndPoint[1] - endMarkerDirection[1],
          offsetEndPoint[0] + endMarkerDirection[0],
          offsetEndPoint[1] + endMarkerDirection[1]
        ]}
        stroke={color}
        strokeWidth={scaledStrokeWidth}
        lineCap="butt"
        listening={false}
      />

      {/* Label text */}
      <Text
        x={offsetStartPoint[0]}
        y={offsetStartPoint[1]}
        text={displayLabel}
        fontSize={scaledFontSize}
        fontFamily="Arial"
        fontStyle="bold"
        fill={color}
        align="center"
        verticalAlign="middle"
        width={measurementLength}
        offsetY={scaledFontSize / 2}
        rotation={angleDegrees}
        shadowColor="white"
        shadowBlur={4}
        shadowOpacity={0.8}
        listening={false}
      />
    </Group>
  )
}
