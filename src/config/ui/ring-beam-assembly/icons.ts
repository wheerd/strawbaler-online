import { Columns, Square } from 'lucide-react'
import type { ComponentType } from 'react'

import BrickIcon from '@/shared/ui/icons/BrickIcon'
import type { IconProps } from '@/shared/ui/icons/types'

export function getRingBeamTypeIcon(type: 'full' | 'double' | 'brick'): ComponentType<IconProps> {
  switch (type) {
    case 'full':
      return Square
    case 'double':
      return Columns
    case 'brick':
      return BrickIcon
  }
}
