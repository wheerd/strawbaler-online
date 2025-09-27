import { SelectTool } from '../basic/SelectTool'
import { FitToViewTool } from '../basic/fit-to-view/FitToViewTool'
import { MoveTool } from '../basic/movement/MoveTool'
import { AddOpeningTool } from '../perimeter/add-opening/AddOpeningTool'
import { PerimeterTool } from '../perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from '../perimeter/preset/PerimeterPresetTool'
import type { Tool } from '../system/types'
import { ResetTool } from '../test-data/ResetTool'
import { TestDataTool } from '../test-data/TestDataTool'

// Hardcoded tool definitions - no registration needed
export const TOOL_DEFINITIONS = {
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
export type ToolId = keyof typeof TOOL_DEFINITIONS

export const DEFAULT_TOOL: ToolId = 'basic.select'

// Helper functions
export function getToolById(toolId: ToolId): Tool {
  return TOOL_DEFINITIONS[toolId]
}

export function getAllTools(): Tool[] {
  return Object.values(TOOL_DEFINITIONS)
}
