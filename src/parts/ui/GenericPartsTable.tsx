import { Eye } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { AggregatedPartItem } from '@/parts/types'
import { usePartsListView } from '@/parts/ui/PartsListViewContext'
import { canHighlightPart } from '@/parts/utils'
import { usePlanNavigation } from '@/plan/ui/hooks/usePlanNavigation'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'
import { Button } from '@/shared/ui/components/button'
import { Table } from '@/shared/ui/components/table'

export default function GenericPartsTable({ parts }: { parts: AggregatedPartItem[] }) {
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
          <Table.ColumnHeaderCell width="3em" className="text-center">
            {t($ => $.partsList.tableHeaders.view)}
          </Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {parts.map(part => (
          <GenericPartsTableRow key={part.partId} part={part} />
        ))}
      </Table.Body>
    </Table.Root>
  )
}

function GenericPartsTableRow({ part }: { part: AggregatedPartItem }) {
  const { t } = useTranslation('construction')
  const { focusId } = usePartsListView()
  const { viewPartInPlan } = usePlanNavigation()
  const description = useTranslatableString(part.description)

  return (
    <Table.Row>
      <Table.RowHeaderCell className="text-center">
        <span className="font-medium">{part.label}</span>
      </Table.RowHeaderCell>
      <Table.Cell>{part.type}</Table.Cell>
      <Table.Cell>{description}</Table.Cell>
      <Table.Cell className="text-center">{part.quantity}</Table.Cell>
      <Table.Cell className="text-center">
        {canHighlightPart(part.partId) && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => void viewPartInPlan(part.partId, focusId)}
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
