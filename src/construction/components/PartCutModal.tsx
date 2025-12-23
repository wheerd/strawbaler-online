import { Grid } from '@radix-ui/themes'
import React, { useMemo, useRef } from 'react'

import { GridMeasurementSystem } from '@/construction/components/GridMeasurementSystem'
import { ZigzagBreakIndicator } from '@/construction/components/ZigzagBreakIndicator'
import { calculateBeamSegments } from '@/construction/utils/calculateBeamSegments'
import { CoordinateMapper } from '@/construction/utils/coordinateMapper'
import { BaseModal } from '@/shared/components/BaseModal'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { Bounds2D, type Polygon2D, type PolygonWithHoles2D, newVec2 } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

function polygonToSvgPath(polygon: Polygon2D) {
  return `M${polygon.points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
}

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  return [polygon.outer, ...polygon.holes].map(polygonToSvgPath).join(' ')
}

export function PartCutModal({
  polygon,
  trigger
}: {
  polygon: PolygonWithHoles2D
  trigger: React.ReactNode
}): React.JSX.Element {
  const viewportRef = useRef<SVGViewportRef>(null)

  // Flip coordinates (swap X and Y)
  const flippedPolygon: PolygonWithHoles2D = useMemo(
    () => ({
      outer: { points: polygon.outer.points.map(p => newVec2(p[1], p[0])) },
      holes: polygon.holes.map(h => ({ points: h.points.map(p => newVec2(p[1], p[0])) }))
    }),
    [polygon]
  )

  const contentBounds = useMemo(() => Bounds2D.fromPoints(flippedPolygon.outer.points), [flippedPolygon])

  // Calculate beam segments and gaps
  const { segments, gaps } = useMemo(
    () => calculateBeamSegments(flippedPolygon, contentBounds, 50, 500),
    [flippedPolygon, contentBounds]
  )

  // Create coordinate mapper
  const coordinateMapper = useMemo(() => new CoordinateMapper(segments, gaps), [segments, gaps])

  // Calculate display bounds (including gap spacing)
  const displayBounds = useMemo(() => {
    if (segments.length === 0) {
      return contentBounds
    }
    // Total width is from start of first segment to end of last segment (includes gap widths)
    const displayWidth = segments[segments.length - 1].displayEnd
    return Bounds2D.fromMinMax(newVec2(0, contentBounds.min[1]), newVec2(displayWidth, contentBounds.max[1]))
  }, [segments, contentBounds])

  // Generate the full polygon path once (no clipping or transformation)
  const fullPolygonPath = useMemo(() => polygonWithHolesToSvgPath(flippedPolygon), [flippedPolygon])

  const [containerSize, containerRef] = elementSizeRef()

  // Generate unique clip path IDs for each segment
  const clipPathIds = useMemo(
    () => segments.map((_, index) => `segment-clip-${index}-${Math.random().toString(36).substr(2, 9)}`),
    [segments]
  )

  return (
    <BaseModal height="80vh" width="95vw" maxHeight="80vh" maxWidth="95vw" title="Part Cut Diagram" trigger={trigger}>
      <Grid rows="1fr" p="0">
        <div className="p0 m0" style={{ maxHeight: '400px' }} ref={containerRef}>
          <SVGViewport
            ref={viewportRef}
            contentBounds={displayBounds}
            padding={0.05}
            resetButtonPosition="top-right"
            svgSize={containerSize}
          >
            <defs>
              {/* Create clip paths for each segment with zigzag edges */}
              {segments.map((segment, index) => {
                const isFirst = index === 0
                const isLast = index === segments.length - 1
                const zigzagWidth = 8
                const peaks = 4
                const peakHeight = (displayBounds.max[1] - displayBounds.min[1]) / peaks
                const gapWidth = 0

                // Create zigzag path for left edge (if not first segment)
                let leftEdgePath = ''
                if (!isFirst) {
                  const leftX = segment.displayStart - gapWidth / 2
                  leftEdgePath = `M ${leftX} ${displayBounds.min[1]}`
                  for (let i = 0; i < peaks; i++) {
                    const y1 = displayBounds.min[1] + i * peakHeight + peakHeight / 2
                    const y2 = displayBounds.min[1] + (i + 1) * peakHeight
                    // Zigzag pointing right
                    leftEdgePath += ` L ${leftX + zigzagWidth} ${y1} L ${leftX} ${y2}`
                  }
                  leftEdgePath += ` L ${leftX} ${displayBounds.max[1]}`
                } else {
                  leftEdgePath = `M ${segment.displayStart} ${displayBounds.min[1]} L ${segment.displayStart} ${displayBounds.max[1]}`
                }

                // Create zigzag path for right edge (if not last segment)
                let rightEdgePath = ''
                if (!isLast) {
                  const rightX = segment.displayEnd + gapWidth / 2
                  rightEdgePath = `L ${rightX} ${displayBounds.max[1]}`
                  // Go backwards from top to bottom
                  for (let i = peaks - 1; i >= 0; i--) {
                    const y1 = displayBounds.min[1] + i * peakHeight + peakHeight / 2
                    const y2 = displayBounds.min[1] + i * peakHeight
                    // Zigzag pointing right (same direction as left - parallel)
                    rightEdgePath += ` L ${rightX + zigzagWidth} ${y1} L ${rightX} ${y2}`
                  }
                  rightEdgePath += ` L ${rightX} ${displayBounds.min[1]}`
                } else {
                  rightEdgePath = `L ${segment.displayEnd} ${displayBounds.max[1]} L ${segment.displayEnd} ${displayBounds.min[1]}`
                }

                // Create closed path for clip
                const clipPath = `${leftEdgePath} ${rightEdgePath} Z`

                return (
                  <clipPath key={clipPathIds[index]} id={clipPathIds[index]}>
                    <path d={clipPath} />
                  </clipPath>
                )
              })}
            </defs>

            {/* Render each segment with clipping - reusing the same polygon with offsets */}
            {segments.map((segment, index) => {
              // Calculate X offset to position this segment at its display location
              // but render the polygon at its virtual position
              const xOffset = segment.displayStart - segment.virtualStart

              return (
                <g key={`segment-${index}`}>
                  <g clipPath={`url(#${clipPathIds[index]})`}>
                    <g transform={`translate(${xOffset}, 0)`}>
                      <path
                        d={fullPolygonPath}
                        stroke="var(--accent-9)"
                        strokeWidth="1"
                        fill="var(--accent-9)"
                        fillOpacity="0.5"
                        strokeLinejoin="miter"
                      />
                    </g>
                  </g>
                  <use x={0} y={0} href={`url(#${clipPathIds[index]})`} stroke="red" strokeWidth="10" />
                </g>
              )
            })}

            {/* Render zigzag break indicators */}
            {gaps.map((gap, index) => (
              <ZigzagBreakIndicator
                key={`gap-${index}`}
                displayX={gap.displayPosition}
                yMin={displayBounds.min[1]}
                yMax={displayBounds.max[1]}
                omittedLength={gap.omittedLength}
                gapWidth={60}
              />
            ))}

            {/* Render grid and measurements */}
            <GridMeasurementSystem
              polygon={flippedPolygon}
              displayBounds={displayBounds}
              coordinateMapper={coordinateMapper}
            />
          </SVGViewport>
        </div>
      </Grid>
    </BaseModal>
  )
}
