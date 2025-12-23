import React from 'react'

import { formatLength } from '@/shared/utils/formatting'

interface ZigzagBreakIndicatorProps {
  displayX: number // Where to draw in display coords
  yMin: number // Bottom of beam
  yMax: number // Top of beam
  omittedLength: number // Distance to show in label
  zigzagWidth?: number // Horizontal width of zigzag
  peaks?: number // Number of peaks in zigzag
  gapWidth?: number // Total gap width allocated
}

export function ZigzagBreakIndicator({
  displayX,
  yMin,
  yMax,
  omittedLength,
  zigzagWidth = 8,
  peaks = 4,
  gapWidth = 20
}: ZigzagBreakIndicatorProps): React.JSX.Element {
  const height = yMax - yMin
  const peakHeight = height / peaks

  // Create left zigzag path (pointing right)
  const leftZigzagPath: string[] = []
  const leftX = displayX - gapWidth / 2
  leftZigzagPath.push(`M ${leftX} ${yMin}`)

  for (let i = 0; i < peaks; i++) {
    const y1 = yMin + i * peakHeight + peakHeight / 2
    const y2 = yMin + (i + 1) * peakHeight

    // Zag to the right
    leftZigzagPath.push(`L ${leftX + zigzagWidth} ${y1}`)
    // Zig back to the left
    leftZigzagPath.push(`L ${leftX} ${y2}`)
  }

  // Create right zigzag path (also pointing right, parallel to left)
  const rightZigzagPath: string[] = []
  const rightX = displayX + gapWidth / 2
  rightZigzagPath.push(`M ${rightX} ${yMin}`)

  for (let i = 0; i < peaks; i++) {
    const y1 = yMin + i * peakHeight + peakHeight / 2
    const y2 = yMin + (i + 1) * peakHeight

    // Zag to the right (same direction as left zigzag - parallel)
    rightZigzagPath.push(`L ${rightX + zigzagWidth} ${y1}`)
    // Zig back to starting position
    rightZigzagPath.push(`L ${rightX} ${y2}`)
  }

  const leftPathString = leftZigzagPath.join(' ')
  const rightPathString = rightZigzagPath.join(' ')

  // Calculate label position (center of gap)
  const labelX = displayX
  const labelY = (yMin + yMax) / 2

  // Create unique IDs for clip paths
  const clipId = `zigzag-clip-${Math.random().toString(36).substr(2, 9)}`

  return (
    <g className="zigzag-break-indicator">
      {/* Define clip paths */}
      <defs>
        <clipPath id={`${clipId}-left`}>
          <rect x={leftX} y={yMin} width={zigzagWidth} height={height} />
        </clipPath>
        <clipPath id={`${clipId}-right`}>
          <rect x={rightX - zigzagWidth} y={yMin} width={zigzagWidth} height={height} />
        </clipPath>
      </defs>

      {/* Left zigzag line */}
      <path d={leftPathString} stroke="rgba(0, 0, 0, 0.3)" strokeWidth="2" fill="none" />

      {/* Right zigzag line */}
      <path d={rightPathString} stroke="rgba(0, 0, 0, 0.3)" strokeWidth="2" fill="none" />

      {/* Label showing omitted length */}
      <g transform={`translate(${labelX}, ${labelY})`}>
        <text
          x={0}
          y={0}
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
