import { Button, Dialog, Flex, Grid, Heading, SegmentedControl, Text } from '@radix-ui/themes'
import type { vec2 } from 'gl-matrix'
import { useCallback, useEffect, useState } from 'react'

import type { WallAssemblyId } from '@/building/model/ids'
import type { PerimeterReferenceSide } from '@/building/model/model'
import { RingBeamAssemblySelectWithEdit } from '@/construction/config/components/RingBeamAssemblySelectWithEdit'
import { WallAssemblySelectWithEdit } from '@/construction/config/components/WallAssemblySelectWithEdit'
import { useConfigActions } from '@/construction/config/store'
import { MeasurementInfo } from '@/editor/components/MeasurementInfo'
import { BaseModal } from '@/shared/components/BaseModal'
import { LengthField } from '@/shared/components/LengthField'
import { offsetPolygon } from '@/shared/geometry'
import '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatting'

import { RectangularPreset } from './RectangularPreset'
import type { RectangularPresetConfig } from './types'

interface RectangularPresetDialogProps {
  onConfirm: (config: RectangularPresetConfig) => void
  initialConfig?: Partial<RectangularPresetConfig>
  trigger: React.ReactNode
}

/**
 * Preview component showing nested rectangles to visualize thickness
 * Shows inside dimensions (interior space) vs outside perimeter
 */
function RectangularPreview({ config }: { config: RectangularPresetConfig }) {
  const preset = new RectangularPreset()
  const referencePolygon = { points: preset.getPolygonPoints(config) }

  let derivedPolygon = referencePolygon
  try {
    const offset = offsetPolygon(referencePolygon, config.referenceSide === 'inside' ? config.thickness : -config.thickness)
    if (offset.points.length > 0) {
      derivedPolygon = offset
    }
  } catch (error) {
    console.warn('Failed to compute rectangular preset preview offset:', error)
  }

  const interiorPolygon = config.referenceSide === 'inside' ? referencePolygon : derivedPolygon
  const exteriorPolygon = config.referenceSide === 'inside' ? derivedPolygon : referencePolygon

  const interiorWidth =
    Math.max(...interiorPolygon.points.map(point => point[0])) -
    Math.min(...interiorPolygon.points.map(point => point[0]))
  const interiorLength =
    Math.max(...interiorPolygon.points.map(point => point[1])) -
    Math.min(...interiorPolygon.points.map(point => point[1]))

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  exteriorPolygon.points.forEach(point => {
    minX = Math.min(minX, point[0])
    minY = Math.min(minY, point[1])
    maxX = Math.max(maxX, point[0])
    maxY = Math.max(maxY, point[1])
  })

  const width = maxX - minX
  const height = maxY - minY
  const maxDimension = Math.max(width, height)
  const scale = maxDimension > 0 ? 200 / maxDimension : 1
  const centerX = 100
  const centerY = 100

  const transformPoint = (point: vec2) => ({
    x: (point[0] - (minX + maxX) / 2) * scale + centerX,
    y: -(point[1] - (minY + maxY) / 2) * scale + centerY
  })

  const exteriorPath =
    exteriorPolygon.points
      .map(transformPoint)
      .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '') + 'Z'

  const interiorPath =
    interiorPolygon.points
      .map(transformPoint)
      .reduce((path, point, index) => `${path}${index === 0 ? 'M' : 'L'} ${point.x} ${point.y} `, '') + 'Z'

  return (
    <Flex direction="column" align="center">
      <svg width={200} height={200} viewBox="0 0 200 200" className="overflow-visible">
        <path d={exteriorPath} fill="var(--gray-3)" stroke="var(--gray-8)" strokeWidth="1" strokeDasharray="3,3" />
        <path d={interiorPath} fill="var(--accent-3)" stroke="var(--accent-8)" strokeWidth="2" />

        <text
          fill="var(--gray-12)"
          className="font-mono"
          x={100}
          y={30}
          textAnchor="middle"
          fontSize={12}
          style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
        >
          {formatLength(interiorWidth)}
        </text>
        <text
          fill="var(--gray-12)"
          className="font-mono"
          x={30}
          y={100}
          textAnchor="middle"
          fontSize={12}
          transform="rotate(-90 30 100)"
          style={{ filter: 'drop-shadow(1px 1px 2px var(--gray-1))' }}
        >
          {formatLength(interiorLength)}
        </text>
      </svg>
    </Flex>
  )
}

