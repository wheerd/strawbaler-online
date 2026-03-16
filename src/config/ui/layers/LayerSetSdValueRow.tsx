import { AlertTriangle, Check } from 'lucide-react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { computeLayerSetPhysics } from '@/construction/assemblies/layers/physics'
import type { LayerConfig } from '@/construction/assemblies/layers/types'
import { getMaterialById } from '@/materials/store/store'
import { Tooltip } from '@/shared/ui/components/tooltip'

interface LayerSetSdValueRowProps {
  insideLayers: LayerConfig[]
  outsideLayers: LayerConfig[]
}

export function LayerSetSdValueRow({ insideLayers, outsideLayers }: LayerSetSdValueRowProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const insidePhysics = useMemo(() => {
    if (insideLayers.length === 0) return null
    return computeLayerSetPhysics(insideLayers, getMaterialById)
  }, [insideLayers])

  const outsidePhysics = useMemo(() => {
    if (outsideLayers.length === 0) return null
    return computeLayerSetPhysics(outsideLayers, getMaterialById)
  }, [outsideLayers])

  const insideSd = insidePhysics?.totalSdValue ?? null
  const outsideSd = outsidePhysics?.totalSdValue ?? null

  const isWarning = insideSd !== null && outsideSd !== null && outsideSd > insideSd

  const Icon = isWarning ? AlertTriangle : Check
  const iconColor = isWarning ? 'text-amber-500' : 'text-green-500'

  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      <span className="text-muted-foreground">{t($ => $.physics.sdValueShort)}:</span>
      <span>
        {insideSd != null
          ? t($ => $.common.sdValue.inside, {
              defaultValue: 'Inside {{value, number(minimumFractionDigits: 2; maximumFractionDigits: 2)}} m',
              value: insideSd
            })
          : t($ => $.common.sdValue.insideNoValue, { defaultValue: 'Inside -' })}
      </span>
      <span className="text-muted-foreground">|</span>
      <span>
        {outsideSd != null
          ? t($ => $.common.sdValue.outside, {
              defaultValue: 'Outside {{value, number(minimumFractionDigits: 2; maximumFractionDigits: 2)}} m',
              value: outsideSd
            })
          : t($ => $.common.sdValue.outsideNoValue, { defaultValue: 'Outside -' })}
      </span>
      <Tooltip content={isWarning ? t($ => $.common.sdValue.warning) : t($ => $.common.sdValue.ok)}>
        <Icon className={`size-4 ${iconColor}`} />
      </Tooltip>
    </div>
  )
}
