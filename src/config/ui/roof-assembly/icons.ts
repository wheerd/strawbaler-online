import type { ComponentType } from 'react'

import type { RoofAssemblyType } from '@/construction/assemblies/roofs/types'
import FilledIcon from '@/shared/ui/icons/FilledIcon'
import MonolithicIcon from '@/shared/ui/icons/MonolithicIcon'
import type { IconProps } from '@/shared/ui/icons/types'

export function getRoofAssemblyTypeIcon(type: RoofAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'monolithic':
      return MonolithicIcon
    case 'purlin':
      return FilledIcon
  }
}
