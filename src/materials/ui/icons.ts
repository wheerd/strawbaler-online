import { Box, Circle, Droplet, Layers } from 'lucide-react'
import type { ComponentType } from 'react'

import type { Material } from '@/materials/types'
import StrawbaleIcon from '@/shared/ui/icons/StrawbaleIcon'
import type { IconProps } from '@/shared/ui/icons/types'

export function getMaterialTypeIcon(type: Material['type']): ComponentType<IconProps> {
  switch (type) {
    case 'dimensional':
      return Box
    case 'sheet':
      return Layers
    case 'volume':
      return Droplet
    case 'generic':
      return Circle
    case 'strawbale':
      return StrawbaleIcon
    case 'prefab':
      return Box
    default:
      return Circle
  }
}
