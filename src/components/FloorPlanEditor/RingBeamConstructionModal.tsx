import React, { useState, useMemo } from 'react'
import { Dialog, IconButton, Flex, Box, Text, Heading, Card } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'
import { usePerimeterById } from '@/model/store'
import { useConfigStore } from '@/config/store'
import { constructRingBeam, resolveDefaultMaterial, type RingBeamConstructionPlan } from '@/construction'
import { ConstructionElementShape } from './Shapes/ConstructionElementShape'
import type { PerimeterId } from '@/types/ids'
import { boundsFromPoints } from '@/types/geometry'
import { SVGViewport } from './components/SVGViewport'
import { SvgMeasurementIndicator } from './components/SvgMeasurementIndicator'
import { COLORS } from '@/theme/colors'

export interface RingBeamConstructionModalProps {
  perimeterId: PerimeterId
  position: 'base' | 'top'
  trigger: React.ReactNode
}

interface RingBeamConstructionPlanDisplayProps {
  plan: RingBeamConstructionPlan
  showIssues?: boolean
}

function RingBeamConstructionPlanDisplay({
  plan,
  showIssues = true
}: RingBeamConstructionPlanDisplayProps): React.JSX.Element {
  const perimeter = usePerimeterById(plan.perimeterId)

  const perimeterBounds = boundsFromPoints(perimeter?.corners.map(c => [c.outsidePoint[0], -c.outsidePoint[1]]) ?? [])!

  const padding = 100 // padding in SVG units
  const viewBoxWidth = perimeterBounds.max[0] - perimeterBounds.min[0] + padding * 2
  const viewBoxHeight = perimeterBounds.max[1] - perimeterBounds.min[1] + padding * 2
  const viewBoxX = perimeterBounds.min[0] - padding
  const viewBoxY = perimeterBounds.min[1] - padding

  return (
    <div className="w-full h-96 border border-gray-300 rounded bg-gray-50 flex items-center justify-center relative">
      <SVGViewport baseViewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full">
        {/* Render perimeter outline for reference */}
        {perimeter && (
          <g stroke="#ccc" strokeWidth="1" fill="none">
            {/* Outside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.outsidePoint[0]},${-c.outsidePoint[1]}`).join(' ')}
              stroke="#666"
              strokeWidth={5}
              fill="rgba(0,255,0,0.1)"
            />
            {/* Inside perimeter */}
            <polygon
              points={perimeter.corners.map(c => `${c.insidePoint[0]},${-c.insidePoint[1]}`).join(' ')}
              stroke="#999"
              strokeWidth={5}
              strokeDasharray="5,5"
              fill="rgba(0,0,255,0.1)"
            />
          </g>
        )}

        {/* Render ring beam segments */}
        {plan.segments.map((segment, segmentIndex) => {
          // Convert rotation from radians to degrees
          const baseRotationDeg = (segment.rotation[2] * 180) / Math.PI
          const rotationDeg = baseRotationDeg - 90

          return (
            <g key={`segment-${segmentIndex}`}>
              {/* Segment elements in transformed group */}
              <g transform={`translate(${segment.position[0]} ${-segment.position[1]}) rotate(${rotationDeg})`}>
                {segment.elements.map((element, elementIndex) => (
                  <ConstructionElementShape
                    key={`element-${elementIndex}`}
                    element={element}
                    resolveMaterial={resolveDefaultMaterial}
                    strokeWidth={5}
                  />
                ))}
              </g>

              {/* Render measurements for this segment in global coordinate space */}
              {segment.measurements.map((measurement, measurementIndex) => (
                <SvgMeasurementIndicator
                  key={`measurement-${segmentIndex}-${measurementIndex}`}
                  startPoint={[
                    measurement.startPoint[0],
                    -measurement.startPoint[1] // Y-flip for ring beam
                  ]}
                  endPoint={[
                    measurement.endPoint[0],
                    -measurement.endPoint[1] // Y-flip for ring beam
                  ]}
                  label={measurement.label}
                  offset={measurement.offset}
                  color={COLORS.indicators.main}
                  fontSize={60}
                  strokeWidth={12}
                />
              ))}
            </g>
          )
        })}
      </SVGViewport>

      {/* Issues display */}
      {showIssues && (plan.errors.length > 0 || plan.warnings.length > 0) && (
        <div className="absolute top-4 right-4 bg-white border border-gray-300 rounded-md p-3 shadow-lg max-w-xs">
          <h4 className="text-sm font-semibold mb-2">Issues</h4>
          {plan.errors.map((error, index) => (
            <div key={`error-${index}`} className="text-xs text-red-600 mb-1">
              ⚠ {error.description}
            </div>
          ))}
          {plan.warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="text-xs text-orange-600 mb-1">
              ⚠ {warning.description}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RingBeamConstructionModal({
  perimeterId,
  position,
  trigger
}: RingBeamConstructionModalProps): React.JSX.Element {
  const [currentPosition, setCurrentPosition] = useState<'base' | 'top'>(position)

  const perimeter = usePerimeterById(perimeterId)
  const getRingBeamMethodById = useConfigStore(state => state.getRingBeamConstructionMethodById)

  const constructionPlan = useMemo(() => {
    if (!perimeter) return null

    const methodId = currentPosition === 'base' ? perimeter.baseRingBeamMethodId : perimeter.topRingBeamMethodId

    if (!methodId) return null

    const method = getRingBeamMethodById(methodId)
    if (!method) return null

    try {
      return constructRingBeam(perimeter, method.config, resolveDefaultMaterial)
    } catch (error) {
      console.error('Failed to generate ring beam construction plan:', error)
      return null
    }
  }, [perimeter, currentPosition, getRingBeamMethodById])

  const currentMethod = useMemo(() => {
    if (!perimeter) return null

    const methodId = currentPosition === 'base' ? perimeter.baseRingBeamMethodId : perimeter.topRingBeamMethodId

    return methodId ? getRingBeamMethodById(methodId) : null
  }, [perimeter, currentPosition, getRingBeamMethodById])

  if (!perimeter) {
    return <>{trigger}</>
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger>{trigger}</Dialog.Trigger>
      <Dialog.Content>
        <Flex justify="between" align="center" mb="3">
          <Dialog.Title>Ring Beam Construction</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <Box style={{ height: '500px', overflow: 'hidden' }}>
          <Card variant="surface" style={{ height: '100%', padding: '8px' }}>
            {currentMethod ? (
              constructionPlan ? (
                <RingBeamConstructionPlanDisplay plan={constructionPlan} showIssues />
              ) : (
                <Flex align="center" justify="center" style={{ height: '100%' }}>
                  <Text align="center" color="gray">
                    <Text size="6">⚠</Text>
                    <br />
                    <Text size="2">Failed to generate construction plan</Text>
                  </Text>
                </Flex>
              )
            ) : (
              <Flex align="center" justify="center" style={{ height: '100%' }}>
                <Text align="center" color="gray">
                  <Text size="6">📋</Text>
                  <br />
                  <Text size="2">No {currentPosition} ring beam method selected</Text>
                </Text>
              </Flex>
            )}
          </Card>
        </Box>

        <Box pt="3" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Flex justify="between">
            {/* Method Info Panel */}
            <Box>
              {currentMethod && (
                <Card variant="surface" size="1">
                  <Heading size="2" mb="1">
                    {currentMethod.name}
                  </Heading>
                  <Flex direction="column" gap="1">
                    <Text size="1">Type: {currentMethod.config.type}</Text>
                    <Text size="1">Height: {currentMethod.config.height}mm</Text>
                    {currentMethod.config.type === 'full' && (
                      <Text size="1">Width: {currentMethod.config.width}mm</Text>
                    )}
                    {currentMethod.config.type === 'double' && (
                      <Text size="1">Thickness: {currentMethod.config.thickness}mm</Text>
                    )}
                  </Flex>
                </Card>
              )}
            </Box>

            {/* Position Toggle */}
            <Flex gap="1">
              <Box
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--gray-3)',
                  borderRadius: '6px',
                  padding: '4px'
                }}
              >
                <Box
                  onClick={() => setCurrentPosition('base')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'medium',
                    backgroundColor: currentPosition === 'base' ? 'var(--accent-9)' : 'white',
                    color: currentPosition === 'base' ? 'white' : 'var(--gray-12)'
                  }}
                >
                  Base Plate
                </Box>
                <Box
                  onClick={() => setCurrentPosition('top')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'medium',
                    backgroundColor: currentPosition === 'top' ? 'var(--accent-9)' : 'white',
                    color: currentPosition === 'top' ? 'white' : 'var(--gray-12)'
                  }}
                >
                  Top Plate
                </Box>
              </Box>
            </Flex>
          </Flex>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  )
}
