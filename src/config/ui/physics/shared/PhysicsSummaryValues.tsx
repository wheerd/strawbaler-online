import { useTranslation } from 'react-i18next'

import type { AssemblyPhysics } from '@/construction/assemblies/physics'

interface PhysicsSummaryValuesProps {
  physics: AssemblyPhysics
  massPerRunningMeter?: number
}

export function PhysicsSummaryValues({ physics, massPerRunningMeter }: PhysicsSummaryValuesProps): React.JSX.Element {
  const { t } = useTranslation('config')

  return (
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

      {massPerRunningMeter != null && (
        <>
          <span className="text-muted-foreground text-sm">{t($ => $.physics.massPerRunningMeter)}</span>
          <span className="text-sm font-medium">
            {t($ => $.physics.massPerRunningMeterValue, { value: massPerRunningMeter })}
          </span>
        </>
      )}
    </div>
  )
}
