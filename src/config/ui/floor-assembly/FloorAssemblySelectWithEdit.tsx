import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { FloorAssemblySelect, type FloorAssemblySelectProps } from './FloorAssemblySelect'

export function FloorAssemblySelectWithEdit(props: FloorAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <FloorAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.floors.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('floors', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
