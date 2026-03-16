import React, { useMemo } from 'react'
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

export function LayerSetPhysicsPanel({ layers }: LayerSetPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')

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

  return (
    <Card variant="soft" className="p-3">
      <div className="flex flex-col gap-3">
        <div className="text-base font-bold">{t($ => $.physics.title)}</div>

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
      </div>
    </Card>
  )
}
