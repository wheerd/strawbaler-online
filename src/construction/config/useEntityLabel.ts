import { useTranslation } from 'react-i18next'

import type {
  FloorAssemblyId,
  OpeningAssemblyId,
  RingBeamAssemblyId,
  RoofAssemblyId,
  StoreyId,
  WallAssemblyId
} from '@/building/model/ids'
import { useStoreysOrderedByLevel } from '@/building/store'
import type { MaterialId } from '@/construction/materials/material'
import { useMaterials } from '@/construction/materials/store'

import {
  useFloorAssemblies,
  useOpeningAssemblies,
  useRingBeamAssemblies,
  useRoofAssemblies,
  useWallAssemblies
} from './store'

export type EntityId =
  | StoreyId
  | RingBeamAssemblyId
  | WallAssemblyId
  | FloorAssemblyId
  | RoofAssemblyId
  | OpeningAssemblyId
  | MaterialId

/**
 * Hook that returns a function to get display labels for any entity ID.
 * Handles storeys, assemblies, and materials.
 * Returns the entity name, or translated "Unknown" if not found.
 */
export function useEntityLabel(): (id: EntityId | undefined) => string {
  const { t } = useTranslation('config')
  const storeys = useStoreysOrderedByLevel()
  const ringBeams = useRingBeamAssemblies()
  const walls = useWallAssemblies()
  const floors = useFloorAssemblies()
  const roofs = useRoofAssemblies()
  const openings = useOpeningAssemblies()
  const materials = useMaterials()

  return (id: EntityId | undefined): string => {
    if (!id) return t($ => $.usage.unknown)

    // Try each collection
    const storey = storeys.find(s => s.id === id)
    if (storey) return storey.name

    const ringBeam = ringBeams.find(a => a.id === id)
    if (ringBeam) return ringBeam.name

    const wall = walls.find(a => a.id === id)
    if (wall) return wall.name

    const floor = floors.find(a => a.id === id)
    if (floor) return floor.name

    const roof = roofs.find(a => a.id === id)
    if (roof) return roof.name

    const opening = openings.find(a => a.id === id)
    if (opening) return opening.name

    const material = materials.find(m => m.id === id)
    if (material) return material.name

    return t($ => $.usage.unknown)
  }
}
