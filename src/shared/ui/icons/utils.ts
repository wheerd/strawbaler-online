import {
  ArrowDownToLineIcon,
  ArrowUpToLineIcon,
  Box,
  BrickWallIcon,
  Circle,
  Columns,
  Droplet,
  Layers,
  Square
} from 'lucide-react'
import type { ComponentType } from 'react'

import type { WallAssemblyConfig } from '@/config/types'
import type { FloorAssemblyType } from '@/construction/assemblies/floors/types'
import type { LayerSetUse } from '@/construction/assemblies/layers/types'
import type { RoofAssemblyType } from '@/construction/assemblies/roofs/types'
import type { Material } from '@/materials/material'

import BasePlateIcon from './BasePlateIcon'
import BrickIcon from './BrickIcon'
import DoorIcon from './DoorIcon'
import FilledIcon from './FilledIcon'
import type { IconProps } from './IconProps'
import InfillIcon from './InfillIcon'
import JoistIcon from './JoistIcon'
import Model3DIcon from './Model3DIcon'
import ModulesIcon from './ModulesIcon'
import MonolithicIcon from './MonolithicIcon'
import NonStrawbaleIcon from './NonStrawbaleIcon'
import PassageIcon from './PassageIcon'
import PrefabIcon from './PrefabIcon'
import RoofIcon from './RoofIcon'
import StrawbaleIcon from './StrawbaleIcon'
import StrawhengeIcon from './StrawhengeIcon'
import TopPlateIcon from './TopPlateIcon'
import WindowIcon from './WindowIcon'

export function getPerimeterConfigTypeIcon(type: WallAssemblyConfig['type']): ComponentType<IconProps> {
  switch (type) {
    case 'infill':
      return InfillIcon
    case 'strawhenge':
      return StrawhengeIcon
    case 'modules':
      return ModulesIcon
    case 'non-strawbale':
      return NonStrawbaleIcon
    case 'prefab-modules':
      return PrefabIcon
    default:
      return InfillIcon
  }
}

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

export function getRoofAssemblyTypeIcon(type: RoofAssemblyType): ComponentType<IconProps> {
  switch (type) {
    case 'monolithic':
      return MonolithicIcon
    case 'purlin':
      return FilledIcon
  }
}

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

export function getOpeningTypeIcon(type: 'door' | 'window' | 'passage'): ComponentType<IconProps> {
  switch (type) {
    case 'door':
      return DoorIcon
    case 'window':
      return WindowIcon
    case 'passage':
      return PassageIcon
  }
}

export function getWallPlateIcon(position: 'top' | 'base' | 'both'): ComponentType<IconProps> {
  switch (position) {
    case 'top':
      return TopPlateIcon
    case 'base':
      return BasePlateIcon
    case 'both':
      return Model3DIcon
  }
}
