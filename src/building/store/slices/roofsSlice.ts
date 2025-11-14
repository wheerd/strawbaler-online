import { vec2 } from 'gl-matrix'
import type { StateCreator } from 'zustand'

import type { PerimeterId, RoofAssemblyId, RoofId, StoreyId } from '@/building/model/ids'
import { createRoofId } from '@/building/model/ids'
import type { Roof, RoofType } from '@/building/model/model'
import type { Length, Polygon2D } from '@/shared/geometry'
import { ensurePolygonIsClockwise, wouldClosingPolygonSelfIntersect } from '@/shared/geometry'

export interface RoofsState {
  roofs: Record<RoofId, Roof>
}

export interface RoofsActions {
  addRoof: (
    storeyId: StoreyId,
    type: RoofType,
    polygon: Polygon2D,
    direction: vec2,
    slope: number,
    ridgeHeight: Length,
    overhang: Length,
    assemblyId: RoofAssemblyId,
    referencePerimeter?: PerimeterId
  ) => Roof

  removeRoof: (roofId: RoofId) => void

  updateRoofOverhang: (roofId: RoofId, sideIndex: number, overhang: Length) => boolean

  updateRoofProperties: (
    roofId: RoofId,
    updates: {
      slope?: number
      direction?: vec2
      ridgeHeight?: Length
      assemblyId?: RoofAssemblyId
    }
  ) => boolean

  updateRoofArea: (roofId: RoofId, newPolygon: Polygon2D) => boolean

  getRoofById: (roofId: RoofId) => Roof | null
  getRoofsByStorey: (storeyId: StoreyId) => Roof[]
}

export type RoofsSlice = RoofsState & { actions: RoofsActions }

// Helper function
const ensureRoofPolygon = (polygon: Polygon2D): Polygon2D => {
  if (polygon.points.length < 3) {
    throw new Error('Roof polygon must have at least 3 points')
  }

  if (wouldClosingPolygonSelfIntersect(polygon)) {
    throw new Error('Roof polygon must not self-intersect')
  }

  // Normalize to clockwise
  return ensurePolygonIsClockwise(polygon)
}

export const createRoofsSlice: StateCreator<RoofsSlice, [['zustand/immer', never]], [], RoofsSlice> = (set, get) => ({
  roofs: {},

  actions: {
    addRoof: (
      storeyId: StoreyId,
      type: RoofType,
      polygon: Polygon2D,
      direction: vec2,
      slope: number,
      ridgeHeight: Length,
      overhang: Length,
      assemblyId: RoofAssemblyId,
      referencePerimeter?: PerimeterId
    ) => {
      const validatedPolygon = ensureRoofPolygon(polygon)

      // Validate slope
      if (slope < 0 || slope > 90) {
        throw new Error('Roof slope must be between 0 and 90 degrees')
      }

      // Validate ridge height
      if (ridgeHeight < 0) {
        throw new Error('Ridge height must be non-negative')
      }

      // Validate overhang
      if (overhang < 0) {
        throw new Error('Overhang must be non-negative')
      }

      // Note: Reference perimeter validation is deferred to runtime usage
      // The store structure doesn't allow cross-slice validation during creation

      // Create overhang array with same value for all sides
      const overhangArray = new Array(validatedPolygon.points.length).fill(overhang)

      let roof: Roof | undefined

      set(state => {
        roof = {
          id: createRoofId(),
          storeyId,
          type,
          area: validatedPolygon,
          direction: vec2.clone(direction),
          slope,
          ridgeHeight,
          overhang: overhangArray,
          assemblyId,
          referencePerimeter
        }

        state.roofs[roof.id] = roof
      })

      if (!roof) {
        throw new Error('Failed to create roof')
      }
      return roof
    },

    removeRoof: (roofId: RoofId) => {
      set(state => {
        const { [roofId]: _removed, ...remainingRoofs } = state.roofs
        state.roofs = remainingRoofs
      })
    },

    updateRoofOverhang: (roofId: RoofId, sideIndex: number, overhang: Length): boolean => {
      if (overhang < 0) {
        throw new Error('Overhang must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        // Validate index
        if (sideIndex < 0 || sideIndex >= roof.overhang.length) {
          return
        }

        roof.overhang[sideIndex] = overhang
        success = true
      })
      return success
    },

    updateRoofProperties: (
      roofId: RoofId,
      updates: {
        slope?: number
        direction?: vec2
        ridgeHeight?: Length
        assemblyId?: RoofAssemblyId
      }
    ): boolean => {
      // Validate slope if provided
      if (updates.slope !== undefined && (updates.slope < 0 || updates.slope > 90)) {
        throw new Error('Roof slope must be between 0 and 90 degrees')
      }

      // Validate ridge height if provided
      if (updates.ridgeHeight !== undefined && updates.ridgeHeight < 0) {
        throw new Error('Ridge height must be non-negative')
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        // Apply partial updates
        if (updates.slope !== undefined) {
          roof.slope = updates.slope
        }
        if (updates.direction !== undefined) {
          roof.direction = vec2.clone(updates.direction)
        }
        if (updates.ridgeHeight !== undefined) {
          roof.ridgeHeight = updates.ridgeHeight
        }
        if (updates.assemblyId !== undefined) {
          roof.assemblyId = updates.assemblyId
        }

        success = true
      })

      return success
    },

    updateRoofArea: (roofId: RoofId, newPolygon: Polygon2D): boolean => {
      const validatedPolygon = ensureRoofPolygon(newPolygon)

      const roof = get().roofs[roofId]
      if (!roof) {
        return false
      }

      const currentSideCount = roof.area.points.length
      const newSideCount = validatedPolygon.points.length

      // Reject if point count changed
      if (currentSideCount !== newSideCount) {
        throw new Error(`Cannot change roof polygon point count (current: ${currentSideCount}, new: ${newSideCount})`)
      }

      let success = false
      set(state => {
        const roof = state.roofs[roofId]
        if (!roof) return

        roof.area = validatedPolygon
        success = true
      })

      return success
    },

    getRoofById: (roofId: RoofId) => {
      return get().roofs[roofId] ?? null
    },

    getRoofsByStorey: (storeyId: StoreyId) => {
      return Object.values(get().roofs).filter(roof => roof.storeyId === storeyId)
    }
  }
})
