import React, { useMemo } from 'react'

import { SnappingLines } from '@/editor/canvas/components/SnappingLines'
import { useZoom } from '@/editor/canvas/state/viewportStore'
import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolOverlayComponentProps } from '@/editor/tools/system/types'
import { type Vec2, addVec2, direction, perpendicularCCW, scaleVec2 } from '@/shared/geometry'

import type { IntermediateWallTool } from './IntermediateWallTool'

interface SegmentLine {
  points: string
}

interface DerivedSegments {
  type: 'segments'
  segments: SegmentLine[]
}

function toSvgPoints(points: readonly Vec2[], close = false): string {
  let result = points.map(point => `${point[0]},${point[1]}`).join(' ')
  if (close && points.length > 0) {
    result += ` ${points[0][0]},${points[0][1]}`
  }
  return result
}

function computeDerivedSegments(
  inputPoints: readonly Vec2[],
  referenceSide: 'left' | 'right',
  thickness: number
): DerivedSegments | null {
  if (thickness <= 0 || inputPoints.length < 2) {
    return null
  }

  const multiplier = referenceSide === 'left' ? 1 : -1
  const segments: SegmentLine[] = []

  for (let i = 0; i < inputPoints.length - 1; i += 1) {
    const start = inputPoints[i]
    const end = inputPoints[(i + 1) % inputPoints.length]

    const segDirection = direction(start, end)
    const outward = perpendicularCCW(segDirection)
    const offset = scaleVec2(outward, thickness * multiplier)

    const offsetStart = addVec2(start, offset)
    const offsetEnd = addVec2(end, offset)

    segments.push({ points: `${offsetStart[0]},${offsetStart[1]} ${offsetEnd[0]},${offsetEnd[1]}` })
  }

  return { type: 'segments', segments }
}

export function IntermediateWallToolOverlay({
  tool
}: ToolOverlayComponentProps<IntermediateWallTool>): React.JSX.Element | null {
  const { state } = useReactiveTool(tool)
  const zoom = useZoom()

  const scaledLineWidth = Math.max(1, 2 / zoom)
  const dashSize = 10 / zoom
  const scaledDashPattern = `${dashSize} ${dashSize}`
  const scaledDashPattern2 = `${3 / zoom} ${10 / zoom}`
  const scaledPointRadius = 5 / zoom
  const scaledPointStrokeWidth = 1 / zoom

  const previewPos = tool.getPreviewPosition()

  const workingPoints = useMemo(() => {
    const points: Vec2[] = [...state.points, previewPos]
    return points
  }, [state.points, previewPos])

  const derivedGeometry = useMemo(() => {
    if (workingPoints.length < 2 || state.thickness <= 0) {
      return null
    }

    return computeDerivedSegments(workingPoints, 'left', state.thickness)
  }, [workingPoints, state.thickness, tool])

  return (
    <g pointerEvents="none">
      <SnappingLines snapResult={state.snapResult} />

      {derivedGeometry?.type === 'segments' &&
        derivedGeometry.segments.map((segment, index) => (
          <polyline
            key={`offset-segment-${index}`}
            points={segment.points}
            fill="none"
            stroke="var(--color-gray-500)"
            strokeWidth={scaledLineWidth}
            strokeDasharray={scaledDashPattern2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        ))}

      {state.points.length > 1 && (
        <polyline
          points={toSvgPoints(state.points)}
          fill="none"
          stroke="var(--color-gray-700)"
          strokeWidth={scaledLineWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {state.points.length > 0 && (
        <line
          x1={state.points[state.points.length - 1][0]}
          y1={state.points[state.points.length - 1][1]}
          x2={previewPos[0]}
          y2={previewPos[1]}
          stroke={state.isValid ? 'var(--color-gray-800)' : 'var(--color-red-600)'}
          strokeWidth={scaledLineWidth}
          strokeDasharray={scaledDashPattern}
        />
      )}

      {state.points.map((point, index) => (
        <circle
          key={`point-${index}`}
          cx={point[0]}
          cy={point[1]}
          r={scaledPointRadius}
          fill={index === 0 ? 'var(--color-blue-600)' : 'var(--color-gray-600)'}
          stroke="var(--color-schematic-gray-1)"
          strokeWidth={scaledPointStrokeWidth}
        />
      ))}

      <circle
        key="snap-point"
        cx={previewPos[0]}
        cy={previewPos[1]}
        r={scaledPointRadius}
        fill={
          state.isValid
            ? state.lengthOverride
              ? 'var(--color-primary)'
              : 'var(--color-gray-900)'
            : 'var(--color-red-600)'
        }
        stroke={state.lengthOverride ? 'var(--color-schematic-gray-1)' : 'var(--color-gray-900)'}
        strokeWidth={scaledPointStrokeWidth}
      />
    </g>
  )
}
