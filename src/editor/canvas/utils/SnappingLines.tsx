import { vec2 } from 'gl-matrix'
import React from 'react'
import { Group, Line } from 'react-konva/lib/ReactKonvaCore'

import { useStageHeight, useStageWidth, useZoom } from '@/editor/hooks/useViewportStore'
import type { SnapResult } from '@/editor/services/snapping/types'
import { COLORS } from '@/shared/theme/colors'

interface SnappingLinesProps {
  snapResult: SnapResult | null | undefined
}

export function SnappingLines({ snapResult }: SnappingLinesProps): React.JSX.Element | null {
  const zoom = useZoom()
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  if (!snapResult?.lines?.length) {
    return null
  }

  // Calculate zoom-responsive values
  const scaledSnapLineWidth = Math.max(1, 2 / zoom)
  const lineExtend = (Math.max(stageWidth, stageHeight) * 2) / zoom

  return (
    <Group>
      {snapResult.lines.map((line, index) => {
        const color = vec2.equals(line.direction, [0, 1])
          ? COLORS.snapping.linesVertical
          : vec2.equals(line.direction, [1, 0])
            ? COLORS.snapping.linesHorizontal
            : COLORS.snapping.lines
        return (
          <Line
            key={`snap-line-${index}`}
            points={[
              line.point[0] - lineExtend * line.direction[0],
              line.point[1] - lineExtend * line.direction[1],
              line.point[0] + lineExtend * line.direction[0],
              line.point[1] + lineExtend * line.direction[1]
            ]}
            stroke={color}
            strokeWidth={scaledSnapLineWidth}
            opacity={0.5}
            listening={false}
          />
        )
      })}
    </Group>
  )
}
