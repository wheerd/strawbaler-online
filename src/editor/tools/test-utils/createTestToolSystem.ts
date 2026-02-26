import { SelectTool } from '@/editor/tools/basic/SelectTool'
import { FitToViewTool } from '@/editor/tools/basic/fit-to-view/FitToViewTool'
import { MoveTool } from '@/editor/tools/basic/movement/MoveTool'
import { FloorAreaTool } from '@/editor/tools/floors/add-area/FloorAreaTool'
import { FloorOpeningTool } from '@/editor/tools/floors/add-opening/FloorOpeningTool'
import { AddOpeningTool } from '@/editor/tools/perimeter/add-opening/AddOpeningTool'
import { AddPostTool } from '@/editor/tools/perimeter/add-post/AddPostTool'
import { PerimeterTool } from '@/editor/tools/perimeter/add/PerimeterTool'
import { PerimeterPresetTool } from '@/editor/tools/perimeter/preset/PerimeterPresetTool'
import { SplitWallTool } from '@/editor/tools/perimeter/split/SplitWallTool'
import { RoofTool } from '@/editor/tools/roofs/RoofTool'
import { ToolSystem } from '@/editor/tools/system/ToolSystem'
import { TestDataTool } from '@/editor/tools/test-data/TestDataTool'

export function createTestToolSystem(): ToolSystem {
  const system = new ToolSystem()

  system.registerTool(SelectTool)
  system.registerTool(MoveTool)
  system.registerTool(FitToViewTool)
  system.registerTool(FloorAreaTool)
  system.registerTool(FloorOpeningTool)
  system.registerTool(PerimeterTool)
  system.registerTool(PerimeterPresetTool)
  system.registerTool(AddOpeningTool)
  system.registerTool(AddPostTool)
  system.registerTool(SplitWallTool)
  system.registerTool(RoofTool)
  system.registerTool(TestDataTool)

  return system
}
