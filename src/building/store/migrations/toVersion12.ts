import { newVec2 } from '@/shared/geometry'

import { updatePerimeterGeometry } from '../slices/perimeterGeometry'
import type { Migration } from './shared'
import { isRecord, toVec2 } from './shared'

/**
 * Migration to version 12: Normalize perimeter and roof overhang structures
 *
 * Major changes:
 *
 * Perimeters:
 * - Transform nested array-based structure to normalized, ID-based structure
 * - Separate data from geometry into parallel records
 * - Move openings and posts from wall.openings[]/wall.posts[] to top-level records
 * - Add perimeterId, wallId relationships to all entities
 * - Recalculate all geometry using updatePerimeterGeometry()
 *
 * Roofs:
 * - Move overhangs from roof.overhangs[] to top-level roofOverhangs record
 * - Add roofId back-reference to all overhangs
 * - Update roof to use overhangIds instead of overhangs array
 *
 * Old structure:
 * - perimeters[id].walls[] with embedded openings[] and posts[]
 * - perimeters[id].corners[] with embedded geometry
 * - roofs[id].overhangs[] with embedded overhangs
 *
 * New structure:
 * - Normalized entities: perimeters, perimeterWalls, perimeterCorners, openings, wallPosts, roofOverhangs
 * - Separated geometry: _perimeterGeometry, _perimeterWallGeometry, _perimeterCornerGeometry, _openingGeometry, _wallPostGeometry
 */
