import React, { useState, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ExclamationTriangleIcon, CrossCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons'
import {
  resolveDefaultMaterial,
  type WallConstructionPlan,
  type ConstructionIssue,
  type ConstructionElementId
} from '@/construction'
import { boundsFromPoints, createVec2, type Bounds2D, type Vec2 } from '@/types/geometry'
import { COLORS } from '@/theme/colors'
import { SvgMeasurementIndicator } from './components/SvgMeasurementIndicator'
import { convertConstructionToSvg, convertPointToSvg, type ViewType } from '@/utils/constructionCoordinates'

interface WallConstructionPlanDisplayProps {
  plan: WallConstructionPlan
  view?: ViewType
  showIssues?: boolean
}

interface IssueHighlight {
  bounds: Bounds2D
  type: 'error' | 'warning'
  description: string
  elementIds: ConstructionElementId[]
}

const calculateIssueBounds = (
  issueElementIds: ConstructionElementId[],
  elements: any[],
  wallHeight: number,
  wallLength: number,
  view: ViewType
): Bounds2D | null => {
  // Find affected elements
  const affectedElements = elements.filter(el => issueElementIds.includes(el.id))

  if (affectedElements.length === 0) return null

  // Convert all element corners to SVG coordinate Vec2 points
  const allPoints: Vec2[] = []

  for (const element of affectedElements) {
    const { position, size } = convertConstructionToSvg(element.position, element.size, wallHeight, wallLength, view)

    // Add all 4 corners of the rectangle
    allPoints.push(
      createVec2(position.x, position.y), // top-left
      createVec2(position.x + size.x, position.y), // top-right
      createVec2(position.x, position.y + size.y), // bottom-left
      createVec2(position.x + size.x, position.y + size.y) // bottom-right
    )
  }

  // Use existing utility to create bounding box
  const bounds = boundsFromPoints(allPoints)

  // Add padding around the bounding box for visual clarity
  if (bounds) {
    const padding = 10 // pixels
    return {
      min: createVec2(bounds.min[0] - padding, bounds.min[1] - padding),
      max: createVec2(bounds.max[0] + padding, bounds.max[1] + padding)
    }
  }

  return null
}

const getIssueColors = (type: 'error' | 'warning') => {
  if (type === 'error') {
    return {
      stroke: COLORS.ui.danger,
      fill: `${COLORS.ui.danger}AA`,
      strokeWidth: 50,
      dashArray: '100,100'
    }
  } else {
    return {
      stroke: COLORS.ui.warning,
      fill: `${COLORS.ui.warning}88`,
      strokeWidth: 30,
      dashArray: '100,100'
    }
  }
}

const renderIssueBounds = (bounds: Bounds2D, issueType: 'error' | 'warning', index: number) => {
  const width = bounds.max[0] - bounds.min[0]
  const height = bounds.max[1] - bounds.min[1]
  const colors = getIssueColors(issueType)

  return (
    <rect
      key={`${issueType}-${index}`}
      x={bounds.min[0]}
      y={bounds.min[1]}
      width={width}
      height={height}
      stroke={colors.stroke}
      strokeWidth={colors.strokeWidth}
      fill={colors.fill}
      strokeDasharray={colors.dashArray}
    />
  )
}

export function WallConstructionPlanDisplay({
  plan,
  view = 'outside',
  showIssues = true
}: WallConstructionPlanDisplayProps): React.JSX.Element {
  const { length: wallLength, height: wallHeight } = plan.wallDimensions
  const elements = plan.segments.flatMap(s => s.elements)

  // Sort elements by depth (y-axis in construction coordinates) for proper z-ordering
  const sortedElements = elements.sort((a, b) => {
    // For outside view: elements with smaller y (closer to inside) render first (behind)
    // For inside view: elements with larger y (closer to outside) render first (behind)
    return view === 'outside' ? a.position[1] - b.position[1] : b.position[1] - a.position[1]
  })

  // Calculate issue highlights using Bounds2D
  const issueHighlights: IssueHighlight[] = useMemo(() => {
    if (!showIssues) return []

    const highlights: IssueHighlight[] = []

    // Process warnings
    plan.warnings.forEach(warning => {
      const bounds = calculateIssueBounds(warning.elements, elements, wallHeight, wallLength, view)
      if (bounds) {
        highlights.push({
          bounds,
          type: 'warning',
          description: warning.description,
          elementIds: warning.elements
        })
      }
    })

    // Process errors
    plan.errors.forEach(error => {
      const bounds = calculateIssueBounds(error.elements, elements, wallHeight, wallLength, view)
      if (bounds) {
        highlights.push({
          bounds,
          type: 'error',
          description: error.description,
          elementIds: error.elements
        })
      }
    })

    return highlights
  }, [plan.errors, plan.warnings, elements, wallHeight, wallLength, view, showIssues])

  // Calculate expanded viewBox to include issue highlights and measurements with padding
  const expandedViewBox = useMemo(() => {
    let minX = 0
    let minY = 0
    let maxX = wallLength as number
    let maxY = wallHeight as number

    // Include issue highlights if enabled
    if (showIssues && issueHighlights.length > 0) {
      issueHighlights.forEach(highlight => {
        minX = Math.min(minX, highlight.bounds.min[0])
        minY = Math.min(minY, highlight.bounds.min[1])
        maxX = Math.max(maxX, highlight.bounds.max[0])
        maxY = Math.max(maxY, highlight.bounds.max[1])
      })
    }

    // Include measurements bounds
    if (plan.measurements && plan.measurements.length > 0) {
      plan.measurements.forEach(measurement => {
        const svgStart = convertPointToSvg(
          measurement.startPoint[0],
          measurement.startPoint[1],
          wallHeight,
          wallLength,
          view
        )
        const svgEnd = convertPointToSvg(measurement.endPoint[0], measurement.endPoint[1], wallHeight, wallLength, view)

        // Account for offset and text/marker space
        const offset = measurement.offset || 0
        const extraSpace = 60 // Space for text and markers

        const startWithOffset = [svgStart[0], svgStart[1] + offset]
        const endWithOffset = [svgEnd[0], svgEnd[1] + offset]

        minX = Math.min(minX, startWithOffset[0] - extraSpace, endWithOffset[0] - extraSpace)
        minY = Math.min(minY, startWithOffset[1] - extraSpace, endWithOffset[1] - extraSpace)
        maxX = Math.max(maxX, startWithOffset[0] + extraSpace, endWithOffset[0] + extraSpace)
        maxY = Math.max(maxY, startWithOffset[1] + extraSpace, endWithOffset[1] + extraSpace)
      })
    }

    // Add padding
    const padding = 20
    minX -= padding
    minY -= padding
    maxX += padding
    maxY += padding

    const width = maxX - minX
    const height = maxY - minY

    return `${minX} ${minY} ${width} ${height}`
  }, [wallLength, wallHeight, showIssues, issueHighlights, plan.measurements, view])

  return (
    <svg
      viewBox={expandedViewBox}
      className="w-full h-full"
      style={{ minHeight: '200px' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Construction elements */}
      {sortedElements.map(element => {
        const { position, size } = convertConstructionToSvg(
          element.position,
          element.size,
          wallHeight,
          wallLength,
          view
        )

        return (
          <rect
            key={element.id}
            x={position.x}
            y={position.y}
            width={size.x}
            height={size.y}
            fill={resolveDefaultMaterial(element.material)?.color}
            stroke="#000000"
            strokeWidth="5"
          />
        )
      })}

      {/* Issue highlights using Bounds2D */}
      {showIssues &&
        issueHighlights.map((highlight, index) => renderIssueBounds(highlight.bounds, highlight.type, index))}

      {/* Measurements */}
      {plan.measurements?.map((measurement, index) => (
        <SvgMeasurementIndicator
          key={`${measurement.type}-${index}`}
          startPoint={measurement.startPoint}
          endPoint={measurement.endPoint}
          label={measurement.label}
          offset={measurement.offset}
          wallHeight={wallHeight}
          wallLength={wallLength}
          view={view}
          color={COLORS.indicators.main}
          fontSize={60}
          strokeWidth={10}
        />
      ))}
    </svg>
  )
}

interface IssueDescriptionPanelProps {
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
}

const IssueDescriptionPanel = ({ errors, warnings }: IssueDescriptionPanelProps) => (
  <div className="bg-white border-t border-gray-200 max-h-40 overflow-y-auto">
    {errors.length > 0 && (
      <div className="p-3 border-b border-red-100 bg-red-50">
        <h4 className="text-red-800 font-medium flex items-center gap-2">
          <CrossCircledIcon className="w-4 h-4" />
          Errors ({errors.length})
        </h4>
        {errors.map((error, index) => (
          <div key={index} className="text-sm text-red-700 mt-1 flex items-start gap-2">
            <span className="text-red-400 mt-0.5">•</span>
            <span>{error.description}</span>
          </div>
        ))}
      </div>
    )}

    {warnings.length > 0 && (
      <div className="p-3 bg-yellow-50">
        <h4 className="text-yellow-800 font-medium flex items-center gap-2">
          <ExclamationTriangleIcon className="w-4 h-4" />
          Warnings ({warnings.length})
        </h4>
        {warnings.map((warning, index) => (
          <div key={index} className="text-sm text-yellow-700 mt-1 flex items-start gap-2">
            <span className="text-yellow-400 mt-0.5">•</span>
            <span>{warning.description}</span>
          </div>
        ))}
      </div>
    )}

    {errors.length === 0 && warnings.length === 0 && (
      <div className="p-3 bg-green-50">
        <h4 className="text-green-800 font-medium flex items-center gap-2">
          <CheckCircledIcon className="w-4 h-4" />
          No Issues Found
        </h4>
        <div className="text-sm text-green-700 mt-1">Construction plan is valid with no errors or warnings.</div>
      </div>
    )}
  </div>
)

interface WallConstructionPlanModalProps {
  plan: WallConstructionPlan
  children: React.ReactNode
}

export function WallConstructionPlanModal({ plan, children }: WallConstructionPlanModalProps): React.JSX.Element {
  const [view, setView] = useState<ViewType>('outside')

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-[90vw] h-[80vh] max-w-6xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Wall Construction Plan</Dialog.Title>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">View:</label>
                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    onClick={() => setView('outside')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      view === 'outside' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Outside
                  </button>
                  <button
                    onClick={() => setView('inside')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      view === 'inside' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Inside
                  </button>
                </div>
              </div>

              <Dialog.Close asChild>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-hidden">
              <div className="w-full h-full bg-gray-50 rounded-lg border border-gray-200 p-2 overflow-hidden">
                <WallConstructionPlanDisplay plan={plan} view={view} showIssues />
              </div>
            </div>
            <div className="flex-shrink-0">
              <IssueDescriptionPanel errors={plan.errors} warnings={plan.warnings} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
