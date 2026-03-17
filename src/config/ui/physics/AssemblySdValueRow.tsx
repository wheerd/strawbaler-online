import { AlertTriangle, Check } from 'lucide-react'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { computeAssemblyPhysics } from '@/construction/assemblies/physics'
import type { AssemblyPhysicsStructure } from '@/construction/assemblies/physics'
import { Tooltip } from '@/shared/ui/components/tooltip'

interface AssemblySdValueRowProps {
  physicsStructure: AssemblyPhysicsStructure | null
}

export function AssemblySdValueRow({ physicsStructure }: AssemblySdValueRowProps): React.JSX.Element {
  const { t } = useTranslation('config')

  const physics = useMemo(() => {
    if (!physicsStructure) return null
    return computeAssemblyPhysics(physicsStructure)
  }, [physicsStructure])

  const insideSd = physics?.insideSdValue ?? null
  const outsideSd = physics?.outsideSdValue ?? null

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
