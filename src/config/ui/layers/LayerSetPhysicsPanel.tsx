import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { computeLayerSetPhysics } from '@/construction/assemblies/layers/physics'
import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { getMaterialById } from '@/materials/store/store'
import { Card } from '@/shared/ui/components/card'

interface LayerSetPhysicsPanelProps {
  layers: LayerConfig[]
}

function formatValue(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

function LayerRow({
  name,
  thicknessMm,
  sdValue,
  rValue,
  massPerArea,
  isExcluded
}: {
  name: string
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
  isExcluded?: boolean
}): React.JSX.Element {
  const { t } = useTranslation('config')
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs ${isExcluded ? 'opacity-50' : ''}`}
    >
      <span className="truncate" title={name}>
        {name}
        {isExcluded && (
          <span className="text-muted-foreground ml-1 italic">({t($ => $.physics.breakdown.excludedFromTotal)})</span>
        )}
      </span>
      <span className="text-muted-foreground w-12 text-right">{thicknessMm} mm</span>
      <span className="w-14 text-right">{formatValue(sdValue, 2)} m</span>
      <span className="w-14 text-right">{formatValue(rValue, 2)}</span>
      <span className="w-14 text-right">{formatValue(massPerArea, 1)}</span>
    </div>
  )
}

export function LayerSetPhysicsPanel({ layers }: LayerSetPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const [isExpanded, setIsExpanded] = useState(false)

  const physics = useMemo(() => {
    if (layers.length === 0) return null
    return computeLayerSetPhysics(layers, getMaterialById)
  }, [layers])

  if (!physics) {
    return (
      <Card variant="soft" className="p-3">
        <div className="flex min-h-20 items-center justify-center">
          <span className="text-muted-foreground text-sm">{t($ => $.physics.noData)}</span>
        </div>
      </Card>
    )
  }

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
          <ChevronIcon className="text-muted-foreground size-4" />
        </div>

        <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
          <span className="text-muted-foreground text-sm">{t($ => $.physics.rValue)}</span>
          <span className="text-sm font-medium">
            {formatValue(physics.totalRValue, 2)} {t($ => $.physics.rValueUnit)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.uValue)}</span>
          <span className="text-sm font-medium">
            {formatValue(physics.uValue, 3)} {t($ => $.physics.uValueUnit)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.sdValue)}</span>
          <span className="text-sm font-medium">
            {formatValue(physics.totalSdValue, 2)} {t($ => $.physics.sdValueUnit)}
          </span>

          <span className="text-muted-foreground text-sm">{t($ => $.physics.massPerArea)}</span>
          <span className="text-sm font-medium">
            {formatValue(physics.totalMassPerArea, 1)} {t($ => $.physics.massPerAreaUnit)}
          </span>
        </div>

        {isExpanded && physics.layerPhysics.length > 0 && (
          <div className="border-border mt-2 flex flex-col gap-1 border-t pt-2">
            <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
              <span>{t($ => $.physics.breakdown.layers)}</span>
              <span className="w-12 text-right">{t($ => $.physics.thicknessMm)}</span>
              <span className="w-14 text-right">{t($ => $.physics.sdValueShort)}</span>
              <span className="w-14 text-right">{t($ => $.physics.rValueShort)}</span>
              <span className="w-14 text-right">{t($ => $.physics.massPerAreaShort)}</span>
            </div>
            {physics.layerPhysics.map((layerPhysics, index) => (
              <LayerRow
                key={index}
                name={layers[index].name}
                thicknessMm={layers[index].thickness}
                sdValue={layerPhysics.sdValue}
                rValue={layerPhysics.rValue}
                massPerArea={layerPhysics.massPerArea}
                isExcluded={layerPhysics.isExcludedFromTotal}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
