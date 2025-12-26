import { Grid } from '@radix-ui/themes'
import React, { useId, useMemo, useRef } from 'react'

import { BaseModal } from '@/shared/components/BaseModal'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import {
  Bounds2D,
  type PolygonWithHoles2D,
  type Vec2,
  ensurePolygonIsClockwise,
  ensurePolygonIsCounterClockwise,
  newVec2
} from '@/shared/geometry'
import { elementSizeRef } from '@/shared/hooks/useElementSize'

import { PolygonAngleIndicators } from './AngleIndicators'
import { DiagonalEdgeMeasurements } from './DiagonalEdgeMeasurements'
import { GridMeasurementSystem } from './GridMeasurementSystem'

function polygonWithHolesToSvgPath(polygon: PolygonWithHoles2D) {
  const polygonToSvgPath = (points: Vec2[]) => {
    return `M${points.map(([px, py]) => `${px},${py}`).join(' L')} Z`
  }
  return [polygon.outer.points, ...polygon.holes.map(h => h.points)].map(polygonToSvgPath).join(' ')
}

export function SheetPartModal({
  polygon,
  trigger
}: {
  polygon: PolygonWithHoles2D
  trigger: React.ReactNode
}): React.JSX.Element {
  const viewportRef = useRef<SVGViewportRef>(null)
  const polygonId = useId()

  // Flip coordinates (swap X and Y) to fit better on screen
  const flippedPolygon: PolygonWithHoles2D = useMemo(
    () => ({
      outer: ensurePolygonIsClockwise({ points: polygon.outer.points.map(p => newVec2(p[1], p[0])) }),
      holes: polygon.holes.map(h => ensurePolygonIsCounterClockwise({ points: h.points.map(p => newVec2(p[1], p[0])) }))
    }),
    [polygon]
  )

  const displayBounds = useMemo(() => Bounds2D.fromPoints(flippedPolygon.outer.points), [flippedPolygon])

  // Generate the full polygon path
  const fullPolygonPath = useMemo(() => polygonWithHolesToSvgPath(flippedPolygon), [flippedPolygon])

  const [containerSize, containerRef] = elementSizeRef()

  return (
    <BaseModal height="90vh" width="95vw" maxHeight="90vh" maxWidth="95vw" title="Sheet Part Diagram" trigger={trigger}>
      <Grid rows="1fr" p="0">
        <div className="p0 m0" style={{ maxHeight: '80vh' }} ref={containerRef}>
          <SVGViewport
            ref={viewportRef}
            contentBounds={displayBounds}
            paddingAbsolute={40}
            resetButtonPosition="top-right"
            svgSize={containerSize}
          >
            <defs>
              <path id={polygonId} d={fullPolygonPath} />
            </defs>

            {/* Render the polygon */}
            <use
              href={`#${polygonId}`}
              stroke="var(--accent-9)"
              strokeWidth="1"
              fill="var(--accent-9)"
              fillOpacity="0.5"
              strokeLinejoin="miter"
            />

            {/* Render grid and measurements (no coordinate mapper needed) */}
            <GridMeasurementSystem polygon={flippedPolygon} displayBounds={displayBounds} />

            {/* Render angle indicators */}
            <PolygonAngleIndicators polygon={flippedPolygon} />

            {/* Render diagonal edge measurements */}
            <DiagonalEdgeMeasurements polygon={flippedPolygon} />
          </SVGViewport>
        </div>
      </Grid>
    </BaseModal>
  )
}
