import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId } from '@/model'

const STRUCTURAL_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.structural',
  name: 'Structural Wall',
  icon: '▬',
  hotkey: 'w',
  defaultThickness: 220, // 22cm
  primaryColor: '#007acc',
  secondaryColor: '#007acc',
  label: 'Structural'
}

export class StructuralWallTool extends BaseWallTool {
  constructor() {
    super(STRUCTURAL_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): void {
    // Create structural wall using model store
    modelStore.addStructuralWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
