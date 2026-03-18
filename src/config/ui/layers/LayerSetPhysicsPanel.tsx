import { ChevronDown, ChevronRight } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ParallelEntryRows,
  PhysicsTableHeader,
  SectionHeaderRow,
  formatValue,
  sumSectionStats
} from '@/config/ui/physics/shared/PhysicsTableComponents'
import { computeLayerSetPhysics } from '@/construction/assemblies/layers/physics'
import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { Card } from '@/shared/ui/components/card'

interface LayerSetPhysicsPanelProps {
  layers: LayerConfig[]
}

export function LayerSetPhysicsPanel({ layers }: LayerSetPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const [isExpanded, setIsExpanded] = useState(false)

  const physics = useMemo(() => {
    if (layers.length === 0) return null
    return computeLayerSetPhysics(layers)
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
  const layerStats = sumSectionStats(physics.breakdown)

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

        {isExpanded && physics.breakdown.length > 0 && (
          <table className="border-border mt-2 w-full border-t pt-2 text-xs">
            <PhysicsTableHeader />
            <tbody>
              <SectionHeaderRow
                label={t($ => $.physics.breakdown.layers)}
                thicknessMm={layerStats.thicknessMm}
                sdValue={physics.totalSdValue}
                rValue={physics.totalRValue}
                massPerArea={physics.totalMassPerArea}
              />
              {physics.breakdown.map((layer, i) => (
                <ParallelEntryRows key={i} layer={layer} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}
