import { CursorArrowIcon, MoveIcon, RocketIcon, StretchVerticallyIcon } from '@radix-ui/react-icons'

import {
  FitToViewIcon,
  FloorAreaIcon,
  FloorOpeningIcon,
  OpeningsIcon,
  PerimeterDrawIcon,
  PerimeterPresetsIcon,
  RoofIcon,
  SplitWallIcon
} from '@/shared/components/Icons'

import type { ToolGroup, ToolId, ToolMetadata } from './types'

export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  'basic.select': {
    nameKey: 'basic.select',
    iconComponent: CursorArrowIcon,
    hotkey: 'v'
  },
  'basic.move': {
    nameKey: 'basic.move',
    iconComponent: MoveIcon,
    hotkey: 'm'
  },
  'basic.fit-to-view': {
    nameKey: 'basic.fit-to-view',
    iconComponent: FitToViewIcon,
    hotkey: 'f'
  },
  'floors.add-area': {
    nameKey: 'floors.add-area',
    iconComponent: FloorAreaIcon
  },
  'floors.add-opening': {
    nameKey: 'floors.add-opening',
    iconComponent: FloorOpeningIcon
  },
  'perimeter.add': {
    nameKey: 'perimeter.add',
    iconComponent: PerimeterDrawIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    nameKey: 'perimeter.preset',
    iconComponent: PerimeterPresetsIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    nameKey: 'perimeter.add-opening',
    iconComponent: OpeningsIcon,
    hotkey: 'o'
  },
  'perimeter.add-post': {
    nameKey: 'perimeter.add-post',
    iconComponent: StretchVerticallyIcon,
    hotkey: 'shift+p'
  },
  'perimeter.split-wall': {
    nameKey: 'perimeter.split-wall',
    iconComponent: SplitWallIcon,
    hotkey: 's'
  },
  'roofs.add-roof': {
    nameKey: 'roofs.add-roof',
    iconComponent: RoofIcon,
    hotkey: 'r'
  },
  'test.data': {
    nameKey: 'test.data',
    iconComponent: RocketIcon,
    hotkey: 't'
  }
} as const

export const TOOL_GROUPS: ToolGroup[] = [
  {
    nameKey: 'basic',
    tools: ['basic.select', 'basic.move', 'basic.fit-to-view'] as const
  },
  {
    nameKey: 'perimeter',
    tools: [
      'perimeter.add',
      'perimeter.preset',
      'perimeter.add-opening',
      'perimeter.add-post',
      'perimeter.split-wall'
    ] as const
  },
  {
    nameKey: 'floors',
    tools: ['floors.add-opening'] as const
  },
  {
    nameKey: 'roofs',
    tools: ['roofs.add-roof'] satisfies ToolId[]
  },
  {
    nameKey: 'test',
    tools: ['test.data'] as const
  }
] as const

export const DEFAULT_TOOL: ToolId = 'basic.select'

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}
