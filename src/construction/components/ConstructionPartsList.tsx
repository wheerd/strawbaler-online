import { ExclamationTriangleIcon, PinBottomIcon, PinTopIcon } from '@radix-ui/react-icons'
import { Badge, Card, Flex, Heading, IconButton, Table, Text, Tooltip } from '@radix-ui/themes'
import { vec3 } from 'gl-matrix'
import React, { useCallback, useMemo, useRef } from 'react'

import { getMaterialTypeIcon, getMaterialTypeName } from '@/construction/materials/components/MaterialSelect'
import type { DimensionalMaterial, Material, SheetMaterial, VolumeMaterial } from '@/construction/materials/material'
import { useMaterialsMap } from '@/construction/materials/store'
import type { MaterialPartItem, MaterialParts, MaterialPartsList } from '@/construction/parts'
import { Bounds2D, type Polygon2D, type Volume } from '@/shared/geometry'
import { formatArea, formatLength, formatLengthInMeters, formatVolume } from '@/shared/utils/formatting'

type BadgeColor = React.ComponentProps<typeof Badge>['color']

interface ConstructionPartsListProps {
  partsList: MaterialPartsList
}

interface RowMetrics {
  totalQuantity: number
  totalVolume: number
  totalLength?: number
  totalArea?: number
  totalWeight?: number
}

interface MaterialGroup {
  key: string
  label: string
  badgeLabel?: string
  badgeColor?: BadgeColor
  hasIssue: boolean
  issueMessage?: string
  parts: MaterialPartItem[]
  metrics: RowMetrics & { partCount: number }
}

const formatCrossSection = ([first, second]: [number, number]) =>
  `${formatLengthInMeters(first)} × ${formatLengthInMeters(second)}`

const formatDimensions = (size: vec3) =>
  `${formatLengthInMeters(size[0])} × ${formatLengthInMeters(size[1])} × ${formatLengthInMeters(size[2])}`

const formatWeight = (weight?: number) => {
  if (weight === undefined) return '—'
  if (weight > 1000) {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(weight / 1000)} t`
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(weight)} kg`
}

const calculateWeight = (volume: Volume, material: Material): number | undefined => {
  if (material.density == null) return undefined
  return (volume * material.density) / 1_000_000_000
}

const UNKNOWN_CROSS_SECTION_LABEL = 'Other cross sections'
const UNKNOWN_THICKNESS_LABEL = 'Other thicknesses'
const UNKNOWN_CROSS_SECTION_MESSAGE = 'Cross section does not match available options for this material'
const UNKNOWN_THICKNESS_MESSAGE = 'Thickness does not match available options for this material'

const createMaterialGroups = (material: Material, materialParts: MaterialParts): MaterialGroup[] => {
  const parts = Object.values(materialParts.parts)
  if (parts.length === 0) return []

  if (material.type === 'dimensional') {
    return groupDimensionalParts(parts, material)
  }

  if (material.type === 'sheet') {
    return groupSheetParts(parts, material)
  }

  return [
    createGroup({
      key: `${material.id}-all`,
      label: 'All parts',
      hasIssue: false,
      material,
      parts
    })
  ]
}

const groupDimensionalParts = (parts: MaterialPartItem[], material: DimensionalMaterial): MaterialGroup[] => {
  const groups = new Map<
    string,
    {
      label: string
      badgeLabel: string
      badgeColor: BadgeColor
      parts: MaterialPartItem[]
      sortValue: number
      hasIssue: boolean
      issueMessage?: string
    }
  >()

  for (const part of parts) {
    const displayCrossSection = part.crossSection
    const groupKey = displayCrossSection
      ? `dimensional:${displayCrossSection.smallerLength}x${displayCrossSection.biggerLength}`
      : 'dimensional:other'
    const key = `${material.id}|${groupKey}`
    const label = displayCrossSection
      ? formatCrossSection([displayCrossSection.smallerLength, displayCrossSection.biggerLength])
      : UNKNOWN_CROSS_SECTION_LABEL
    const sortValue = displayCrossSection
      ? displayCrossSection.smallerLength * displayCrossSection.biggerLength
      : Number.MAX_SAFE_INTEGER

    const isKnown = material.crossSections.some(
      cs =>
        cs.smallerLength === displayCrossSection?.smallerLength && cs.biggerLength === displayCrossSection?.biggerLength
    )
    const badgeColor: BadgeColor = displayCrossSection != null ? (isKnown ? 'green' : 'red') : 'gray'

    const entry = groups.get(key)
    if (entry) {
      entry.parts.push(part)
      continue
    }

    groups.set(key, {
      label,
      badgeLabel: label,
      parts: [part],
      sortValue,
      badgeColor,
      hasIssue: displayCrossSection !== undefined && !isKnown,
      issueMessage: isKnown ? undefined : UNKNOWN_CROSS_SECTION_MESSAGE
    })
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortValue - b[1].sortValue || a[0].localeCompare(b[0]))
    .map(([key, entry]) =>
      createGroup({
        key,
        label: entry.label,
        badgeLabel: entry.badgeLabel,
        badgeColor: entry.badgeColor,
        hasIssue: entry.hasIssue,
        issueMessage: entry.issueMessage,
        material,
        parts: entry.parts
      })
    )
}

