import type { ComponentType } from 'react'

import type { FloorAssemblyType } from '@/construction/assemblies/floors/types'
import FilledIcon from '@/shared/ui/icons/FilledIcon'
import JoistIcon from '@/shared/ui/icons/JoistIcon'
import MonolithicIcon from '@/shared/ui/icons/MonolithicIcon'
import type { IconProps } from '@/shared/ui/icons/types'

export function getFloorAssemblyTypeIcon(type: FloorAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'monolithic':
      return MonolithicIcon
    case 'joist':
      return JoistIcon
    case 'filled':
      return FilledIcon
    case 'hanging-joist':
      return JoistIcon
  }
}
