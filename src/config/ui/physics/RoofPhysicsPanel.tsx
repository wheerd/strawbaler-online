import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { computeAssemblyPhysics } from '@/construction/assemblies/physics'
import type { AssemblyPhysics, AssemblyPhysicsStructure } from '@/construction/assemblies/physics'
import { Card } from '@/shared/ui/components/card'

import { PhysicsBreakdown } from './shared/PhysicsBreakdown'
import { PhysicsSummaryValues } from './shared/PhysicsSummaryValues'

interface RoofPhysicsPanelProps {
  physicsStructure: AssemblyPhysicsStructure | null
}

export function RoofPhysicsPanel({ physicsStructure }: RoofPhysicsPanelProps): React.JSX.Element {
  const { t } = useTranslation('config')

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

  return (
    <Card variant="soft" className="p-3">
      <div className="flex flex-col gap-3">
        <div className="text-base font-bold">{t($ => $.physics.title)}</div>
        <PhysicsSummaryValues physics={physics} />
        <PhysicsBreakdown physics={physics} />
      </div>
    </Card>
  )
}
