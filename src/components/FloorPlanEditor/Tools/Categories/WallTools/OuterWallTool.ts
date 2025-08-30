import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId } from '@/model'

const OUTER_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.outer',
  name: 'Outer Wall',
  icon: '▬',
  hotkey: 'Shift+Alt+w',
  defaultThickness: 250, // 250mm default for outer walls (thicker than structural)
  defaultMaterial: 'brick',
  primaryColor: '#666666',
  secondaryColor: '#666666',
  label: 'Outer'
}

export class OuterWallTool extends BaseWallTool {
  constructor() {
    super(OUTER_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): void {
    // Create structural wall for now (outer walls use structural wall method)
    modelStore.addStructuralWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
