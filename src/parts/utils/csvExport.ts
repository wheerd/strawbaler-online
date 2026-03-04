import { t } from 'i18next'

import { getModelActions } from '@/building/store'
import { getStoreyName } from '@/building/ui/useStoreyName'
import { getMaterialById } from '@/materials/store'
import { getMaterialName } from '@/materials/useMaterialName'
import type { AggregatedPartItem, PartDefinition, PartOccurrence } from '@/parts/types'
import { calculateWeight } from '@/parts/utils'
import { transString } from '@/shared/i18n/TranslatableString'
import i18n from '@/shared/i18n/config'
import { downloadFile } from '@/shared/utils/downloadFile'

const UTF8_BOM = '\uFEFF'

function escapeCSVField(value: string | number | undefined | null): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSVRow(fields: (string | number | undefined | null)[]): string {
  return fields.map(escapeCSVField).join(',')
}

function toCSV(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerRow = toCSVRow(headers)
  const dataRows = rows.map(toCSVRow)
  return UTF8_BOM + headerRow + '\n' + dataRows.join('\n')
}

function getStoreyNameById(storeyId: string | undefined): string {
  if (!storeyId) return ''
  const { getStoreyById } = getModelActions()
  const storey = getStoreyById(storeyId as never)
  return getStoreyName(storey, i18n.t.bind(i18n))
}

function mmToMeters(mm: number | undefined): number | undefined {
  return mm != null ? mm / 1000 : undefined
}

function mm3ToCubicMeters(mm3: number): number {
  return mm3 / 1e9
}

function mm2ToSquareMeters(mm2: number): number {
  return mm2 / 1e6
}

function formatNumber(value: number | undefined, decimals = 3): string | number {
  if (value == null) return ''
  return Number(value.toFixed(decimals))
}

interface RawPartRow {
  label: string
  material: string
  type: string
  description: string
  storey: string
  quantity: number
  lengthM: number | undefined
  widthM: number | undefined
  heightM: number | undefined
  thicknessM: number | undefined
  volumeM3: number
  areaM2: number | undefined
}

function partToRawRow(
  part: PartDefinition,
  occurrence: PartOccurrence,
  labels: Partial<Record<string, string>>
): RawPartRow {
  const material = part.materialId ? getMaterialById(part.materialId) : null

  let widthM: number | undefined
  let heightM: number | undefined

  if (part.crossSection) {
    widthM = mmToMeters(part.crossSection.smallerLength)
    heightM = mmToMeters(part.crossSection.biggerLength)
  } else {
    widthM = mmToMeters(part.size[0])
    heightM = mmToMeters(part.size[1])
  }

  return {
    label: labels[part.partId] ?? '',
    material: getMaterialName(material, t),
    type: part.type,
    description: part.description ? transString(part.description) : '',
    storey: getStoreyNameById(occurrence.storeyId),
    quantity: 1,
    lengthM: mmToMeters(part.length),
    widthM,
    heightM,
    thicknessM: mmToMeters(part.thickness),
    volumeM3: mm3ToCubicMeters(part.volume),
    areaM2: part.area != null ? mm2ToSquareMeters(part.area) : undefined
  }
}

interface AggregatedPartRow {
  label: string
  material: string
  type: string
  description: string
  quantity: number
  lengthM: number | undefined
  widthM: number | undefined
  heightM: number | undefined
  thicknessM: number | undefined
  totalLengthM: number | undefined
  totalAreaM2: number | undefined
  totalVolumeM3: number
  totalWeightKg: number | undefined
}

