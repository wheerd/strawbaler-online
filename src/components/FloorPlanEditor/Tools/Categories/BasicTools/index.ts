import type { ToolGroup } from '../../ToolSystem/types'
import { SelectTool } from './SelectTool'
import { MoveTool } from './MoveTool'
import { RotateTool } from './RotateTool'

// Export individual tools
export { SelectTool } from './SelectTool'
export { MoveTool } from './MoveTool'
export { RotateTool } from './RotateTool'
export type { RotateToolState } from './RotateTool'

// Create and export tool group
export const createBasicToolGroup = (): ToolGroup => ({
  id: 'basic',
  name: 'Basic',
  icon: '↖',
  category: 'basic',
  tools: [new SelectTool(), new MoveTool(), new RotateTool()],
  defaultTool: 'basic.select'
})

// Export as default tool group
export const basicToolGroup = createBasicToolGroup()
