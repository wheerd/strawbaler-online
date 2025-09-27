import {
  AllSidesIcon,
  BorderAllIcon,
  BoxIcon,
  BoxModelIcon,
  CursorArrowIcon,
  MoveIcon,
  RocketIcon,
  TrashIcon
} from '@radix-ui/react-icons'

import { SelectTool } from '../basic/SelectTool'
import { FitToViewTool } from '../basic/fit-to-view/FitToViewTool'
import { MoveTool } from '../basic/movement/MoveTool'
import { AddOpeningTool } from '../perimeter/add-opening/AddOpeningTool'
import { PerimeterTool } from '../perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from '../perimeter/preset/PerimeterPresetTool'
import type { ToolImplementation, ToolMetadata } from '../system/types'
import { ResetTool } from '../test-data/ResetTool'
import { TestDataTool } from '../test-data/TestDataTool'

// Tool metadata - UI display information
export const TOOL_METADATA: Record<ToolId, ToolMetadata> = {
  'basic.select': {
    name: 'Select',
    icon: '↖',
    iconComponent: CursorArrowIcon,
    hotkey: 'v'
  },
  'basic.move': {
    name: 'Move',
    icon: '↔',
    iconComponent: MoveIcon,
    hotkey: 'm'
  },
  'basic.fit-to-view': {
    name: 'Fit to View',
    icon: '⊞',
    iconComponent: AllSidesIcon,
    hotkey: 'f'
  },
  'perimeter.add': {
    name: 'Building Perimeter',
    icon: '⬜',
    iconComponent: BorderAllIcon,
    hotkey: 'w'
  },
  'perimeter.preset': {
    name: 'Perimeter Presets',
    icon: '⬜',
    iconComponent: BoxModelIcon,
    hotkey: 'p'
  },
  'perimeter.add-opening': {
    name: 'Add Opening',
    icon: '🚪',
    iconComponent: BoxIcon,
    hotkey: 'o'
  },
  'test.data': {
    name: 'Test Data',
    icon: '🏗️',
    iconComponent: RocketIcon,
    hotkey: 't'
  },
  'test.reset': {
    name: 'Reset',
    icon: '🗑️',
    iconComponent: TrashIcon,
    hotkey: 'r'
  }
}

// Tool implementations - behavioral logic
export const TOOL_IMPLEMENTATIONS = {
  'basic.select': new SelectTool(),
  'basic.move': new MoveTool(),
  'basic.fit-to-view': new FitToViewTool(),
  'perimeter.add': new PerimeterTool(),
  'perimeter.preset': new PerimeterPresetTool(),
  'perimeter.add-opening': new AddOpeningTool(),
  'test.data': new TestDataTool(),
  'test.reset': new ResetTool()
} as const

// Hardcoded tool groups - no registration needed
export const TOOL_GROUPS = [
  {
    name: 'Basic',
    tools: ['basic.select', 'basic.move', 'basic.fit-to-view'] as const
  },
  {
    name: 'Perimeter',
    tools: ['perimeter.add', 'perimeter.preset', 'perimeter.add-opening'] as const
  },
  {
    name: 'Test Data',
    tools: ['test.data', 'test.reset'] as const
  }
] as const

// Type definitions
export type ToolId = keyof typeof TOOL_IMPLEMENTATIONS

export const DEFAULT_TOOL: ToolId = 'basic.select'

// Helper functions
export function getToolById(toolId: ToolId): ToolImplementation {
  return TOOL_IMPLEMENTATIONS[toolId]
}

export function getToolInfoById(toolId: ToolId): ToolMetadata {
  return TOOL_METADATA[toolId]
}

export function getAllTools(): ToolImplementation[] {
  return Object.values(TOOL_IMPLEMENTATIONS)
}

// Legacy compatibility - keep for now
export const TOOL_DEFINITIONS = TOOL_IMPLEMENTATIONS
