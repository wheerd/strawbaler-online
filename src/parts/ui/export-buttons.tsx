import { Download } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { usePartsStore } from '@/parts/store'
import type { AggregatedPartItem } from '@/parts/types'
import {
  buildAggregatedPartsCSV,
  buildRawPartsCSV,
  downloadCSV,
  getExportTimestamp,
  sanitizeFilename
} from '@/parts/utils/csvExport'
import { Button } from '@/shared/ui/components/button'

export function ExportRawPartsButton(): React.JSX.Element {
  const { t } = useTranslation('construction')

  const handleExport = useCallback(() => {
    const { definitions, occurrences, labels } = usePartsStore.getState()
    const csv = buildRawPartsCSV(definitions, occurrences, labels)
    const timestamp = getExportTimestamp()
    downloadCSV(csv, `parts-raw-${timestamp}.csv`)
  }, [])

  return (
    <Button variant="outline" size="icon-sm" onClick={handleExport} title={t($ => $.partsList.export.rawData)}>
      <Download />
    </Button>
  )
}

export function ExportAggregatedPartsButton({
  aggregatedParts
}: {
  aggregatedParts: AggregatedPartItem[]
}): React.JSX.Element {
  const { t } = useTranslation('construction')

  const handleExport = useCallback(() => {
    if (!aggregatedParts.length) return
    const csv = buildAggregatedPartsCSV(aggregatedParts)
    const timestamp = getExportTimestamp()
    downloadCSV(csv, `parts-${timestamp}.csv`)
  }, [aggregatedParts])

  return (
    <Button variant="outline" size="sm" onClick={handleExport} title={t($ => $.partsList.export.aggregatedData)}>
      <Download />
      <span>{t($ => $.partsList.export.aggregatedData)}</span>
    </Button>
  )
}

export function ExportMaterialPartsButton({
  parts,
  materialName
}: {
  parts: AggregatedPartItem[]
  materialName: string
}): React.JSX.Element {
  const { t } = useTranslation('construction')

  const handleExport = useCallback(() => {
    if (!parts.length) return
    const csv = buildAggregatedPartsCSV(parts)
    const timestamp = getExportTimestamp()
    const safeName = sanitizeFilename(materialName)
    downloadCSV(csv, `parts-${safeName}-${timestamp}.csv`)
  }, [parts, materialName])

  return (
    <Button variant="outline" size="icon-sm" onClick={handleExport} title={t($ => $.partsList.export.material)}>
      <Download />
    </Button>
  )
}
