import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { OpeningAssemblySelect, type OpeningAssemblySelectProps } from './OpeningAssemblySelect'

export function OpeningAssemblySelectWithEdit(props: OpeningAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <OpeningAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.openings.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('openings', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