function aggregatedPartToRow(part: AggregatedPartItem): AggregatedPartRow {
  const material = part.materialId ? getMaterialById(part.materialId) : null
  const totalWeight = material ? calculateWeight(part.totalVolume, material) : undefined

  let widthM: number | undefined
  let heightM: number | undefined

  if (part.crossSection) {
    widthM = mmToMeters(part.crossSection.smallerLength)
    heightM = mmToMeters(part.crossSection.biggerLength)
  } else {
    widthM = mmToMeters(part.size[0])
    heightM = mmToMeters(part.size[1])
  }

  return {
    label: part.label,
    material: getMaterialName(material, t),
    type: part.type,
    description: part.description ? transString(part.description) : '',
    quantity: part.quantity,
    lengthM: mmToMeters(part.length),
    widthM,
    heightM,
    thicknessM: mmToMeters(part.thickness),
    totalLengthM: mmToMeters(part.totalLength),
    totalAreaM2: part.totalArea != null ? mm2ToSquareMeters(part.totalArea) : undefined,
    totalVolumeM3: mm3ToCubicMeters(part.totalVolume),
    totalWeightKg: totalWeight ?? undefined
  }
}

function getRawPartsHeaders(): string[] {
  return [
    t($ => $.partsList.tableHeaders.label, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.material, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.type, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.description, { ns: 'construction' }),
    t($ => $.partsList.export.storey, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.quantity, { ns: 'construction' }),
    t($ => $.partsList.export.lengthM, { ns: 'construction' }),
    t($ => $.partsList.export.widthM, { ns: 'construction' }),
    t($ => $.partsList.export.heightM, { ns: 'construction' }),
    t($ => $.partsList.export.thicknessM, { ns: 'construction' }),
    t($ => $.partsList.export.volumeM3, { ns: 'construction' }),
    t($ => $.partsList.export.areaM2, { ns: 'construction' })
  ]
}

function getAggregatedPartsHeaders(): string[] {
  return [
    t($ => $.partsList.tableHeaders.label, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.material, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.type, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.description, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.quantity, { ns: 'construction' }),
    t($ => $.partsList.export.lengthM, { ns: 'construction' }),
    t($ => $.partsList.export.widthM, { ns: 'construction' }),
    t($ => $.partsList.export.heightM, { ns: 'construction' }),
    t($ => $.partsList.export.thicknessM, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.totalLength, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.totalArea, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.totalVolume, { ns: 'construction' }),
    t($ => $.partsList.tableHeaders.totalWeight, { ns: 'construction' })
  ]
}

export function buildRawPartsCSV(
  definitions: Record<string, PartDefinition>,
  occurrences: PartOccurrence[],
  labels: Partial<Record<string, string>>
): string {
  const headers = getRawPartsHeaders()
  const safeDefinitions = definitions as Record<string, PartDefinition | undefined>

  const rows: (string | number | undefined)[][] = occurrences
    .filter(occ => safeDefinitions[occ.partId])
    .map(occ => {
      const part = safeDefinitions[occ.partId]
      if (!part) return []
      const row = partToRawRow(part, occ, labels)
      return [
        row.label,
        row.material,
        row.type,
        row.description,
        row.storey,
        row.quantity,
        formatNumber(row.lengthM),
        formatNumber(row.widthM),
        formatNumber(row.heightM),
        formatNumber(row.thicknessM),
        formatNumber(row.volumeM3),
        formatNumber(row.areaM2)
      ]
    })

  return toCSV(headers, rows)
}

export function buildAggregatedPartsCSV(parts: AggregatedPartItem[]): string {
  const headers = getAggregatedPartsHeaders()

  const rows: (string | number | undefined)[][] = parts.map(part => {
    const row = aggregatedPartToRow(part)
    return [
      row.label,
      row.material,
      row.type,
      row.description,
      row.quantity,
      formatNumber(row.lengthM),
      formatNumber(row.widthM),
      formatNumber(row.heightM),
      formatNumber(row.thicknessM),
      formatNumber(row.totalLengthM),
      formatNumber(row.totalAreaM2),
      formatNumber(row.totalVolumeM3),
      formatNumber(row.totalWeightKg)
    ]
  })

  return toCSV(headers, rows)
}

export function downloadCSV(content: string, filename: string): void {
  downloadFile(content, filename, 'text/csv;charset=utf-8')
}

export function getExportTimestamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
}