const groupSheetParts = (parts: MaterialPartItem[], material: SheetMaterial): MaterialGroup[] => {
  const groups = new Map<
    string,
    {
      label: string
      badgeLabel: string
      badgeColor: BadgeColor
      parts: MaterialPartItem[]
      sortValue: number
      hasIssue: boolean
      issueMessage?: string
    }
  >()

  for (const part of parts) {
    const thickness = part.thickness
    const key = thickness != null ? `sheet:${thickness}` : 'sheet:other'
    const label = thickness != null ? formatLength(thickness) : UNKNOWN_THICKNESS_LABEL
    const sortValue = thickness ?? Number.MAX_SAFE_INTEGER
    const isKnown = thickness != null && material.thicknesses.includes(thickness)
    const badgeColor: BadgeColor = thickness != null ? (isKnown ? 'green' : 'red') : 'gray'

    const entry = groups.get(key)
    if (entry) {
      entry.parts.push(part)
      continue
    }

    groups.set(key, {
      label,
      badgeLabel: label,
      parts: [part],
      sortValue,
      badgeColor,
      hasIssue: thickness != null && !isKnown,
      issueMessage: isKnown ? undefined : UNKNOWN_THICKNESS_MESSAGE
    })
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortValue - b[1].sortValue || a[0].localeCompare(b[0]))
    .map(([key, entry]) =>
      createGroup({
        key,
        label: entry.label,
        badgeLabel: entry.badgeLabel,
        badgeColor: entry.badgeColor,
        hasIssue: entry.hasIssue,
        issueMessage: entry.issueMessage,
        material,
        parts: entry.parts
      })
    )
}

const createGroup = ({
  key,
  label,
  badgeLabel,
  badgeColor,
  hasIssue,
  issueMessage,
  material,
  parts
}: {
  key: string
  label: string
  badgeLabel?: string
  badgeColor?: BadgeColor
  hasIssue: boolean
  issueMessage?: string
  material: Material
  parts: MaterialPartItem[]
}): MaterialGroup => {
  return {
    key,
    label,
    badgeLabel,
    badgeColor,
    hasIssue,
    issueMessage,
    parts,
    metrics: computeGroupMetrics(parts, material)
  }
}

const computeGroupMetrics = (parts: MaterialPartItem[], material: Material): RowMetrics & { partCount: number } => {
  let totalQuantity = 0
  let totalVolume = 0
  let totalLength: number | undefined
  let totalArea: number | undefined

  for (const part of parts) {
    totalQuantity += part.quantity
    totalVolume += part.totalVolume

    if (part.totalLength !== undefined) {
      totalLength = (totalLength ?? 0) + part.totalLength
    }

    if (part.totalArea !== undefined) {
      totalArea = (totalArea ?? 0) + part.totalArea
    }
  }

  return {
    totalQuantity,
    totalVolume,
    totalLength,
    totalArea,
    totalWeight: calculateWeight(totalVolume, material),
    partCount: parts.length
  }
}

