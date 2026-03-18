import type { PerimeterWallWithGeometry } from '@/building/model'
import { getLayerSetById } from '@/config/store'
import {
  type AssemblyPhysicsStructure,
  type PhysicsItem,
  type PhysicsPath,
  layerToPhysicsItems
} from '@/construction/assemblies/physics'
import type { StoreyContext } from '@/construction/context/storeys'
import type { ConstructionModel } from '@/construction/model/model'
import type { Tag } from '@/construction/model/tags'
import type { ThicknessRange } from '@/materials/thickness'
import type { Length } from '@/shared/geometry'

import type { WallAssembly, WallBaseConfig } from './types'

export abstract class BaseWallAssembly<T extends WallBaseConfig> implements WallAssembly {
  protected readonly config: T

  constructor(config: T) {
    this.config = config
  }

  abstract construct(wall: PerimeterWallWithGeometry, storeyContext: StoreyContext): ConstructionModel

  abstract get tag(): Tag

  abstract get thicknessRange(): ThicknessRange

  abstract getCorePhysicsStructure(coreThickness: Length, height: Length): PhysicsPath[]

  getPhysicsStructure(totalThickness: Length, height: Length): AssemblyPhysicsStructure {
    return {
      inside: this.getInsidePhysicsItems(),
      core: this.getCorePhysicsStructure(totalThickness, height),
      outside: this.getOutsidePhysicsItems()
    }
  }

  protected getInsidePhysicsItems(): PhysicsItem[] {
    const layers = getLayerSetById(this.config.insideLayerSetId)?.layers ?? []
    if (layers.length === 0) return []
    return layers.flatMap(layer => layerToPhysicsItems(layer))
  }

  protected getOutsidePhysicsItems(): PhysicsItem[] {
    const layers = getLayerSetById(this.config.outsideLayerSetId)?.layers ?? []
    if (layers.length === 0) return []
    return layers.flatMap(layer => layerToPhysicsItems(layer))
  }
}
