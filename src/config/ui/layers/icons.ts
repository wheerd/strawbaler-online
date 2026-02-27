import { ArrowDownToLineIcon, ArrowUpToLineIcon, BrickWallIcon } from 'lucide-react'
import type { ComponentType } from 'react'

import type { LayerSetUse } from '@/construction/assemblies/layers/types'
import RoofIcon from '@/shared/ui/icons/RoofIcon'
import type { IconProps } from '@/shared/ui/icons/types'

export function getLayerSetUseIcon(use: LayerSetUse): ComponentType<IconProps> {
  switch (use) {
    case 'wall':
      return BrickWallIcon
    case 'floor':
      return ArrowDownToLineIcon
    case 'ceiling':
      return ArrowUpToLineIcon
    case 'roof':
      return RoofIcon
  }
}
