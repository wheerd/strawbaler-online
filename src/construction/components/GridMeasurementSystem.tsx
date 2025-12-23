import React, { useMemo } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { type CoordinateMapper } from '@/construction/utils/coordinateMapper'
import { type Bounds2D, type PolygonWithHoles2D, newVec2 } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

interface GridMeasurementSystemProps {
  polygon: PolygonWithHoles2D
  displayBounds: Bounds2D
  coordinateMapper: CoordinateMapper
}

export function GridMeasurementSystem({
  polygon,
  displayBounds,
  coordinateMapper
}: GridMeasurementSystemProps): React.JSX.Element {
  // Extract unique X and Y coordinates from polygon points (in virtual space)
  const { xCoords, yCoords } = useMemo(() => {
    const allPoints = polygon.outer.points.concat(polygon.holes.flatMap(h => h.points))
    const xSet = new Set(allPoints.map(p => p[0]))
    const ySet = new Set(allPoints.map(p => p[1]))

    return {
      xCoords: Array.from(xSet).sort((a, b) => a - b),
      yCoords: Array.from(ySet).sort((a, b) => a - b)
    }
  }, [polygon])
  const totalWidth = xCoords[xCoords.length - 1] - xCoords[0]
  const totalHeight = yCoords[yCoords.length - 1] - yCoords[0]

  // Map X coordinates to display space and filter out those in gaps
  const displayXCoords = useMemo(() => {
    return xCoords
      .map(virtualX => {
        const displayX = coordinateMapper.toDisplay(virtualX)
        if (displayX === null) return null
        return { virtualX, displayX }
      })
      .filter((item): item is { virtualX: number; displayX: number } => item !== null)
  }, [xCoords, coordinateMapper])

  // Calculate display bounds accounting for all segments
  const totalDisplayWidth = useMemo(() => {
    return coordinateMapper.getTotalDisplayWidth()
  }, [coordinateMapper])

  // Generate grid lines and measurements
  const gridElements = useMemo(() => {
    const elements = {
      verticalLines: [] as React.JSX.Element[],
      horizontalLines: [] as React.JSX.Element[],
      horizontalMeasurements: [] as React.JSX.Element[],
      verticalMeasurements: [] as React.JSX.Element[]
    }

    // Vertical grid lines at each X coordinate
    displayXCoords.forEach((coord, index) => {
      elements.verticalLines.push(
        <line
          key={`vline-${index}`}
          x1={coord.displayX}
          y1={displayBounds.min[1]}
          x2={coord.displayX}
          y2={displayBounds.max[1]}
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
      )
    })

    // Horizontal grid lines at each Y coordinate, continuous across the whole beam
    yCoords.forEach((y, index) => {
      elements.horizontalLines.push(
        <line
          key={`hline-${index}`}
          x1={0}
          y1={y}
          x2={totalDisplayWidth}
          y2={y}
          stroke="rgba(0, 0, 0, 0.3)"
          strokeWidth="0.5"
          strokeDasharray="2 2"
        />
      )
    })

    // Total horizontal measurements
    if (displayXCoords.length > 2) {
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key="hmeas-bottom"
          startPoint={newVec2(displayBounds.min[0], displayBounds.max[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.max[1])}
          label={formatLength(totalWidth)}
          offset={25}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />,

        <SvgMeasurementIndicator
          key="hmeas-bottom"
          startPoint={newVec2(displayBounds.min[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.min[1])}
          label={formatLength(totalWidth)}
          offset={-25}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )
    }

    // Horizontal measurements between consecutive X coordinates
    for (let i = 0; i < displayXCoords.length - 1; i++) {
      const current = displayXCoords[i]
      const next = displayXCoords[i + 1]

      // Calculate the actual distance in virtual space
      const distance = next.virtualX - current.virtualX

      // Top measurement
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key={`hmeas-top-${i}`}
          startPoint={newVec2(current.displayX, displayBounds.min[1])}
          endPoint={newVec2(next.displayX, displayBounds.min[1])}
          label={formatLength(distance)}
          offset={-15}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )

      // Bottom measurement
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key={`hmeas-bottom-${i}`}
          startPoint={newVec2(current.displayX, displayBounds.max[1])}
          endPoint={newVec2(next.displayX, displayBounds.max[1])}
          label={formatLength(distance)}
          offset={15}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )
    }

    // Total vertical measurements
    if (yCoords.length > 2) {
      elements.horizontalMeasurements.push(
        <SvgMeasurementIndicator
          key="vmeas-left"
          startPoint={newVec2(displayBounds.min[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.min[0], displayBounds.max[1])}
          label={formatLength(totalHeight)}
          offset={25}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />,

        <SvgMeasurementIndicator
          key="vmeas-right"
          startPoint={newVec2(displayBounds.max[0], displayBounds.min[1])}
          endPoint={newVec2(displayBounds.max[0], displayBounds.max[1])}
          label={formatLength(totalHeight)}
          offset={-25}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )
    }

    // Vertical measurements between consecutive Y coordinates
    for (let i = 0; i < yCoords.length - 1; i++) {
      const currentY = yCoords[i]
      const nextY = yCoords[i + 1]
      const distance = nextY - currentY

      // Left measurement
      elements.verticalMeasurements.push(
        <SvgMeasurementIndicator
          key={`vmeas-left-${i}`}
          startPoint={newVec2(0, currentY)}
          endPoint={newVec2(0, nextY)}
          label={formatLength(distance)}
          offset={15}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )

      // Right measurement
      elements.verticalMeasurements.push(
        <SvgMeasurementIndicator
          key={`vmeas-right-${i}`}
          startPoint={newVec2(totalDisplayWidth, currentY)}
          endPoint={newVec2(totalDisplayWidth, nextY)}
          label={formatLength(distance)}
          offset={-15}
          color="rgba(0, 0, 0, 0.7)"
          fontSize={10}
          strokeWidth={1}
        />
      )
    }

    return elements
  }, [displayXCoords, yCoords, displayBounds, coordinateMapper, totalDisplayWidth])

  return (
    <g className="grid-measurement-system">
      {/* Grid lines */}
      <g className="grid-lines">{[...gridElements.verticalLines, ...gridElements.horizontalLines]}</g>

      {/* Measurements */}
      <g className="measurements">{[...gridElements.horizontalMeasurements, ...gridElements.verticalMeasurements]}</g>
    </g>
  )
}
