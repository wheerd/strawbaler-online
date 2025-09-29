import { vec3 } from 'gl-matrix'
import React, { useEffect, useRef } from 'react'

import { SvgMeasurementIndicator } from '@/construction/components/SvgMeasurementIndicator'
import { bounds3Dto2D, createSvgTransform, createZOrder, project, projectRotation } from '@/construction/geometry'
import type { ConstructionModel, HighlightedCuboid, HighlightedPolygon } from '@/construction/model'
import { resolveDefaultMaterial } from '@/construction/walls'
import { SVGViewport, type SVGViewportRef } from '@/shared/components/SVGViewport'
import { type Plane3D, type Vec3, add, complementaryAxis, direction, distance } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

import { ConstructionElementShape } from './ConstructionElementShape'
import { ConstructionGroupElement } from './ConstructionGroupElement'

export interface View {
  plane: Plane3D
  zOrder: 'min' | 'max'
  xDirection: 1 | -1
  yDirection: 1 | -1
}

export const TOP_VIEW: View = { plane: 'xy', xDirection: 1, yDirection: -1, zOrder: 'max' }
export const FRONT_VIEW: View = { plane: 'xz', xDirection: 1, yDirection: -1, zOrder: 'min' }
export const BACK_VIEW: View = { plane: 'xz', xDirection: -1, yDirection: -1, zOrder: 'max' }

interface ConstructionPlanProps {
  model: ConstructionModel
  view: View
  containerSize: { width: number; height: number }
}

