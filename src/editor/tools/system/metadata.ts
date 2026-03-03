import { BetweenVerticalStart, MousePointer, Move, Rocket } from 'lucide-react'

import {
  FloorAreaIcon,
  FloorOpeningIcon,
  OpeningsIcon,
  PerimeterDrawIcon,
  PerimeterPresetsIcon,
  RoofIcon,
  SplitWallIcon
} from '@/shared/ui/icons'

import type { ToolId, ToolMetadata } from './types'

export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  'basic.select': {
    nameKey: 'basicSelect',
    iconComponent: MousePointer,
    hotkey: 'v'
  },
  'basic.move': {
    nameKey: 'basicMove',
    iconComponent: Move,
    hotkey: 'm'
  },
  'floors.add-area': {
    nameKey: 'floorsAddArea',
    iconComponent: FloorAreaIcon
  },
  'floors.add-opening': {
    nameKey: 'floorsAddOpening',
    iconComponent: FloorOpeningIcon
  },
  'perimeter.add': {
    nameKey: 'perimeterAdd',
    iconComponent: PerimeterDrawIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    nameKey: 'perimeterPreset',
    iconComponent: PerimeterPresetsIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    nameKey: 'perimeterAddOpening',
    iconComponent: OpeningsIcon,
    hotkey: 'o'
  },
  'perimeter.add-post': {
    nameKey: 'perimeterAddPost',
    iconComponent: BetweenVerticalStart,
    hotkey: 'shift+p'
  },
  'perimeter.split-wall': {
    nameKey: 'perimeterSplitWall',
    iconComponent: SplitWallIcon,
    hotkey: 's'
  },
  'roofs.add-roof': {
    nameKey: 'roofsAddRoof',
    iconComponent: RoofIcon,
    hotkey: 'r'
  },
  'test.data': {
    nameKey: 'testData',
    iconComponent: Rocket,
    hotkey: 't'
  }
} as const

export const DEFAULT_TOOL: ToolId = 'basic.select'

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}
