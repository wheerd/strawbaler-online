import { Eye, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { DimensionalMaterial } from '@/materials/material'
import type { AggregatedPartItem } from '@/parts/types'
import { PartCutModal } from '@/parts/ui/PartCutModal'
import { calculateWeight, canHighlightPart, getIssueSeverity } from '@/parts/utils'
import { usePlanNavigation } from '@/plan/ui/hooks/usePlanNavigation'
import { Bounds2D, type Polygon2D } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'
import { Button } from '@/shared/ui/components/button'
import { Table } from '@/shared/ui/components/table'
import { Tooltip } from '@/shared/ui/components/tooltip'
import { SawIcon } from '@/shared/ui/icons'

const SPECIAL_CUT_PREVIEW_TARGET = 300
const SPECIAL_CUT_PREVIEW_PADDING = 6

function SpecialCutTooltip({ polygon }: { polygon: Polygon2D }): React.JSX.Element {
  const { t } = useTranslation('construction')
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
    <div className="flex flex-col gap-2">
      <span>{t($ => $.partsList.straw.specialCutNote)}</span>
      <span>{t($ => $.partsList.straw.rawLengthNote)}</span>
      <svg
        width={preview.svgWidth}
        height={preview.svgHeight}
        viewBox={`0 0 ${preview.svgWidth} ${preview.svgHeight}`}
        role="img"
        aria-label={t($ => $.partsList.actions.specialCutPreview)}
      >
        <rect
          x={SPECIAL_CUT_PREVIEW_PADDING}
          y={SPECIAL_CUT_PREVIEW_PADDING}
          width={preview.rectWidth}
          height={preview.rectHeight}
          fill="none"
          stroke="var(--color-gray-1000)"
          strokeDasharray="3 1"
          strokeWidth="1"
        />
        <polygon
          points={preview.pointsAttribute}
          stroke="var(--color-primary)"
          strokeWidth="2"
          fill="var(--color-primary)"
          fillOpacity="0.2"
          strokeLinejoin="miter"
        />
      </svg>
      <span>{t($ => $.partsList.straw.sawButtonHint)}</span>
    </div>
  )
}

export default function DimensionalPartsTable({
  parts,
  material
}: {
  parts: AggregatedPartItem[]
  material: DimensionalMaterial
}) {
  const { t } = useTranslation('construction')

  return (
    <Table.Root variant="surface" className="min-w-full">
      <Table.Header className="bg-muted">
        <Table.Row>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.label)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="10em">{t($ => $.partsList.tableHeaders.type)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>{t($ => $.partsList.tableHeaders.description)}</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-center">
            {t($ => $.partsList.tableHeaders.quantity)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="5em" className="text-end">
            {t($ => $.partsList.tableHeaders.length)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="8em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalLength)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalVolume)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="9em" className="text-end">
            {t($ => $.partsList.tableHeaders.totalWeight)}
          </Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.partsList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <DimensionalPartsTableRow key={part.partId} part={part} material={material} />
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function DimensionalPartsTableRow({ part, material }: { part: AggregatedPartItem; material: DimensionalMaterial }) {
  const { t } = useTranslation('construction')
  const { formatWeight, formatVolume, formatLengthInMeters } = useFormatters()
  const { viewPartInPlan } = usePlanNavigation()
  const description = useTranslatableString(part.description)

  const partWeight = calculateWeight(part.totalVolume, material)
  const severity = getIssueSeverity(part)

  return (
    <Table.Row key={part.partId} className={severity === 'error' ? 'bg-red-100 hover:bg-red-200' : undefined}>
      <Table.RowHeaderCell className="text-center">
        <span className="font-medium">{part.label}</span>
      </Table.RowHeaderCell>
      <Table.Cell>{part.type}</Table.Cell>
      <Table.Cell>
        <div className="flex items-center gap-2">
          <span>{description}</span>
          {part.sideFaces?.length && part.sideFaces[0].polygon.outer.points.length >= 3 && (
            <>
              <Tooltip key="special-cut" content={<SpecialCutTooltip polygon={part.sideFaces[0].polygon.outer} />}>
                <TriangleAlert aria-hidden className="text-orange-500" />
              </Tooltip>
              <PartCutModal
                trigger={
                  <Button size="icon" variant="outline" className="rounded-full">
                    <SawIcon />
                  </Button>
                }
                polygon={part.sideFaces[0].polygon}
              />
            </>
          )}
        </div>
      </Table.Cell>
      <Table.Cell className="text-center">{part.quantity}</Table.Cell>
      <Table.Cell className="text-end">
        <div className="flex items-center justify-end gap-2 text-end">
          {part.issue === 'LengthExceedsAvailable' && material.lengths.length > 0 && (
            <Tooltip
              key="length-exceeds-available"
              content={
                part.requiresSinglePiece
                  ? t($ => $.partsList.issues.lengthExceedsSingle)
                  : t($ => $.partsList.issues.lengthExceedsMultiple)
              }
            >
              <TriangleAlert className={part.requiresSinglePiece ? 'text-red-600' : 'text-orange-500'} />
            </Tooltip>
          )}
          <span>{part.length ? formatLengthInMeters(part.length) : '—'}</span>
        </div>
      </Table.Cell>
      <Table.Cell className="text-end">{part.totalLength ? formatLengthInMeters(part.totalLength) : '—'}</Table.Cell>
      <Table.Cell className="text-end">{formatVolume(part.totalVolume)}</Table.Cell>
      <Table.Cell className="text-end">{partWeight ? formatWeight(partWeight) : '—'}</Table.Cell>
      <Table.Cell className="text-center">
        {canHighlightPart(part.partId) && (
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => void viewPartInPlan(part.partId)}
            title={t($ => $.partsList.actions.viewInPlan)}
            className="-my-2"
          >
            <Eye />
          </Button>
        )}
      </Table.Cell>
    </Table.Row>
  )
}