export function RectangularPresetDialog({
  onConfirm,
  initialConfig,
  trigger
}: RectangularPresetDialogProps): React.JSX.Element {
  const configStore = useConfigActions()

  // Form state with defaults from config store
  const [config, setConfig] = useState<RectangularPresetConfig>(() => ({
    width: 10000, // 10m default inside width
    length: 7000, // 7m default inside length
    thickness: 420, // 44cm default
    wallAssemblyId: configStore.getDefaultWallAssemblyId(),
    baseRingBeamAssemblyId: configStore.getDefaultBaseRingBeamAssemblyId(),
    topRingBeamAssemblyId: configStore.getDefaultTopRingBeamAssemblyId(),
    referenceSide: 'inside',
    ...initialConfig
  }))

  // Update config when initial config changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(prev => ({ ...prev, ...initialConfig }))
    }
  }, [initialConfig])

  const effectiveInteriorWidth =
    config.referenceSide === 'inside' ? config.width : config.width - 2 * config.thickness
  const effectiveInteriorLength =
    config.referenceSide === 'inside' ? config.length : config.length - 2 * config.thickness

  const isValid =
    effectiveInteriorWidth > 0 &&
    effectiveInteriorLength > 0 &&
    config.thickness > 0 &&
    (config.wallAssemblyId?.length ?? 0) > 0

  const handleConfirm = useCallback(() => {
    if (isValid) {
      onConfirm(config)
    }
  }, [config, isValid, onConfirm])

  return (
    <BaseModal title="Rectangular Perimeter" trigger={trigger} size="3" maxWidth="600px">
      <Flex direction="column" gap="4">
        <Grid columns="2" gap="4">
          {/* Left Column - Properties in 2x3 Grid */}
          <Flex direction="column" gap="3">
            <Heading size="2" weight="medium">
              Configuration
            </Heading>

            <Grid columns="2" gap="3">
              {/* Width */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Width
                </Text>
                <LengthField
                  value={config.width}
                  onChange={value => setConfig(prev => ({ ...prev, width: value }))}
                  min={2000}
                  max={20000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Length */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Length
                </Text>
                <LengthField
                  value={config.length}
                  onChange={value => setConfig(prev => ({ ...prev, length: value }))}
                  min={2000}
                  max={20000}
                  step={100}
                  unit="m"
                  precision={3}
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Wall Thickness */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Thickness
                  </Text>
                  <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
                </Flex>
                <LengthField
                  value={config.thickness}
                  onChange={value => setConfig(prev => ({ ...prev, thickness: value }))}
                  min={50}
                  max={1500}
                  step={10}
                  unit="cm"
                  size="1"
                  style={{ width: '100%' }}
                />
              </Flex>

              {/* Reference Side */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Reference Side
                </Text>
                <SegmentedControl.Root
                  size="1"
                  value={config.referenceSide}
                  onValueChange={value =>
                    setConfig(prev => ({ ...prev, referenceSide: value as PerimeterReferenceSide }))
                  }
                >
                  <SegmentedControl.Item value="inside">Inside</SegmentedControl.Item>
                  <SegmentedControl.Item value="outside">Outside</SegmentedControl.Item>
                </SegmentedControl.Root>
              </Flex>

              {/* Wall Assembly */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Wall Assembly
                  </Text>
                  {config.wallAssemblyId && <MeasurementInfo highlightedAssembly="wallAssembly" />}
                </Flex>
                <WallAssemblySelectWithEdit
                  value={config.wallAssemblyId ?? undefined}
                  onValueChange={(value: WallAssemblyId) => {
                    setConfig(prev => ({ ...prev, wallAssemblyId: value }))
                  }}
                  placeholder="Select assembly"
                  size="1"
                />
              </Flex>

              {/* Base Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Base Plate
                  </Text>
                  <MeasurementInfo highlightedPart="basePlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.baseRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, baseRingBeamAssemblyId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>

              {/* Top Plate */}
              <Flex direction="column" gap="1">
                <Flex align="center" gap="1">
                  <Text size="1" color="gray">
                    Top Plate
                  </Text>
                  <MeasurementInfo highlightedPart="topPlate" />
                </Flex>
                <RingBeamAssemblySelectWithEdit
                  value={config.topRingBeamAssemblyId}
                  onValueChange={value => {
                    setConfig(prev => ({ ...prev, topRingBeamAssemblyId: value }))
                  }}
                  placeholder="None"
                  size="1"
                  allowNone
                />
              </Flex>
            </Grid>
          </Flex>

          {/* Right Column - Preview */}
          <Flex direction="column" gap="2">
            <Heading align="center" size="2" weight="medium">
              Preview
            </Heading>
            <RectangularPreview config={config} />
          </Flex>
        </Grid>

        {/* Actions */}
        <Flex justify="end" gap="3" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={handleConfirm} disabled={!isValid}>
              Confirm
            </Button>
          </Dialog.Close>
        </Flex>
      </Flex>
    </BaseModal>
  )
}
