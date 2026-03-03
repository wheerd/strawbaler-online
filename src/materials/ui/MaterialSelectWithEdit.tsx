import { Pencil } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useConfigNavigation } from '@/config/ui/useConfigNavigation'
import { Button } from '@/shared/ui/components/button'

import { MaterialSelect, type MaterialSelectProps } from './MaterialSelect'

export type MaterialSelectWithEditProps = MaterialSelectProps

export function MaterialSelectWithEdit(props: MaterialSelectWithEditProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { navigateToConfig } = useConfigNavigation()

  return (
    <div className="flex items-center gap-0.5">
      <div className="mr-1 flex grow flex-col gap-1">
        <MaterialSelect {...props} />
      </div>
      <Button
        size="icon-xs"
        title={t($ => $.materials.configure)}
        variant="ghost"
        onClick={() => {
          void navigateToConfig('materials', props.value ?? undefined)
        }}
      >
        <Pencil />
      </Button>
    </div>
  )
}
