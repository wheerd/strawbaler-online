import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { computeAssemblyPhysics } from '@/construction/assemblies/physics'
import type {
  AssemblyPhysics,
  AssemblyPhysicsStructure,
  PhysicsLayerResult,
  PhysicsPathResult
} from '@/construction/assemblies/physics'
import type { TranslatableString } from '@/shared/i18n/TranslatableString'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'
import { Card } from '@/shared/ui/components/card'

interface AssemblyPhysicsPanelProps {
  physicsStructure: AssemblyPhysicsStructure | null
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

function LayersBreakdown({ layers }: { layers: PhysicsLayerResult[] }): React.JSX.Element {
  const { t } = useTranslation('config')

  if (layers.length === 0) {
    return <div className="text-muted-foreground text-xs italic">{t($ => $.physics.breakdown.noLayers)}</div>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {layers.map((layer, index) => (
        <LayerRow
          key={index}
          label={layer.label}
          thicknessMm={layer.thicknessMm}
          sdValue={layer.sdValue}
          rValue={layer.rValue}
          massPerArea={layer.massPerArea}
        />
      ))}
    </div>
  )
}

function PathsBreakdown({ paths }: { paths: PhysicsPathResult[] }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {paths.map((path, pathIndex) => (
        <PathEntry key={pathIndex} path={path} />
      ))}
    </div>
  )
}

function PathEntry({ path }: { path: PhysicsPathResult }): React.JSX.Element {
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
          thicknessMm={path.items.reduce((sum, item) => sum + item.thicknessMm, 0)}
          sdValue={path.combined.sdValue}
          rValue={path.combined.rValue}
          massPerArea={path.combined.massPerArea}
        />
      )}
    </div>
  )
}

export function AssemblyPhysicsPanel({ physicsStructure }: AssemblyPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const [isExpanded, setIsExpanded] = useState(false)

  const physics: AssemblyPhysics | null = useMemo(() => {
    if (!physicsStructure) return null
    return computeAssemblyPhysics(physicsStructure)
  }, [physicsStructure])

  if (!physics) {
    return (
      <Card variant="soft" className="p-3">
        <div className="flex min-h-20 items-center justify-center">
          <span className="text-muted-foreground text-sm">{t($ => $.physics.noData)}</span>
        </div>
      </Card>
    )
  }

  const hasBreakdown =
    physics.breakdown.inside.length > 0 || physics.breakdown.core.length > 0 || physics.breakdown.outside.length > 0

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  return (
    <Card variant="soft" className="p-3">
      <div className="flex flex-col gap-3">
        <div
          className="flex cursor-pointer items-center justify-between"
          onClick={() => {
            setIsExpanded(!isExpanded)
          }}
        >
          <div className="text-base font-bold">{t($ => $.physics.title)}</div>
          {hasBreakdown && <ChevronIcon className="text-muted-foreground size-4" />}
        </div>

        <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-3 gap-y-1">
          <span className="text-muted-foreground text-sm">{t($ => $.physics.uValue)}</span>
          <span className="text-sm font-medium">
            {physics.uValue != null
              ? t($ => $.physics.uValueValue, { value: physics.uValue })
              : t($ => $.physics.uValueNoValue)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.rValue)}</span>
          <span className="text-sm font-medium">
            {physics.totalRValue != null
              ? t($ => $.physics.rValueValue, { value: physics.totalRValue })
              : t($ => $.physics.rValueNoValue)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.sdValue)}</span>
          <span className="text-sm font-medium">
            {physics.totalSdValue != null
              ? t($ => $.physics.sdValueValue, { value: physics.totalSdValue })
              : t($ => $.physics.sdValueNoValue)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.massPerArea)}</span>
          <span className="text-sm font-medium">
            {physics.totalMassPerArea != null
              ? t($ => $.physics.massPerAreaValue, { value: physics.totalMassPerArea })
              : t($ => $.physics.massPerAreaNoValue)}
          </span>
        </div>

        {isExpanded && hasBreakdown && (
          <div className="border-border mt-2 flex flex-col gap-3 border-t pt-3">
            <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
              <span>{t($ => $.physics.breakdown.layers)}</span>
              <span className="w-12 text-right">{t($ => $.physics.thicknessMm)}</span>
              <span className="w-14 text-right">{t($ => $.physics.sdValueShort)}</span>
              <span className="w-14 text-right">{t($ => $.physics.rValueShort)}</span>
              <span className="w-14 text-right">{t($ => $.physics.massPerAreaShort)}</span>
            </div>

            <BreakdownSection title={t($ => $.physics.breakdown.inside)}>
              <LayersBreakdown layers={physics.breakdown.inside} />
            </BreakdownSection>

            <BreakdownSection title={t($ => $.physics.breakdown.core)}>
              <PathsBreakdown paths={physics.breakdown.core} />
            </BreakdownSection>

            <BreakdownSection title={t($ => $.physics.breakdown.outside)}>
              <LayersBreakdown layers={physics.breakdown.outside} />
            </BreakdownSection>
          </div>
        )}
      </div>
    </Card>
  )
}
