import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { RoofAssemblySelect, type RoofAssemblySelectProps } from './RoofAssemblySelect'

export function RoofAssemblySelectWithEdit(props: RoofAssemblySelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-1">
      <div className="grow">
        <RoofAssemblySelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.roofs.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('roofs', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
