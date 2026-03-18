import { useTranslation } from 'react-i18next'

import type { PhysicsParallelResult } from '@/construction/assemblies/physics'
import type { PhysicsExclusionReason } from '@/construction/assemblies/physics/types'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

export function formatValue(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

export function sumSectionStats(entries: PhysicsParallelResult[]) {
  const includedEntries = entries.filter(e => !e.isExcludedFromTotal)
  const sdValue = includedEntries.reduce((sum, e) => sum + (e.combined.sdValue ?? 0), 0)
  const rValue = includedEntries.reduce((sum, e) => sum + (e.combined.rValue ?? 0), 0)
  const massPerArea = includedEntries.reduce((sum, e) => sum + (e.combined.massPerArea ?? 0), 0)
  const thicknessMm = includedEntries.reduce((sum, e) => sum + e.thicknessMm, 0)
  return {
    sdValue: sdValue > 0 ? sdValue : null,
    rValue: rValue > 0 ? rValue : null,
    massPerArea: massPerArea > 0 ? massPerArea : null,
    thicknessMm
  }
}

export function PhysicsTableHeader(): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <thead>
      <tr className="text-muted-foreground border-b text-xs">
        <th className="py-1 text-left" />
        <th className="w-14 py-1 text-right">{t($ => $.physics.breakdown.areaPercentShort)}</th>
        <th className="w-18 py-1 text-right">{t($ => $.physics.thicknessMm)}</th>
        <th className="w-14 py-1 text-right">{t($ => $.physics.sdValueShort)}</th>
        <th className="w-14 py-1 text-right">{t($ => $.physics.rValueShort)}</th>
        <th className="w-14 py-1 text-right">{t($ => $.physics.massPerAreaShort)}</th>
      </tr>
    </thead>
  )
}

export function SectionHeaderRow({
  label,
  thicknessMm,
  sdValue,
  rValue,
  massPerArea
}: {
  label: string
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}): React.JSX.Element {
  return (
    <tr className="bg-muted/20 font-semibold">
      <td className="py-1">{label}</td>
      <td className="py-1 text-right">100%</td>
      <td className="py-1 text-right">{thicknessMm}</td>
      <td className="py-1 text-right">{formatValue(sdValue, 2)}</td>
      <td className="py-1 text-right">{formatValue(rValue, 2)}</td>
      <td className="py-1 text-right">{formatValue(massPerArea, 1)}</td>
    </tr>
  )
}

export function ExcludedBadge({ reason }: { reason: PhysicsExclusionReason }): React.JSX.Element {
  const { t } = useTranslation('config')
  const label = reason === 'ventilated' ? t($ => $.physics.breakdown.ventilated) : t($ => $.physics.breakdown.overlap)
  return <span className="text-muted-foreground ml-1 font-normal italic">({label})</span>
}

export function ParallelItemRow({
  item,
  thicknessMm,
  excludedClass
}: {
  item: PhysicsParallelResult['items'][0]
  thicknessMm: number
  excludedClass: string
}): React.JSX.Element {
  const translatedLabel = useTranslatableString(item.label)
  return (
    <tr className={excludedClass}>
      <td className="py-0.5 pl-6">
        <span className="truncate" title={translatedLabel}>
          {translatedLabel}
        </span>
      </td>
      <td className="py-0.5 text-right">{item.areaPercent}</td>
      <td className="py-0.5 text-right">{thicknessMm}</td>
      <td className="py-0.5 text-right">{formatValue(item.sdValue, 2)}</td>
      <td className="py-0.5 text-right">{formatValue(item.rValue, 2)}</td>
      <td className="py-0.5 text-right">{formatValue(item.massPerArea, 1)}</td>
    </tr>
  )
}

export function ParallelEntryRows({ layer }: { layer: PhysicsParallelResult }): React.JSX.Element {
  const translatedLabel = useTranslatableString(layer.label)
  const excludedClass = layer.isExcludedFromTotal ? 'opacity-50' : ''

  return (
    <>
      <tr className={`font-medium ${excludedClass}`}>
        <td className="py-0.5 pl-2">
          {translatedLabel}
          {layer.isExcludedFromTotal && layer.exclusionReason && <ExcludedBadge reason={layer.exclusionReason} />}
        </td>
        <td className="py-0.5 text-right">100%</td>
        <td className="py-0.5 text-right">{layer.thicknessMm}</td>
        <td className="py-0.5 text-right">{formatValue(layer.combined.sdValue, 2)}</td>
        <td className="py-0.5 text-right">{formatValue(layer.combined.rValue, 2)}</td>
        <td className="py-0.5 text-right">{formatValue(layer.combined.massPerArea, 1)}</td>
      </tr>
      {layer.items.map((item, itemIndex) => (
        <ParallelItemRow key={itemIndex} item={item} thicknessMm={layer.thicknessMm} excludedClass={excludedClass} />
      ))}
    </>
  )
}
