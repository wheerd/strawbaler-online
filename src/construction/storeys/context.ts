import type { Storey } from '@/building/model'
import type { FloorAssemblyConfig } from '@/construction/config'
import { FLOOR_ASSEMBLIES } from '@/construction/floors'
import type { PerimeterConstructionContext } from '@/construction/perimeters/context'
import { getStoreyCeilingHeight } from '@/construction/storeys/storeyHeight'
import type { Length } from '@/shared/geometry'

export interface StoreyContext {
  floorConstructionThickness: Length
  ceilingBottomOffset: Length
  ceilingBottomConstructionOffset: Length
  storeyHeight: Length
  ceilingHeight: Length
  floorTopOffset: Length
  floorTopConstructionOffset: Length
  perimeterContexts: PerimeterConstructionContext[]
}

export function createWallStoreyContext(
  currentStorey: Storey,
  currentFloorAssembly: FloorAssemblyConfig,
  nextFloorAssembly: FloorAssemblyConfig | null,
  perimeterContexts: PerimeterConstructionContext[]
): StoreyContext {
  const currentFloorFloorAssembly = FLOOR_ASSEMBLIES[currentFloorAssembly.type]
  const nextFloorFloorAssembly = nextFloorAssembly ? FLOOR_ASSEMBLIES[nextFloorAssembly.type] : null

  const topOffset = currentFloorFloorAssembly.getTopOffset(currentFloorAssembly)
  const bottomOffset = nextFloorFloorAssembly?.getBottomOffset(nextFloorAssembly) ?? 0

  return {
    storeyHeight: currentStorey.floorHeight,
    floorConstructionThickness: currentFloorFloorAssembly.getConstructionThickness(currentFloorAssembly),
    ceilingHeight: getStoreyCeilingHeight(currentStorey, nextFloorAssembly),
    floorTopConstructionOffset: topOffset,
    floorTopOffset: currentFloorAssembly.layers.topThickness + topOffset,
    ceilingBottomConstructionOffset: bottomOffset,
    ceilingBottomOffset: (nextFloorAssembly?.layers.bottomThickness ?? 0) + bottomOffset,
    perimeterContexts
  }
}
