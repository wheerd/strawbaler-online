import type { PerimeterCornerId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { getConfigActions } from '@/construction/config'
import type { ConstructionModel } from '@/construction/model'
import type { Length } from '@/shared/geometry'

import { WALL_ASSEMBLIES } from './index'
import { createWallStoreyContext } from './segmentation'

export interface WallCornerInfo {
  startCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  endCorner: {
    id: PerimeterCornerId
    constructedByThisWall: boolean
    extensionDistance: Length
  }
  extensionStart: Length
  constructionLength: Length
  extensionEnd: Length
}

export function constructWall(perimeterId: PerimeterId, wallId: PerimeterWallId): ConstructionModel {
  const { getPerimeterById, getStoreyById, getStoreysOrderedByLevel } = getModelActions()
  const { getWallAssemblyById, getFloorAssemblyById } = getConfigActions()

  const perimeter = getPerimeterById(perimeterId)
  if (!perimeter) {
    throw new Error(`Perimeter with ID ${perimeterId} not found`)
  }

  const wall = perimeter.walls.find(w => w.id === wallId)
  if (!wall) {
    throw new Error(`Wall with ID ${wallId} not found in perimeter ${perimeterId}`)
  }

  const storey = getStoreyById(perimeter.storeyId)
  if (!storey) {
    throw new Error(`Storey with ID ${perimeter.storeyId} not found for perimeter ${perimeterId}`)
  }

  const assembly = getWallAssemblyById(wall.wallAssemblyId)
  if (!assembly?.type) {
    throw new Error(`Wall assembly with ID ${wall.wallAssemblyId} not found for wall ${wallId}`)
  }

  const wallAssembly = WALL_ASSEMBLIES[assembly.type]
  if (!wallAssembly) {
    throw new Error(`Wall assembly type ${assembly.type} is not registered`)
  }

  const currentFloorAssembly = getFloorAssemblyById(storey.floorAssemblyId)
  if (!currentFloorAssembly) {
    throw new Error(`Floor assembly with ID ${storey.floorAssemblyId} not found for storey ${storey.id}`)
  }

  const allStoreys = getStoreysOrderedByLevel()
  const currentIndex = allStoreys.findIndex(s => s.id === storey.id)
  const nextStorey = currentIndex >= 0 && currentIndex < allStoreys.length - 1 ? allStoreys[currentIndex + 1] : null
  const nextFloorAssembly = nextStorey ? getFloorAssemblyById(nextStorey.floorAssemblyId) : null

  const storeyContext = createWallStoreyContext(storey, currentFloorAssembly, nextFloorAssembly)

  return wallAssembly.construct(wall, perimeter, storeyContext, assembly)
}
