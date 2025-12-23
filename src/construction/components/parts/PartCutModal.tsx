import { Grid } from '@radix-ui/themes'
import React, { useMemo, useRef } from 'react'

import { calculateBeamSegments } from '@/construction/utils/calculateBeamSegments'
import { CoordinateMapper } from '@/construction/utils/coordinateMapper'
import { BaseModal } from '@/shared/components/BaseModal'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { Bounds2D, type Polygon2D, type PolygonWithHoles2D, newVec2 } from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { GridMeasurementSystem } from './GridMeasurementSystem'
import { ZigzagBreakIndicator } from './ZigzagBreakIndicator'
import { BEAM_CUT_CONFIG } from './beamCutConfig'
import { generateSegmentClipPath } from './zigzagPath'

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

  // Calculate beam segments (virtual coordinates only)
  const { segments } = useMemo(
    () =>
      calculateBeamSegments(
        flippedPolygon,
        contentBounds,
        BEAM_CUT_CONFIG.segmentation.bufferDistance,
        BEAM_CUT_CONFIG.segmentation.minGapSize
      ),
    [flippedPolygon, contentBounds]
  )

  // Create coordinate mapper with display gap width
  const coordinateMapper = useMemo(() => new CoordinateMapper(segments, BEAM_CUT_CONFIG.display.gapWidth), [segments])

  // Calculate display bounds (including gap spacing)
  const displayBounds = useMemo(() => {
    if (segments.length === 0) {
      return contentBounds
    }
    const displayWidth = coordinateMapper.getTotalDisplayWidth()
    return Bounds2D.fromMinMax(newVec2(0, contentBounds.min[1]), newVec2(displayWidth, contentBounds.max[1]))
  }, [segments, contentBounds, coordinateMapper])

  // Generate the full polygon path once (no clipping or transformation)
  const fullPolygonPath = useMemo(() => polygonWithHolesToSvgPath(flippedPolygon), [flippedPolygon])

  const [containerSize, containerRef] = elementSizeRef()

  // Generate unique clip path IDs for each segment
  const clipPathIds = useMemo(
    () => segments.map((_, index) => `segment-clip-${index}-${Math.random().toString(36).substring(2, 11)}`),
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
              {segments.map((_, index) => {
                const isFirst = index === 0
                const isLast = index === segments.length - 1

                const displayStart = coordinateMapper.getSegmentDisplayStart(index)
                const displayEnd = coordinateMapper.getSegmentDisplayEnd(index)

                // Generate clip path with zigzag edges only where there are gaps
                const clipPath = generateSegmentClipPath(
                  displayStart,
                  displayEnd,
                  displayBounds.min[1],
                  displayBounds.max[1],
                  BEAM_CUT_CONFIG.zigzag,
                  {
                    leftZigzag: !isFirst, // Zigzag on left only if not first segment
                    rightZigzag: !isLast // Zigzag on right only if not last segment
                  }
                )

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
              const displayStart = coordinateMapper.getSegmentDisplayStart(index)
              const xOffset = displayStart - segment.start

              return (
                <g key={`segment-${index}`} clipPath={`url(#${clipPathIds[index]})`}>
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
              )
            })}

            {/* Render zigzag break indicators */}
            {Array.from({ length: coordinateMapper.getGapCount() }).map((_, gapIndex) => (
              <ZigzagBreakIndicator
                key={`gap-${gapIndex}`}
                displayX={coordinateMapper.getGapDisplayCenter(gapIndex)}
                yMin={displayBounds.min[1]}
                yMax={displayBounds.max[1]}
                omittedLength={coordinateMapper.getGapVirtualLength(gapIndex)}
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
