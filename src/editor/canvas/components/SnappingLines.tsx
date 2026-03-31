import React from 'react'

import type { SnapResult } from '@/editor/canvas/services/SnappingService'
import { useStageHeight, useStageWidth, useZoom } from '@/editor/canvas/state/viewportStore'
import type { Line2D } from '@/shared/geometry'
import { eqVec2, newVec2 } from '@/shared/geometry'

interface SnappingLinesProps {
  snapResult?: SnapResult<unknown> | null
  snapResults?: SnapResult<unknown>[]
}

function deduplicateLines(lines: readonly Line2D[]): Line2D[] {
  const seen = new Set<string>()
  return lines.filter(line => {
    const key = `${line.point[0]},${line.point[1]},${line.direction[0]},${line.direction[1]}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function SnappingLines({ snapResult, snapResults }: SnappingLinesProps): React.JSX.Element | null {
  const zoom = useZoom()
  const stageWidth = useStageWidth()
  const stageHeight = useStageHeight()

  const allResults: SnapResult<unknown>[] = []
  if (snapResult) allResults.push(snapResult)
  if (snapResults) allResults.push(...snapResults)

  const allLines = deduplicateLines(allResults.flatMap(r => (r.lines ? [...r.lines] : [])))

  if (allLines.length === 0) {
    return null
  }

  // Calculate zoom-responsive values
  const scaledSnapLineWidth = Math.max(1, 2 / zoom)
  const lineExtend = (Math.max(stageWidth, stageHeight) * 2) / zoom

  return (
    <g pointerEvents="none">
      {allLines.map((line, index) => {
        const color = eqVec2(line.direction, newVec2(0, 1))
          ? 'var(--color-red-700)'
          : eqVec2(line.direction, newVec2(1, 0))
            ? 'var(--color-green-700)'
            : 'var(--color-blue-700)'
        return (
          <line
            key={`snap-line-${index}`}
            x1={line.point[0] - lineExtend * line.direction[0]}
            y1={line.point[1] - lineExtend * line.direction[1]}
            x2={line.point[0] + lineExtend * line.direction[0]}
            y2={line.point[1] + lineExtend * line.direction[1]}
            stroke={color}
            strokeWidth={scaledSnapLineWidth}
            opacity={0.5}
          />
        )
      })}
    </g>
  )
}