export function ConstructionPlan({ model, view, containerSize }: ConstructionPlanProps): React.JSX.Element {
  const viewportRef = useRef<SVGViewportRef>(null)

  useEffect(() => viewportRef.current?.fitToContent(), [view])

  const axis = complementaryAxis(view.plane)
  const projection = project(view.plane, view.xDirection, view.yDirection, view.zOrder === 'min' ? 1 : -1)
  const rotationProjection = projectRotation(view.plane, view.xDirection, view.yDirection)
  const zOrder = createZOrder(axis, view.zOrder)
  const sortedElements = [...model.elements].sort()
  const contentBounds = bounds3Dto2D(model.bounds, projection)

  const polygonAreas = model.areas.filter(a => a.type === 'polygon' && a.plane === view.plane) as HighlightedPolygon[]
  const cuboidAreas = model.areas.filter(a => a.type === 'cuboid') as HighlightedCuboid[]

  // Helper function to project polygon points and create SVG path
  const createPolygonPath = (polygon: HighlightedPolygon): { pathData: string; center: [number, number] } => {
    // Project polygon points to 2D
    const projectedPoints = polygon.polygon.points.map(point => {
      // Convert 2D polygon point to 3D point on the specified plane for projection
      let point3D: Vec3
      switch (polygon.plane) {
        case 'xy':
          point3D = vec3.fromValues(point[0], point[1], 0)
          break
        case 'xz':
          point3D = vec3.fromValues(point[0], 0, point[1])
          break
        case 'yz':
          point3D = vec3.fromValues(0, point[0], point[1])
          break
        default:
          throw new Error(`Unsupported plane: ${polygon.plane}`)
      }
      const projected = projection(point3D)
      return [projected[0], projected[1]]
    })

    // Create SVG path string
    const pathData =
      projectedPoints.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ') + ' Z'

    // Calculate center for label positioning
    const centerX = projectedPoints.reduce((sum, p) => sum + p[0], 0) / projectedPoints.length
    const centerY = projectedPoints.reduce((sum, p) => sum + p[1], 0) / projectedPoints.length

    return { pathData, center: [centerX, centerY] }
  }

  return (
    <SVGViewport
      ref={viewportRef}
      contentBounds={contentBounds}
      padding={0.05} // 5% padding for wall construction
      className="w-full h-full"
      resetButtonPosition="top-right"
      svgSize={containerSize}
    >
      {/* Polygon Areas - Bottom */}
      {polygonAreas
        .filter(p => p.renderPosition === 'bottom')
        .map((area, index) => {
          const { pathData } = createPolygonPath(area)
          return (
            <path
              key={`polygon-bottom-${index}`}
              d={pathData}
              fill="none"
              stroke="#666666"
              strokeWidth="20"
              strokeDasharray="200,100"
              opacity={0.7}
            />
          )
        })}

      {/* Cuboid Areas - Bottom */}
      {cuboidAreas
        .filter(a => a.renderPosition === 'bottom')
        .map((area, index) => {
          const bounds2D = bounds3Dto2D(area.bounds, projection)
          const cx = (bounds2D.max[0] + bounds2D.min[0]) / 2
          const cy = (bounds2D.max[1] + bounds2D.min[1]) / 2

          return (
            <g
              key={`cuboid-bottom-${index}`}
              transform={createSvgTransform(area.transform, projection, rotationProjection)}
            >
              <rect
                x={bounds2D.min[0]}
                y={bounds2D.min[1]}
                width={bounds2D.max[0] - bounds2D.min[0]}
                height={bounds2D.max[1] - bounds2D.min[1]}
                fill="none"
                stroke="#666666"
                strokeWidth="20"
                strokeDasharray="200,100"
                opacity={0.7}
              />
              {area.label && (
                <text x={cx} y={cy} fontSize={100} textAnchor="middle" opacity={0.7} color="#666666">
                  {area.label}
                </text>
              )}
            </g>
          )
        })}

      {/* Construction elements */}
      {sortedElements.map(element =>
        'children' in element ? (
          <ConstructionGroupElement
            key={element.id}
            group={element}
            projection={projection}
            resolveMaterial={resolveDefaultMaterial}
            zOrder={zOrder}
            rotationProjection={rotationProjection}
          />
        ) : (
          <ConstructionElementShape
            key={element.id}
            projection={projection}
            rotationProjection={rotationProjection}
            element={element}
            resolveMaterial={resolveDefaultMaterial}
          />
        )
      )}

      {/* Warnings */}
      {model.warnings?.map((warning, index) => {
        if (warning.bounds) {
          const bounds2D = bounds3Dto2D(warning.bounds, projection)
          return (
            <rect
              key={`warning-${index}`}
              x={bounds2D.min[0]}
              y={bounds2D.min[1]}
              width={bounds2D.max[0] - bounds2D.min[0]}
              height={bounds2D.max[1] - bounds2D.min[1]}
              stroke={COLORS.ui.warning}
              strokeWidth={30}
              fill={`${COLORS.ui.warning}88`}
              strokeDasharray="100,100"
            />
          )
        }
        return null
      })}

      {/* Errors */}
      {model.errors?.map((error, index) => {
        if (error.bounds) {
          const bounds2D = bounds3Dto2D(error.bounds, projection)
          return (
            <rect
              key={`error-${index}`}
              x={bounds2D.min[0]}
              y={bounds2D.min[1]}
              width={bounds2D.max[0] - bounds2D.min[0]}
              height={bounds2D.max[1] - bounds2D.min[1]}
              stroke={COLORS.ui.danger}
              strokeWidth={50}
              fill={`${COLORS.ui.danger}AA`}
              strokeDasharray="100,100"
            />
          )
        }
        return null
      })}

      {/* Measurements */}
      {model.measurements?.map((measurement, index) => {
        const svgStartPoint = projection(measurement.startPoint)
        const svgEndPoint = projection(measurement.endPoint)

        const dir = direction(measurement.startPoint, measurement.endPoint)
        const svgDir = direction(svgStartPoint, svgEndPoint)

        const offsetSign = distance(add(dir, svgDir), [0, 0, 0]) === 0 ? -1 : 1

        return svgStartPoint[2] === svgEndPoint[2] ? (
          <SvgMeasurementIndicator
            key={`measurement-${index}`}
            startPoint={svgStartPoint}
            endPoint={svgEndPoint}
            label={measurement.label}
            offset={(measurement.offset ?? 0) * 60 * offsetSign}
            color={COLORS.indicators.main}
            fontSize={60}
            strokeWidth={10}
          />
        ) : (
          <></>
        )
      })}

      {/* Cuboid Areas - Top */}
      {cuboidAreas
        .filter(a => a.renderPosition === 'top')
        .map((area, index) => {
          const bounds2D = bounds3Dto2D(area.bounds, projection)
          const cx = (bounds2D.max[0] + bounds2D.min[0]) / 2
          const cy = (bounds2D.max[1] + bounds2D.min[1]) / 2

          return (
            <g
              key={`cuboid-top-${index}`}
              transform={createSvgTransform(area.transform, projection, rotationProjection)}
            >
              <rect
                x={bounds2D.min[0]}
                y={bounds2D.min[1]}
                width={bounds2D.max[0] - bounds2D.min[0]}
                height={bounds2D.max[1] - bounds2D.min[1]}
                fill="none"
                stroke="#666666"
                strokeWidth="20"
                strokeDasharray="200,100"
                opacity={0.7}
              />
              {area.label && (
                <text x={cx} y={cy} fontSize={100} textAnchor="middle" opacity={0.7} color="#666666">
                  {area.label}
                </text>
              )}
            </g>
          )
        })}

      {/* Polygon Areas - Top */}
      {polygonAreas
        .filter(p => p.renderPosition === 'top')
        .map((area, index) => {
          const { pathData } = createPolygonPath(area)
          return (
            <path
              key={`polygon-top-${index}`}
              d={pathData}
              fill="none"
              stroke="#666666"
              strokeWidth="20"
              strokeDasharray="200,100"
              opacity={0.7}
            />
          )
        })}
    </SVGViewport>
  )
}
