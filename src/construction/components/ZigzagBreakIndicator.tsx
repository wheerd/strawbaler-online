import React from 'react'

import { formatLength } from '@/shared/utils/formatting'

import { BEAM_CUT_CONFIG } from './beamCutConfig'
import { generateZigzagEdgePoints, pointsToSvgPath } from './zigzagPath'

interface ZigzagBreakIndicatorProps {
  displayX: number // Center X position in display coords
  yMin: number // Bottom of beam
  yMax: number // Top of beam
  omittedLength: number // Virtual distance omitted
}

export function ZigzagBreakIndicator({
  displayX,
  yMin,
  yMax,
  omittedLength
}: ZigzagBreakIndicatorProps): React.JSX.Element {
  const { gapWidth } = BEAM_CUT_CONFIG.display
  const leftX = displayX - gapWidth / 2
  const rightX = displayX + gapWidth / 2

  // Generate left zigzag path
  const leftPoints = generateZigzagEdgePoints(leftX, yMin, yMax, BEAM_CUT_CONFIG.zigzag)
  const leftPath = pointsToSvgPath(leftPoints, false)

  // Generate right zigzag path (parallel to left)
  const rightPoints = generateZigzagEdgePoints(rightX, yMin, yMax, BEAM_CUT_CONFIG.zigzag)
  const rightPath = pointsToSvgPath(rightPoints, false)

  // Calculate label position (center of gap)
  const labelX = displayX
  const labelY = (yMin + yMax) / 2

  return (
    <g className="zigzag-break-indicator">
      {/* Left zigzag line */}
      <path d={leftPath} stroke="var(--gray-7)" strokeWidth="5" fill="none" opacity={0.8} />

      {/* Right zigzag line */}
      <path d={rightPath} stroke="var(--gray-7)" strokeWidth="5" fill="none" opacity={0.8} />

      {/* Label showing omitted length */}
      <g transform={`translate(${labelX}, ${labelY})`}>
        <text
          x={0}
          y={0}
          width={gapWidth}
          fontSize={10}
          fontFamily="Arial"
          fill="var(--gray-10)"
          textAnchor="middle"
          dominantBaseline="central"
        >
          <tspan x="0" y="0">
            {formatLength(Math.round(omittedLength / 100) * 100)}
          </tspan>
          <tspan x="0" dy="1.2em">
            omitted
          </tspan>
        </text>
      </g>
    </g>
  )
}