export const migrateToVersion12: Migration = state => {
  if (!isRecord(state)) return

  // Initialize new normalized state structures
  if (isRecord(state.perimeters)) {
    const newPerimeterWalls: Record<string, any> = {}
    const newPerimeterCorners: Record<string, any> = {}
    const newOpenings: Record<string, any> = {}
    const newWallPosts: Record<string, any> = {}

    // Geometry records (will be recalculated)
    const newPerimeterGeometry: Record<string, any> = {}
    const newPerimeterWallGeometry: Record<string, any> = {}
    const newPerimeterCornerGeometry: Record<string, any> = {}
    const newOpeningGeometry: Record<string, any> = {}
    const newWallPostGeometry: Record<string, any> = {}

    try {
      // Process each perimeter
      for (const perimeter of Object.values(state.perimeters)) {
        if (!isRecord(perimeter)) continue
        if (typeof perimeter.id !== 'string') continue

        // Extract old structure
        const oldWalls = Array.isArray(perimeter.walls) ? perimeter.walls : []
        const oldCorners = Array.isArray(perimeter.corners) ? perimeter.corners : []
        const referenceSide = perimeter.referenceSide === 'outside' ? 'outside' : 'inside'
        const referencePolygon = Array.isArray(perimeter.referencePolygon) ? perimeter.referencePolygon : []

        if (oldWalls.length === 0 || oldCorners.length === 0) continue
        if (oldWalls.length !== oldCorners.length) continue

        const n = oldWalls.length

        // Create corner and wall ID arrays
        const cornerIds: string[] = []
        const wallIds: string[] = []

        for (let i = 0; i < n; i++) {
          const oldCorner = oldCorners[i]
          const oldWall = oldWalls[i]

          if (isRecord(oldCorner) && typeof oldCorner.id === 'string') {
            cornerIds.push(oldCorner.id)
          } else {
            console.warn('Skipping perimeter with invalid corner data')
            continue
          }

          if (isRecord(oldWall) && typeof oldWall.id === 'string') {
            wallIds.push(oldWall.id)
          } else {
            console.warn('Skipping perimeter with invalid wall data')
            continue
          }
        }

        if (cornerIds.length !== n || wallIds.length !== n) continue

        // Migrate corners
        for (let i = 0; i < n; i++) {
          const oldCorner = oldCorners[i]
          if (!isRecord(oldCorner)) continue

          const cornerId = cornerIds[i]
          const previousWallId = wallIds[(i - 1 + n) % n]
          const nextWallId = wallIds[i]

          // Determine reference point based on referenceSide
          const insidePoint = toVec2(oldCorner.insidePoint)
          const outsidePoint = toVec2(oldCorner.outsidePoint)
          let referencePoint = referenceSide === 'inside' ? insidePoint : outsidePoint

          // Fallback to referencePolygon if needed
          if (!referencePoint && referencePolygon[i]) {
            referencePoint = toVec2(referencePolygon[i])
          }

          if (!referencePoint) {
            referencePoint = newVec2(0, 0)
          }

          // Create normalized corner
          newPerimeterCorners[cornerId] = {
            id: cornerId,
            perimeterId: perimeter.id,
            previousWallId,
            nextWallId,
            referencePoint,
            constructedByWall: oldCorner.constructedByWall === 'previous' ? 'previous' : 'next'
          }

          // Placeholder geometry (will be recalculated)
          newPerimeterCornerGeometry[cornerId] = {
            insidePoint: insidePoint || newVec2(0, 0),
            outsidePoint: outsidePoint || newVec2(0, 0),
            interiorAngle: typeof oldCorner.interiorAngle === 'number' ? oldCorner.interiorAngle : 0,
            exteriorAngle: typeof oldCorner.exteriorAngle === 'number' ? oldCorner.exteriorAngle : 0,
            polygon: { points: [] }
          }
        }

        // Migrate walls, openings, and posts
        for (let i = 0; i < n; i++) {
          const oldWall = oldWalls[i]
          if (!isRecord(oldWall)) continue

          const wallId = wallIds[i]
          const startCornerId = cornerIds[i]
          const endCornerId = cornerIds[(i + 1) % n]

          // Extract wall properties
          const thickness = typeof oldWall.thickness === 'number' ? oldWall.thickness : 420
          const wallAssemblyId = oldWall.wallAssemblyId
          const baseRingBeamAssemblyId = oldWall.baseRingBeamAssemblyId
          const topRingBeamAssemblyId = oldWall.topRingBeamAssemblyId

          // Migrate openings
          const oldOpenings = Array.isArray(oldWall.openings) ? oldWall.openings : []
          const openingIds: string[] = []

          for (const oldOpening of oldOpenings) {
            if (!isRecord(oldOpening)) continue
            if (typeof oldOpening.id !== 'string') continue

            const openingId = oldOpening.id
            openingIds.push(openingId)

            newOpenings[openingId] = {
              id: openingId,
              type: 'opening',
              perimeterId: perimeter.id,
              wallId,
              openingType: oldOpening.type || 'door',
              centerOffsetFromWallStart:
                typeof oldOpening.centerOffsetFromWallStart === 'number' ? oldOpening.centerOffsetFromWallStart : 0,
              width: typeof oldOpening.width === 'number' ? oldOpening.width : 0,
              height: typeof oldOpening.height === 'number' ? oldOpening.height : 0,
              sillHeight: typeof oldOpening.sillHeight === 'number' ? oldOpening.sillHeight : undefined,
              openingAssemblyId: oldOpening.openingAssemblyId
            }

            // Placeholder geometry
            newOpeningGeometry[openingId] = {
              insideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
              outsideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
              polygon: { points: [] },
              center: newVec2(0, 0)
            }
          }

          // Migrate posts
          const oldPosts = Array.isArray(oldWall.posts) ? oldWall.posts : []
          const postIds: string[] = []

          for (const oldPost of oldPosts) {
            if (!isRecord(oldPost)) continue
            if (typeof oldPost.id !== 'string') continue

            const postId = oldPost.id
            postIds.push(postId)

            newWallPosts[postId] = {
              id: postId,
              type: 'post',
              perimeterId: perimeter.id,
              wallId,
              postType: oldPost.type || 'center',
              centerOffsetFromWallStart:
                typeof oldPost.centerOffsetFromWallStart === 'number' ? oldPost.centerOffsetFromWallStart : 0,
              width: typeof oldPost.width === 'number' ? oldPost.width : 0,
              thickness: typeof oldPost.thickness === 'number' ? oldPost.thickness : 0,
              replacesPosts: oldPost.replacesPosts === true,
              material: oldPost.material,
              infillMaterial: oldPost.infillMaterial
            }

            // Placeholder geometry
            newWallPostGeometry[postId] = {
              insideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
              outsideLine: { start: newVec2(0, 0), end: newVec2(0, 0) },
              polygon: { points: [] },
              center: newVec2(0, 0)
            }
          }

          // Create entityIds by concatenating openings and posts
          const entityIds = [...openingIds, ...postIds]

          // Create normalized wall
          const newWall: any = {
            id: wallId,
            perimeterId: perimeter.id,
            startCornerId,
            endCornerId,
            entityIds,
            thickness,
            wallAssemblyId
          }

          if (baseRingBeamAssemblyId) {
            newWall.baseRingBeamAssemblyId = baseRingBeamAssemblyId
          }
          if (topRingBeamAssemblyId) {
            newWall.topRingBeamAssemblyId = topRingBeamAssemblyId
          }

          newPerimeterWalls[wallId] = newWall

          // Placeholder wall geometry
          const insideLine = isRecord(oldWall.insideLine) ? oldWall.insideLine : {}
          const outsideLine = isRecord(oldWall.outsideLine) ? oldWall.outsideLine : {}

          newPerimeterWallGeometry[wallId] = {
            insideLength: typeof oldWall.insideLength === 'number' ? oldWall.insideLength : 0,
            outsideLength: typeof oldWall.outsideLength === 'number' ? oldWall.outsideLength : 0,
            wallLength: typeof oldWall.wallLength === 'number' ? oldWall.wallLength : 0,
            insideLine: {
              start: toVec2(insideLine.start) || newVec2(0, 0),
              end: toVec2(insideLine.end) || newVec2(0, 0)
            },
            outsideLine: {
              start: toVec2(outsideLine.start) || newVec2(0, 0),
              end: toVec2(outsideLine.end) || newVec2(0, 0)
            },
            direction: toVec2(oldWall.direction) || newVec2(1, 0),
            outsideDirection: toVec2(oldWall.outsideDirection) || newVec2(0, 1),
            polygon: { points: [] }
          }
        }

        // Update perimeter structure (cast to any to avoid branded type issues in migration)
        perimeter.wallIds = wallIds as any
        perimeter.cornerIds = cornerIds as any
        perimeter.intermediateWallIds = []
        perimeter.wallNodeIds = []
        perimeter.roomIds = []

        // Placeholder perimeter geometry
        newPerimeterGeometry[perimeter.id] = {
          innerPolygon: { points: [] },
          outerPolygon: { points: [] }
        }

        // Remove old properties
        delete perimeter.walls
        delete perimeter.corners
        delete perimeter.referencePolygon
      }

      // Assign new normalized structures to state
      state.perimeterWalls = newPerimeterWalls
      state._perimeterWallGeometry = newPerimeterWallGeometry
      state.perimeterCorners = newPerimeterCorners
      state._perimeterCornerGeometry = newPerimeterCornerGeometry
      state.openings = newOpenings
      state._openingGeometry = newOpeningGeometry
      state.wallPosts = newWallPosts
      state._wallPostGeometry = newWallPostGeometry
      state._perimeterGeometry = newPerimeterGeometry

      // Recalculate geometry for all perimeters
      for (const perimeter of Object.values(state.perimeters)) {
        if (!isRecord(perimeter)) continue
        if (typeof perimeter.id !== 'string') continue

        try {
          // Cast state to PerimetersState for geometry calculation
          updatePerimeterGeometry(state as any, perimeter.id)
        } catch (error) {
          console.error(`Failed to recalculate geometry for perimeter ${perimeter.id}:`, error)
          // Continue with other perimeters even if one fails
        }
      }
    } catch (error) {
      // If migration fails catastrophically, reset the store
      console.error('Migration to version 12 failed, resetting perimeter data:', error)
      state.perimeters = {}
      state.perimeterWalls = {}
      state._perimeterWallGeometry = {}
      state.perimeterCorners = {}
      state._perimeterCornerGeometry = {}
      state.openings = {}
      state._openingGeometry = {}
      state.wallPosts = {}
      state._wallPostGeometry = {}
      state._perimeterGeometry = {}
    }
  }

  // Migrate roofs: normalize overhang structure
  if (isRecord(state.roofs)) {
    const newRoofOverhangs: Record<string, any> = {}

    try {
      for (const roof of Object.values(state.roofs)) {
        if (!isRecord(roof)) continue
        if (typeof roof.id !== 'string') continue

        // Extract old overhangs array
        const oldOverhangs = Array.isArray(roof.overhangs) ? roof.overhangs : []
        const overhangIds: string[] = []

        for (const oldOverhang of oldOverhangs) {
          if (!isRecord(oldOverhang)) continue
          if (typeof oldOverhang.id !== 'string') continue

          const overhangId = oldOverhang.id
          overhangIds.push(overhangId)

          // Create normalized overhang (keep all properties including geometry)
          newRoofOverhangs[overhangId] = {
            id: overhangId,
            roofId: roof.id,
            sideIndex: typeof oldOverhang.sideIndex === 'number' ? oldOverhang.sideIndex : 0,
            value: typeof oldOverhang.value === 'number' ? oldOverhang.value : 0,
            area: isRecord(oldOverhang.area) && Array.isArray(oldOverhang.area.points) ? oldOverhang.area : { points: [] }
          }
        }

        // Update roof to use overhangIds instead of overhangs array
        roof.overhangIds = overhangIds as any
        delete roof.overhangs
      }

      // Assign new normalized structure to state
      state.roofOverhangs = newRoofOverhangs
    } catch (error) {
      console.error('Migration to version 12 failed for roofs, resetting roof data:', error)
      state.roofs = {}
      state.roofOverhangs = {}
    }
  }
}
