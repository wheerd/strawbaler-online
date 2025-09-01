import type { ToolGroup } from '../../ToolSystem/types'
import { OuterWallPolygonTool } from './OuterWallPolygonTool'

// Export individual tools
export { OuterWallPolygonTool } from './OuterWallPolygonTool'

// Create and export tool group
export const createOuterWallToolGroup = (): ToolGroup => ({
  id: 'outer-walls',
  name: 'Outer Walls',
  icon: '⬜',
  category: 'outer-walls',
  tools: [new OuterWallPolygonTool()],
  defaultTool: 'outer-wall-polygon'
})

// Export as default tool group
export const outerWallToolGroup = createOuterWallToolGroup()
