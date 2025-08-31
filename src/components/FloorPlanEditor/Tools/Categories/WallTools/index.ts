import type { ToolGroup } from '../../ToolSystem/types'
import { StructuralWallTool } from './StructuralWallTool'
import { PartitionWallTool } from './PartitionWallTool'
import { OuterWallTool } from './OuterWallTool'
import { OtherWallTool } from './OtherWallTool'

// Export individual tools
export { StructuralWallTool } from './StructuralWallTool'
export { PartitionWallTool } from './PartitionWallTool'
export { OuterWallTool } from './OuterWallTool'
export { OtherWallTool } from './OtherWallTool'
export { BaseWallTool, type WallToolState, type WallTypeConfig } from './BaseWallTool'

// Create and export tool group
export const createWallToolGroup = (): ToolGroup => ({
  id: 'walls',
  name: 'Walls',
  icon: '▬',
  category: 'walls',
  tools: [new StructuralWallTool(), new PartitionWallTool(), new OuterWallTool(), new OtherWallTool()],
  defaultTool: 'wall.structural'
})

// Export as default tool group
export const wallToolGroup = createWallToolGroup()
