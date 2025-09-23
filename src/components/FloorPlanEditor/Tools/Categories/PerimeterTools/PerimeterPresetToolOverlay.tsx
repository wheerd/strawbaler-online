import React from 'react'
import { Group, Line, Circle } from 'react-konva/lib/ReactKonvaCore'
import type { ToolOverlayComponentProps } from '@/components/FloorPlanEditor/Tools/ToolSystem/types'
import type { PerimeterPresetTool } from './PerimeterPresetTool'
import { useZoom } from '@/components/FloorPlanEditor/hooks/useViewportStore'
import { COLORS } from '@/theme/colors'
import { useReactiveTool } from '@/components/FloorPlanEditor/Tools/hooks/useReactiveTool'

/**
 * React overlay component for PerimeterPresetTool with zoom-responsive rendering.
 * Shows ghost preview of the preset perimeter during placement.
 */
export function PerimeterPresetToolOverlay({
  tool
}: ToolOverlayComponentProps<PerimeterPresetTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  // Only render preview when placing and we have a preview polygon
  if (!state.isPlacing || !state.previewPolygon) {
    return null
  }

  const polygon = state.previewPolygon

  // Calculate zoom-responsive values
  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 8 / zoom
  const gapSize = 4 / zoom
  const scaledDashPattern = [dashSize, gapSize]
  const scaledPointRadius = 3 / zoom
  const scaledPointStrokeWidth = 1 / zoom
  const scaledCrosshairSize = 20 / zoom
  const scaledCrosshairWidth = 1 / zoom

  return (
    <Group>
      {/* Ghost preview polygon outline */}
      <Line
        points={[...polygon.points.flatMap(p => [p[0], p[1]]), polygon.points[0][0], polygon.points[0][1]]}
        stroke={COLORS.ui.primary}
        strokeWidth={scaledLineWidth}
        dash={scaledDashPattern}
        opacity={0.8}
        fill={COLORS.ui.primary}
        fillOpacity={0.1}
        closed={true}
        listening={false}
      />

      {/* Corner points for better visibility */}
      {polygon.points.map((point, index) => (
        <Circle
          key={`corner-${index}`}
          x={point[0]}
          y={point[1]}
          radius={scaledPointRadius}
          fill={COLORS.ui.primary}
          stroke={COLORS.ui.white}
          strokeWidth={scaledPointStrokeWidth}
          opacity={0.9}
          listening={false}
        />
      ))}

      {/* Center crosshair for placement reference */}
      {state.previewPosition && (
        <Group opacity={0.6} listening={false}>
          {/* Horizontal crosshair line */}
          <Line
            points={[
              state.previewPosition[0] - scaledCrosshairSize,
              state.previewPosition[1],
              state.previewPosition[0] + scaledCrosshairSize,
              state.previewPosition[1]
            ]}
            stroke={COLORS.ui.primary}
            strokeWidth={scaledCrosshairWidth}
            listening={false}
          />
          {/* Vertical crosshair line */}
          <Line
            points={[
              state.previewPosition[0],
              state.previewPosition[1] - scaledCrosshairSize,
              state.previewPosition[0],
              state.previewPosition[1] + scaledCrosshairSize
            ]}
            stroke={COLORS.ui.primary}
            strokeWidth={scaledCrosshairWidth}
            listening={false}
          />
        </Group>
      )}
    </Group>
  )
}
