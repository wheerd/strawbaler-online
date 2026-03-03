import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { RingBeamAssemblySelect, type RingBeamAssemblySelectProps } from './RingBeamAssemblySelect'

export function RingBeamAssemblySelectWithEdit(props: RingBeamAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <RingBeamAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.ringBeams.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('ringbeams', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