function MaterialTypeIndicator({ material, size = 18 }: { material: Material; size?: number }) {
  const Icon = getMaterialTypeIcon(material.type)
  if (!Icon) return null
  const iconSize = Math.max(size - 6, 8)
  return (
    <div
      title={getMaterialTypeName(material.type)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: material.color,
        borderRadius: '4px',
        border: '1px solid var(--gray-7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        margin: '0 auto'
      }}
      aria-hidden
    >
      <Icon
        width={String(iconSize)}
        height={String(iconSize)}
        style={{ color: 'white', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
      />
    </div>
  )
}

const SPECIAL_CUT_PREVIEW_TARGET = 300
const SPECIAL_CUT_PREVIEW_PADDING = 6

function SpecialCutTooltip({ polygon }: { polygon: Polygon2D }): React.JSX.Element {
  const preview = useMemo(() => {
    const bounds = Bounds2D.fromPoints(polygon.points)
    const width = Math.max(bounds.width, 1)
    const height = Math.max(bounds.height, 1)
    const scale = SPECIAL_CUT_PREVIEW_TARGET / Math.max(width, height)
    const scaledWidth = height * scale
    const scaledHeight = width * scale
    const svgWidth = scaledWidth + SPECIAL_CUT_PREVIEW_PADDING * 2
    const svgHeight = scaledHeight + SPECIAL_CUT_PREVIEW_PADDING * 2

    const pointsAttribute = polygon.points
      .map(point => {
        const x = (point[1] - bounds.min[1]) * scale + SPECIAL_CUT_PREVIEW_PADDING
        const y = svgHeight - ((point[0] - bounds.min[0]) * scale + SPECIAL_CUT_PREVIEW_PADDING)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')

    return {
      svgWidth,
      svgHeight,
      pointsAttribute,
      rectWidth: scaledWidth,
      rectHeight: scaledHeight
    }
  }, [polygon])

  return (
    <Flex direction="column" gap="2">
      <Text>This part requires a special cut</Text>
      <Text>The given length is the raw length</Text>
      <svg
        width={preview.svgWidth}
        height={preview.svgHeight}
        viewBox={`0 0 ${preview.svgWidth} ${preview.svgHeight}`}
        role="img"
        aria-label="Special cut polygon preview"
      >
        <rect
          x={SPECIAL_CUT_PREVIEW_PADDING}
          y={SPECIAL_CUT_PREVIEW_PADDING}
          width={preview.rectWidth}
          height={preview.rectHeight}
          fill="none"
          stroke="var(--gray-10)"
          strokeDasharray="3 1"
          strokeWidth="1"
        />
        <polygon
          points={preview.pointsAttribute}
          stroke="var(--accent-9)"
          strokeWidth="2"
          fill="var(--accent-9)"
          fillOpacity="0.2"
          strokeLinejoin="miter"
        />
      </svg>
    </Flex>
  )
}

function MaterialSummaryRow({
  material,
  metrics,
  onNavigate
}: {
  material: Material
  metrics: RowMetrics & { partCount: number }
  onNavigate: () => void
}) {
  return (
    <Table.Row>
      <Table.RowHeaderCell justify="center">
        <MaterialTypeIndicator material={material} />
      </Table.RowHeaderCell>
      <Table.RowHeaderCell>
        <Flex align="center" gap="2" justify="between">
          <Text weight="medium">{material.name}</Text>
          <IconButton title="Jump to details" size="1" variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </IconButton>
        </Flex>
      </Table.RowHeaderCell>
      <Table.Cell justify="center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell justify="center">{metrics.partCount}</Table.Cell>
      <Table.Cell justify="end">
        {metrics.totalLength !== undefined ? formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell justify="end">{metrics.totalArea !== undefined ? formatArea(metrics.totalArea) : '—'}</Table.Cell>
      <Table.Cell justify="end">{formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell justify="end">{formatWeight(metrics.totalWeight)}</Table.Cell>
    </Table.Row>
  )
}

function MaterialGroupSummaryRow({ group, onNavigate }: { group: MaterialGroup; onNavigate: () => void }) {
  const { metrics } = group
  return (
    <Table.Row>
      <Table.Cell width="6em" justify="center">
        <Text color="gray">↳</Text>
      </Table.Cell>
      <Table.Cell>
        <Flex align="center" gap="2" justify="between">
          <Badge color={group.badgeColor}>{group.badgeLabel}</Badge>
          <IconButton title="Jump to details" size="1" variant="ghost" onClick={onNavigate}>
            <PinBottomIcon />
          </IconButton>
        </Flex>
      </Table.Cell>
      <Table.Cell justify="center">{metrics.totalQuantity}</Table.Cell>
      <Table.Cell justify="center">{metrics.partCount}</Table.Cell>
      <Table.Cell justify="end">
        {metrics.totalLength !== undefined ? formatLengthInMeters(metrics.totalLength) : '—'}
      </Table.Cell>
      <Table.Cell justify="end">{metrics.totalArea !== undefined ? formatArea(metrics.totalArea) : '—'}</Table.Cell>
      <Table.Cell justify="end">{formatVolume(metrics.totalVolume)}</Table.Cell>
      <Table.Cell justify="end">{formatWeight(metrics.totalWeight)}</Table.Cell>
    </Table.Row>
  )
}

interface MaterialGroupCardProps {
  material: Material
  group: MaterialGroup
  onBackToTop: () => void
}

function MaterialGroupCard({ material, group, onBackToTop }: MaterialGroupCardProps) {
  return (
    <Card variant="surface" size="2">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between" gap="3">
          <Flex align="center" gap="3">
            <MaterialTypeIndicator material={material} size={24} />
            <Heading size="4">{material.name}</Heading>
            <Flex align="center" gap="2">
              <Badge variant="soft" color={group.badgeColor}>
                {group.badgeLabel}
              </Badge>
              {group.hasIssue && (
                <Tooltip content={group.issueMessage ?? 'This group does not match the defined material options'}>
                  <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                </Tooltip>
              )}
            </Flex>
          </Flex>
          <IconButton title="Back to summary" size="1" variant="ghost" onClick={onBackToTop}>
            <PinTopIcon />
          </IconButton>
        </Flex>

        {material.type === 'dimensional' && <DimensionalPartsTable parts={group.parts} material={material} />}
        {material.type === 'sheet' && <SheetPartsTable parts={group.parts} material={material} />}
        {material.type === 'volume' && <VolumePartsTable parts={group.parts} material={material} />}
        {(material.type === 'generic' || material.type === 'strawbale') && (
          <GenericPartsTable parts={group.parts} />
        )}
      </Flex>
    </Card>
  )
}

function DimensionalPartsTable({ parts, material }: { parts: MaterialPartItem[]; material: DimensionalMaterial }) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Length
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Length
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>
                <Flex align="center" gap="2">
                  <Text>{part.description}</Text>
                  {part.polygon && part.polygon.points.length >= 3 && (
                    <Tooltip key="special-cut" content={<SpecialCutTooltip polygon={part.polygon} />}>
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--amber-9)' }} />
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  <Text>{part.length !== undefined ? formatLengthInMeters(part.length) : '—'}</Text>
                  {part.issue === 'LengthExceedsAvailable' && material.lengths.length > 0 && (
                    <Tooltip
                      key="length-exceeds-available"
                      content={`Part length ${
                        part.length !== undefined ? formatLengthInMeters(part.length) : 'Unknown'
                      } exceeds material maximum available length ${formatLengthInMeters(Math.max(...material.lengths))}`}
                    >
                      <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell justify="end">
                {part.totalLength !== undefined ? formatLengthInMeters(part.totalLength) : '—'}
              </Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function SheetPartsTable({ parts, material }: { parts: MaterialPartItem[]; material: SheetMaterial }) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="20em" justify="end">
            Dimensions
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell justify="end">
                <Flex align="center" gap="2" justify="end">
                  {part.issue === 'ThicknessMismatch' && (
                    <Tooltip
                      key="thickness-missmatch"
                      content={`Dimensions ${formatDimensions(part.size)} do not match available thicknesses (${material.thicknesses
                        .map(value => formatLengthInMeters(value))
                        .join(', ')})`}
                    >
                      <ExclamationTriangleIcon style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.issue === 'SheetSizeExceeded' && (
                    <Tooltip
                      key="sheet-size-exceeded"
                      content={`Dimensions ${formatDimensions(part.size)} exceed available sheet sizes (${material.sizes
                        .map(size => formatCrossSection([size.smallerLength, size.biggerLength]))
                        .join(', ')})`}
                    >
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--red-9)' }} />
                    </Tooltip>
                  )}
                  {part.polygon && part.polygon.points.length >= 3 && (
                    <Tooltip key="special-cut" content="This might have a non-regular shape">
                      <ExclamationTriangleIcon aria-hidden style={{ color: 'var(--amber-9)' }} />
                    </Tooltip>
                  )}
                  <Text>{vec3.equals(part.size, [0, 0, 0]) ? '' : formatDimensions(part.size)}</Text>
                </Flex>
              </Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end"> {part.area !== undefined ? formatArea(part.area) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function VolumePartsTable({ parts, material }: { parts: MaterialPartItem[]; material: VolumeMaterial }) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="end">
            Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" justify="end">
            Total Area
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Volume
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" justify="end">
            Total Weight
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => {
          const partWeight = calculateWeight(part.totalVolume, material)
          return (
            <Table.Row key={part.partId} style={{ background: part.issue ? 'var(--red-3)' : undefined }}>
              <Table.RowHeaderCell justify="center">
                <Text weight="medium">{part.label}</Text>
              </Table.RowHeaderCell>
              <Table.Cell>{part.type}</Table.Cell>
              <Table.Cell>{part.description}</Table.Cell>
              <Table.Cell justify="center">{part.quantity}</Table.Cell>
              <Table.Cell justify="end"> {part.area !== undefined ? formatArea(part.area) : '—'}</Table.Cell>
              <Table.Cell justify="end">{part.totalArea !== undefined ? formatArea(part.totalArea) : '—'}</Table.Cell>
              <Table.Cell justify="end">{formatVolume(part.totalVolume)}</Table.Cell>
              <Table.Cell justify="end">{formatWeight(partWeight)}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}

function GenericPartsTable({ parts }: { parts: MaterialPartItem[] }) {
  return (
    <Table.Root variant="surface" size="2" className="min-w-full">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Label
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">Type</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" justify="center">
            Quantity
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <Table.Row key={part.partId}>
            <Table.RowHeaderCell justify="center">
              <Text weight="medium">{part.label}</Text>
            </Table.RowHeaderCell>
            <Table.Cell>{part.type}</Table.Cell>
            <Table.Cell>{part.description}</Table.Cell>
            <Table.Cell justify="center">{part.quantity}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export function ConstructionPartsList({ partsList }: ConstructionPartsListProps): React.JSX.Element {
  const materialsMap = useMaterialsMap()
  const topRef = useRef<HTMLDivElement | null>(null)
  const detailRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const setDetailRef = useCallback((groupKey: string) => {
    return (element: HTMLDivElement | null) => {
      detailRefs.current[groupKey] = element
    }
  }, [])

  const scrollToGroup = useCallback((groupKey?: string) => {
    if (!groupKey) return
    const target = detailRefs.current[groupKey]
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const scrollToTop = useCallback(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const materialIds = useMemo(() => Object.keys(partsList) as Material['id'][], [partsList])

  if (materialIds.length === 0) {
    return (
      <Card variant="ghost" size="2">
        <Text size="2" color="gray">
          No parts available.
        </Text>
      </Card>
    )
  }

  const summaryRows = materialIds
    .map(materialId => {
      const materialParts = partsList[materialId]
      const material = materialsMap[materialId]
      if (!material) return null
      const totalWeight = calculateWeight(materialParts.totalVolume, material)
      const parts = Object.values(materialParts.parts)
      const metrics: RowMetrics & { partCount: number } = {
        totalQuantity: materialParts.totalQuantity,
        totalVolume: materialParts.totalVolume,
        totalLength: materialParts.totalLength,
        totalArea: materialParts.totalArea,
        totalWeight,
        partCount: parts.length
      }
      const groups = createMaterialGroups(material, materialParts)
      return { material, metrics, groups }
    })
    .filter(
      (row): row is { material: Material; metrics: RowMetrics & { partCount: number }; groups: MaterialGroup[] } =>
        row !== null
    )

  return (
    <Flex direction="column" gap="4">
      <Card ref={topRef} variant="surface" size="2">
        <Flex direction="column" gap="3">
          <Heading size="4">Summary</Heading>
          <Table.Root variant="surface" size="2" className="min-w-full">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell width="4em" justify="center">
                  Type
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Material</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="center">
                  Total Quantity
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="center">
                  Different Parts
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Length
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Area
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Volume
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell width="10em" justify="end">
                  Total Weight
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {summaryRows.map(row => (
                <React.Fragment key={row.material.id}>
                  <MaterialSummaryRow
                    material={row.material}
                    metrics={row.metrics}
                    onNavigate={() => scrollToGroup(row.groups[0]?.key)}
                  />
                  {row.groups.length > 1 &&
                    row.groups.map(group => (
                      <MaterialGroupSummaryRow
                        key={group.key}
                        group={group}
                        onNavigate={() => scrollToGroup(group.key)}
                      />
                    ))}
                </React.Fragment>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Card>

      <Flex direction="column" gap="4">
        {materialIds.map(materialId => {
          const material = materialsMap[materialId]
          const materialParts = partsList[materialId]
          if (!material || !materialParts) return null
          const groups = createMaterialGroups(material, materialParts)
          if (groups.length === 0) return null
          return (
            <Flex key={materialId} direction="column" gap="4">
              {groups.map(group => (
                <div key={group.key} ref={setDetailRef(group.key)}>
                  <MaterialGroupCard material={material} group={group} onBackToTop={scrollToTop} />
                </div>
              ))}
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}
