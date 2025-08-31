import { BaseWallTool, type WallTypeConfig } from './BaseWallTool'
import { createLength } from '@/types/geometry'
import type { StoreActions, FloorId, PointId } from '@/model'

const PARTITION_WALL_CONFIG: WallTypeConfig = {
  id: 'wall.partition',
  name: 'Partition Wall',
  icon: '▬',
  hotkey: 'Shift+w',
  defaultThickness: 180, // 18cm
  primaryColor: '#DAA520',
  secondaryColor: '#8B4513',
  label: 'Partition'
}

export class PartitionWallTool extends BaseWallTool {
  constructor() {
    super(PARTITION_WALL_CONFIG)
  }

  protected createWall(
    modelStore: StoreActions,
    activeFloorId: FloorId,
    startPointId: PointId,
    endPointId: PointId,
    thickness: number
  ): void {
    // Create partition wall using model store
    modelStore.addPartitionWall(activeFloorId, startPointId, endPointId, createLength(thickness))
  }
}
