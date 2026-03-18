import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AssemblyPhysics, PhysicsParallelResult, PhysicsSeriesResult } from '@/construction/assemblies/physics'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

interface PhysicsBreakdownProps {
  physics: AssemblyPhysics
}

function formatValue(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

function sumSectionStats(entries: PhysicsParallelResult[]) {
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

function combineParallelStats(paths: PhysicsSeriesResult[]) {
  if (paths.length === 0) return { sdValue: null, rValue: null, massPerArea: null, thicknessMm: 0 }

  const totalFraction = paths.reduce((sum, p) => sum + p.areaFraction, 0)

  let invR = 0
  let invSd = 0
  let mass = 0
  let thicknessMm = 0

  for (const p of paths) {
    const weight = p.areaFraction / totalFraction
    if (p.combined.rValue && p.combined.rValue > 0) invR += weight / p.combined.rValue
    if (p.combined.sdValue && p.combined.sdValue > 0) invSd += weight / p.combined.sdValue
    mass += weight * (p.combined.massPerArea ?? 0)
    if (thicknessMm === 0) {
      thicknessMm = p.items.reduce((sum, i) => sum + i.thicknessMm, 0)
    }
  }

  return {
    rValue: invR > 0 ? 1 / invR : null,
    sdValue: invSd > 0 ? 1 / invSd : null,
    massPerArea: mass > 0 ? mass : null,
    thicknessMm
  }
}

function TableHeader(): React.JSX.Element {
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

function SectionHeaderRow({
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

function ParallelItemRow({
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

function ParallelEntryRows({ layer }: { layer: PhysicsParallelResult }): React.JSX.Element {
  const translatedLabel = useTranslatableString(layer.label)
  const excludedClass = layer.isExcludedFromTotal ? 'opacity-50' : ''

  return (
    <>
      <tr className={`font-medium ${excludedClass}`}>
        <td className="py-0.5 pl-2">
          {translatedLabel}
          {layer.isExcludedFromTotal && <ExcludedBadge />}
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

function ExcludedBadge(): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <span className="text-muted-foreground ml-1 font-normal italic">
      ({t($ => $.physics.breakdown.excludedFromTotal)})
    </span>
  )
}

function SeriesItemRow({
  item,
  areaPercentage
}: {
  item: PhysicsSeriesResult['items'][0]
  areaPercentage: string
}): React.JSX.Element {
  const translatedLabel = useTranslatableString(item.label)
  return (
    <tr>
      <td className="py-0.5 pl-6">
        <span className="truncate" title={translatedLabel}>
          {translatedLabel}
        </span>
      </td>
      <td className="py-0.5 text-right">{areaPercentage}</td>
      <td className="py-0.5 text-right">{item.thicknessMm}</td>
      <td className="py-0.5 text-right">{formatValue(item.sdValue, 2)}</td>
      <td className="py-0.5 text-right">{formatValue(item.rValue, 2)}</td>
      <td className="py-0.5 text-right">{formatValue(item.massPerArea, 1)}</td>
    </tr>
  )
}

function SeriesEntryRows({ path }: { path: PhysicsSeriesResult }): React.JSX.Element {
  const translatedLabel = useTranslatableString(path.label)
  const sumThickness = path.items.reduce((sum, item) => sum + item.thicknessMm, 0)

  return (
    <>
      <tr className="font-medium">
        <td className="py-0.5 pl-2">{translatedLabel}</td>
        <td className="py-0.5 text-right">{path.areaPercent}</td>
        <td className="py-0.5 text-right">{sumThickness}</td>
        <td className="py-0.5 text-right">{formatValue(path.combined.sdValue, 2)}</td>
        <td className="py-0.5 text-right">{formatValue(path.combined.rValue, 2)}</td>
        <td className="py-0.5 text-right">{formatValue(path.combined.massPerArea, 1)}</td>
      </tr>
      {path.items.map((item, itemIndex) => (
        <SeriesItemRow key={itemIndex} item={item} areaPercentage={path.areaPercent} />
      ))}
    </>
  )
}

const hasBreakdown = (physics: AssemblyPhysics): boolean => {
  return (
    physics.breakdown.inside.length > 0 || physics.breakdown.core.length > 0 || physics.breakdown.outside.length > 0
  )
}

export function PhysicsBreakdown({ physics }: PhysicsBreakdownProps): React.JSX.Element | null {
  const { t } = useTranslation('config')
  const [isExpanded, setIsExpanded] = useState(false)

  const showBreakdown = hasBreakdown(physics)
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  if (!showBreakdown) {
    return null
  }

  const insideStats = sumSectionStats(physics.breakdown.inside)
  const outsideStats = sumSectionStats(physics.breakdown.outside)
  const coreStats = combineParallelStats(physics.breakdown.core)

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => {
          setIsExpanded(!isExpanded)
        }}
      >
        <div className="text-base font-medium">{t($ => $.physics.breakdown.title)}</div>
        <ChevronIcon className="text-muted-foreground size-4" />
      </div>

      {isExpanded && (
        <table className="mt-2 w-full text-xs">
          <TableHeader />
          <tbody>
            {physics.breakdown.inside.length > 0 && (
              <>
                <SectionHeaderRow
                  label={t($ => $.physics.breakdown.inside)}
                  thicknessMm={insideStats.thicknessMm}
                  sdValue={insideStats.sdValue}
                  rValue={insideStats.rValue}
                  massPerArea={insideStats.massPerArea}
                />
                {physics.breakdown.inside.map((layer, i) => (
                  <ParallelEntryRows key={i} layer={layer} />
                ))}
              </>
            )}

            {physics.breakdown.core.length > 0 && (
              <>
                <SectionHeaderRow
                  label={t($ => $.physics.breakdown.core)}
                  thicknessMm={coreStats.thicknessMm}
                  sdValue={coreStats.sdValue}
                  rValue={coreStats.rValue}
                  massPerArea={coreStats.massPerArea}
                />
                {physics.breakdown.core.map((path, i) => (
                  <SeriesEntryRows key={i} path={path} />
                ))}
              </>
            )}

            {physics.breakdown.outside.length > 0 && (
              <>
                <SectionHeaderRow
                  label={t($ => $.physics.breakdown.outside)}
                  thicknessMm={outsideStats.thicknessMm}
                  sdValue={outsideStats.sdValue}
                  rValue={outsideStats.rValue}
                  massPerArea={outsideStats.massPerArea}
                />
                {physics.breakdown.outside.map((layer, i) => (
                  <ParallelEntryRows key={i} layer={layer} />
                ))}
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}
