import type { ToolGroup } from '../../ToolSystem/types'
import { StructuralWallTool } from './StructuralWallTool'
import { PartitionWallTool } from './PartitionWallTool'

// Export individual tools
export { StructuralWallTool } from './StructuralWallTool'
export { PartitionWallTool } from './PartitionWallTool'
export type { StructuralWallToolState } from './StructuralWallTool'
export type { PartitionWallToolState } from './PartitionWallTool'

// For now, let's implement basic outer wall as a variant of structural wall
export class OuterWallTool extends StructuralWallTool {
  id = 'wall.outer'
  name = 'Outer Wall'
  icon = '▬'

  constructor() {
    super()
    this.state = {
      ...this.state,
      thickness: 250, // Outer walls are typically thicker
      material: 'brick'
    }
  }

  // Override context actions for outer wall
  getContextActions() {
    const actions = super.getContextActions()
    return actions.map(action => {
      if (action.label === 'Switch to Outer Wall') {
        return {
          ...action,
          label: 'Switch to Structural Wall'
        }
      }
      return action
    })
  }
}

// Create and export tool group
export const createWallToolGroup = (): ToolGroup => ({
  id: 'walls',
  name: 'Walls',
  icon: '▬',
  category: 'walls',
  tools: [new StructuralWallTool(), new PartitionWallTool(), new OuterWallTool()],
  defaultTool: 'wall.structural'
})

// Export as default tool group
export const wallToolGroup = createWallToolGroup()
