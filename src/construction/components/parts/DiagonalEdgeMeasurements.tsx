import React, { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { type PolygonWithHoles2D, type Vec2, newVec2 } from '@/shared/geometry'

import { type ICoordinateMapper, IdentityCoordinateMapper } from './utils/coordinateMapper'
import { getAllPolygonEdges, isAxisAligned } from './utils/edgeUtils'

interface DiagonalEdge {
  startDisplay: Vec2
  endDisplay: Vec2
  length: number
}

function getDiagonalEdges(polygon: PolygonWithHoles2D, coordinateMapper: ICoordinateMapper): DiagonalEdge[] {
  const diagonalEdges: DiagonalEdge[] = []

  // Get all edges from the polygon
  const allEdges = getAllPolygonEdges(polygon)

  for (const edge of allEdges) {
    // Skip axis-aligned edges (they're covered by the grid)
    if (isAxisAligned(edge.start, edge.end)) {
      continue
    }

    // Map to display coordinates
    const startDisplayX = coordinateMapper.toDisplay(edge.start[0])
    const endDisplayX = coordinateMapper.toDisplay(edge.end[0])

    // Skip if either endpoint is in a gap
    if (startDisplayX === null || endDisplayX === null) {
      continue
    }

    // Create display coordinates (X is mapped, Y stays the same)
    const startDisplay = newVec2(startDisplayX, edge.start[1])
    const endDisplay = newVec2(endDisplayX, edge.end[1])

    diagonalEdges.push({
      startDisplay,
      endDisplay,
      length: edge.length
    })
  }

  return diagonalEdges
}

export function DiagonalEdgeMeasurements({
  polygon,
  coordinateMapper: providedMapper
}: {
  polygon: PolygonWithHoles2D
  coordinateMapper?: ICoordinateMapper
}): React.JSX.Element {
  // Use identity mapper if none provided
  const coordinateMapper = useMemo(() => providedMapper ?? new IdentityCoordinateMapper(), [providedMapper])
  const diagonalEdges = useMemo(() => {
    return getDiagonalEdges(polygon, coordinateMapper)
  }, [polygon, coordinateMapper])

  return (
    <g className="diagonal-edge-measurements">
      {diagonalEdges.map((edge, index) => (
        <SvgMeasurementIndicator
          key={`diagonal-${index}`}
          startPoint={edge.startDisplay}
          endPoint={edge.endDisplay}
          label={edge.length.toFixed(0)}
          offset={-4}
          color="var(--gray-11)"
          fontSize={8}
          strokeWidth={1}
        />
      ))}
    </g>
  )
}
