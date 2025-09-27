export { MainToolbar } from '@/editor/toolbar/MainToolbar'
export { PropertiesPanel } from '@/editor/properties/PropertiesPanel'

export {
  useToolStore,
  useActiveTool as useActiveToolNew,
  useActiveToolId as useActiveToolIdNew,
  useCanPopTool,
  useToolStackDepth,
  getActiveTool as getActiveToolNew,
  getActiveToolId as getActiveToolIdNew,
  getPreviousToolId,
  canPopTool,
  getToolStackDepth,
  getToolActions,
  pushTool,
  popTool,
  clearToDefaultTool,
  replaceTool,
  handleCanvasEvent
} from './store/toolStore'

export {
  TOOL_DEFINITIONS,
  TOOL_GROUPS,
  DEFAULT_TOOL,
  type ToolId,
  getToolById,
  getAllTools
} from './store/toolDefinitions'
