import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { AssemblyPhysics, PhysicsParallelResult, PhysicsSeriesResult } from '@/construction/assemblies/physics'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

interface PhysicsBreakdownProps {
  physics: AssemblyPhysics
}

function formatValue(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

function LayerRow({
  label,
  thicknessMm,
  sdValue,
  rValue,
  massPerArea
}: {
  label: TranslatableString
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}): React.JSX.Element {
  const translatedLabel = useTranslatableString(label)
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
      <span className="truncate" title={translatedLabel}>
        {translatedLabel}
      </span>
      <span className="text-muted-foreground w-12 text-right">{thicknessMm} mm</span>
      <span className="w-14 text-right">{formatValue(sdValue, 2)} m</span>
      <span className="w-14 text-right">{formatValue(rValue, 2)}</span>
      <span className="w-14 text-right">{formatValue(massPerArea, 1)}</span>
    </div>
  )
}

function BreakdownSection({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-muted-foreground text-xs font-medium">{title}</div>
      {children}
    </div>
  )
}

function SeriesBreakdown({ paths }: { paths: PhysicsSeriesResult[] }): React.JSX.Element {
  const { t } = useTranslation('config')

  if (paths.length === 0) {
    return <div className="text-muted-foreground text-xs italic">{t($ => $.physics.breakdown.noLayers)}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {paths.map((path, pathIndex) => (
        <SeriesEntry key={pathIndex} path={path} />
      ))}
    </div>
  )
}

function ParallelBreakdown({ layers }: { layers: PhysicsParallelResult[] }): React.JSX.Element {
  const { t } = useTranslation('config')

  if (layers.length === 0) {
    return <div className="text-muted-foreground text-xs italic">{t($ => $.physics.breakdown.noLayers)}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {layers.map((layer, layerIndex) => (
        <ParallelEntry key={layerIndex} layer={layer} />
      ))}
    </div>
  )
}

function SeriesEntry({ path }: { path: PhysicsSeriesResult }): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{useTranslatableString(path.label)}</span>
        <span className="text-muted-foreground text-xs">
          ({t($ => $.physics.breakdown.areaFraction, { percent: path.areaPercent })})
        </span>
      </div>
      <div className="border-border ml-2 flex flex-col gap-0.5 border-l pl-2">
        {path.items.map((item, itemIndex) => (
          <LayerRow
            key={itemIndex}
            label={item.label}
            thicknessMm={item.thicknessMm}
            sdValue={item.sdValue}
            rValue={item.rValue}
            massPerArea={item.massPerArea}
          />
        ))}
      </div>
      {path.items.length > 1 && (
        <LayerRow
          label={t($ => $.physics.breakdown.combined)}
          thicknessMm={path.items.reduce((sum: number, item) => sum + item.thicknessMm, 0)}
          sdValue={path.combined.sdValue}
          rValue={path.combined.rValue}
          massPerArea={path.combined.massPerArea}
        />
      )}
    </div>
  )
}

function ParallelEntry({ layer }: { layer: PhysicsParallelResult }): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">{useTranslatableString(layer.label)}</span>
        <span className="text-muted-foreground text-xs">({layer.thicknessMm} mm)</span>
      </div>
      <div className="border-border ml-2 flex flex-col gap-0.5 border-l pl-2">
        {layer.items.map((item, itemIndex) => (
          <ParallelItemRow key={itemIndex} item={item} />
        ))}
      </div>
      {layer.items.length > 1 && (
        <LayerRow
          label={t($ => $.physics.breakdown.combined)}
          thicknessMm={layer.thicknessMm}
          sdValue={layer.combined.sdValue}
          rValue={layer.combined.rValue}
          massPerArea={layer.combined.massPerArea}
        />
      )}
    </div>
  )
}

function ParallelItemRow({
  item
}: {
  item: {
    label: TranslatableString
    areaPercent: string
    sdValue: number | null
    rValue: number | null
    massPerArea: number | null
  }
}): React.JSX.Element {
  const translatedLabel = useTranslatableString(item.label)
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
      <span className="truncate" title={translatedLabel}>
        {translatedLabel}
        <span className="text-muted-foreground ml-1">({item.areaPercent})</span>
      </span>
      <span className="text-muted-foreground w-12 text-right">—</span>
      <span className="w-14 text-right">{formatValue(item.sdValue, 2)} m</span>
      <span className="w-14 text-right">{formatValue(item.rValue, 2)}</span>
      <span className="w-14 text-right">{formatValue(item.massPerArea, 1)}</span>
    </div>
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

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => {
          setIsExpanded(!isExpanded)
        }}
      >
        <div className="text-base font-bold">{t($ => $.physics.title)}</div>
        <ChevronIcon className="text-muted-foreground size-4" />
      </div>

      {isExpanded && (
        <div className="border-border mt-2 flex flex-col gap-3 border-t pt-3">
          <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
            <span>{t($ => $.physics.breakdown.layers)}</span>
            <span className="w-12 text-right">{t($ => $.physics.thicknessMm)}</span>
            <span className="w-14 text-right">{t($ => $.physics.sdValueShort)}</span>
            <span className="w-14 text-right">{t($ => $.physics.rValueShort)}</span>
            <span className="w-14 text-right">{t($ => $.physics.massPerAreaShort)}</span>
          </div>

          <BreakdownSection title={t($ => $.physics.breakdown.inside)}>
            <ParallelBreakdown layers={physics.breakdown.inside} />
          </BreakdownSection>

          <BreakdownSection title={t($ => $.physics.breakdown.core)}>
            <SeriesBreakdown paths={physics.breakdown.core} />
          </BreakdownSection>

          <BreakdownSection title={t($ => $.physics.breakdown.outside)}>
            <ParallelBreakdown layers={physics.breakdown.outside} />
          </BreakdownSection>
        </div>
      )}
    </div>
  )
}
