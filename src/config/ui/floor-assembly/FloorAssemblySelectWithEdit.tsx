import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigurationModal } from '@/config/ui/ConfigurationModalContext'
import { Button } from '@/shared/ui/components/button'

import { FloorAssemblySelect, type FloorAssemblySelectProps } from './FloorAssemblySelect'

export function FloorAssemblySelectWithEdit(props: FloorAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { openConfiguration } = useConfigurationModal()

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
          openConfiguration('floors', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
