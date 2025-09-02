import type { StateCreator } from 'zustand'
import type { OuterWallPolygon, OuterWallConstructionType, OuterWallSegment, Opening, OuterCorner } from '@/types/model'
import type { FloorId, OuterWallId, WallSegmentId, OuterCornerId, OpeningId } from '@/types/ids'
import type { Length, Polygon2D, Vec2, LineSegment2D } from '@/types/geometry'
import { createOuterWallId, createWallSegmentId, createOuterCornerId, createOpeningId } from '@/types/ids'
import { createLength, createVec2, lineIntersection, lineFromSegment, midpoint } from '@/types/geometry'

export interface OuterWallsState {
  outerWalls: Map<OuterWallId, OuterWallPolygon>
}

export interface OuterWallsActions {
  addOuterWallPolygon: (
    floorId: FloorId,
    boundary: Polygon2D,
    constructionType: OuterWallConstructionType,
    thickness?: Length
  ) => void
  removeOuterWall: (wallId: OuterWallId) => void

  // Updated to use IDs instead of indices
  updateOuterWallConstructionType: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    type: OuterWallConstructionType
  ) => void
  updateOuterWallThickness: (wallId: OuterWallId, segmentId: WallSegmentId, thickness: Length) => void
  updateCornerBelongsTo: (wallId: OuterWallId, cornerId: OuterCornerId, belongsTo: 'previous' | 'next') => void

  // Updated opening actions with ID-based approach and auto-ID generation
  addOpeningToOuterWall: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingParams: Omit<Opening, 'id'>
  ) => OpeningId
  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => void
  updateOpening: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingId: OpeningId,
    updates: Partial<Omit<Opening, 'id'>>
  ) => void

  // Updated getters
  getOuterWallById: (wallId: OuterWallId) => OuterWallPolygon | null
  getSegmentById: (wallId: OuterWallId, segmentId: WallSegmentId) => OuterWallSegment | null
  getCornerById: (wallId: OuterWallId, cornerId: OuterCornerId) => OuterCorner | null
  getOpeningById: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => Opening | null
  getOuterWallsByFloor: (floorId: FloorId) => OuterWallPolygon[]
}

export type OuterWallsSlice = OuterWallsState & OuterWallsActions

// Default wall thickness value
const DEFAULT_OUTER_WALL_THICKNESS = createLength(440) // 44cm for strawbale walls

// Helper function to calculate corner outside point using already computed segment outside lines
const calculateCornerOutsidePoint = (
  previousSegment: OuterWallSegment,
  nextSegment: OuterWallSegment,
  boundaryPoint: Vec2
): Vec2 => {
  // Convert the outside line segments to infinite lines for intersection
  const prevOutsideLine = lineFromSegment(previousSegment.outsideLine)
  const nextOutsideLine = lineFromSegment(nextSegment.outsideLine)

  if (!prevOutsideLine || !nextOutsideLine) {
    // Fallback for degenerate case
    return createVec2(boundaryPoint[0], boundaryPoint[1])
  }

  // Find intersection of the two outside lines
  const intersection = lineIntersection(prevOutsideLine, nextOutsideLine)

  if (intersection) {
    return intersection
  }

  // Fallback: use average of the outside line endpoints closest to the corner
  const prevEnd = previousSegment.outsideLine.end
  const nextStart = nextSegment.outsideLine.start
  return midpoint(prevEnd, nextStart)
}

// Helper function to create corners from boundary points and segments
const createCornersFromBoundary = (
  boundary: Polygon2D,
  segments: OuterWallSegment[],
  existingCorners?: OuterCorner[]
): OuterCorner[] => {
  const corners: OuterCorner[] = []

  for (let i = 0; i < boundary.points.length; i++) {
    const prevIndex = (i - 1 + boundary.points.length) % boundary.points.length
    const currentPoint = boundary.points[i]

    const previousSegment = segments[prevIndex]
    const nextSegment = segments[i]

    const outsidePoint = calculateCornerOutsidePoint(previousSegment, nextSegment, currentPoint)

    // Preserve existing corner data if available, otherwise create new
    const existingCorner = existingCorners?.[i]
    corners.push({
      id: existingCorner?.id ?? createOuterCornerId(),
      outsidePoint,
      belongsTo: existingCorner?.belongsTo ?? 'next' // Use existing or default to next segment
    })
  }

  return corners
}

// Helper function to compute geometric properties for a single segment
const computeSegmentGeometry = (
  startPoint: Vec2,
  endPoint: Vec2,
  thickness: Length
): {
  insideLength: Length
  outsideLength: Length
  insideLine: LineSegment2D
  outsideLine: LineSegment2D
  direction: Vec2
  outsideDirection: Vec2
} => {
  // Calculate direction vector (normalized from start -> end)
  const dx = endPoint[0] - startPoint[0]
  const dy = endPoint[1] - startPoint[1]
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    throw new Error('Wall segment cannot have zero length')
  }

  const direction = createVec2(dx / length, dy / length)

  // Calculate outside direction (normal vector pointing outside)
  // For a clockwise polygon, the outside normal is perpendicular right to the direction
  const outsideDirection = createVec2(-direction[1], direction[0])

  // Inside line is the original segment
  const insideLine: LineSegment2D = {
    start: startPoint,
    end: endPoint
  }

  // Outside line is offset by thickness in the outside direction
  const outsideStart = createVec2(
    startPoint[0] + outsideDirection[0] * thickness,
    startPoint[1] + outsideDirection[1] * thickness
  )
  const outsideEnd = createVec2(
    endPoint[0] + outsideDirection[0] * thickness,
    endPoint[1] + outsideDirection[1] * thickness
  )

  const outsideLine: LineSegment2D = {
    start: outsideStart,
    end: outsideEnd
  }

  // Calculate outside length (same as inside for straight segments)
  const outsideLength = Math.sqrt(
    (outsideEnd[0] - outsideStart[0]) * (outsideEnd[0] - outsideStart[0]) +
      (outsideEnd[1] - outsideStart[1]) * (outsideEnd[1] - outsideStart[1])
  )

  return {
    insideLength: length as Length,
    outsideLength: outsideLength as Length,
    insideLine,
    outsideLine,
    direction,
    outsideDirection
  }
}

// Helper function to create segments from boundary points
const createSegmentsFromBoundary = (
  boundary: Polygon2D,
  constructionType: OuterWallConstructionType,
  thickness: Length
): OuterWallSegment[] => {
  const segments: OuterWallSegment[] = []

  // Create one segment for each side of the polygon
  for (let i = 0; i < boundary.points.length; i++) {
    const startPoint = boundary.points[i]
    const endPoint = boundary.points[(i + 1) % boundary.points.length]

    const geometry = computeSegmentGeometry(startPoint, endPoint, thickness)

    segments.push({
      id: createWallSegmentId(),
      thickness,
      constructionType,
      openings: [],
      ...geometry
    })
  }

  return segments
}

export const createOuterWallsSlice: StateCreator<OuterWallsSlice, [], [], OuterWallsSlice> = (set, get) => ({
  outerWalls: new Map(),

  // CRUD operations
  addOuterWallPolygon: (
    floorId: FloorId,
    boundary: Polygon2D,
    constructionType: OuterWallConstructionType,
    thickness?: Length
  ) => {
    if (boundary.points.length < 3) {
      throw new Error('Outer wall boundary must have at least 3 points')
    }

    const wallThickness = thickness ?? DEFAULT_OUTER_WALL_THICKNESS

    if (wallThickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    const segments = createSegmentsFromBoundary(boundary, constructionType, wallThickness)
    const corners = createCornersFromBoundary(boundary, segments)

    const outerWall: OuterWallPolygon = {
      id: createOuterWallId(),
      floorId,
      boundary: boundary.points,
      segments,
      corners
    }

    set(state => ({
      outerWalls: new Map(state.outerWalls).set(outerWall.id, outerWall)
    }))
  },

  removeOuterWall: (wallId: OuterWallId) => {
    set(state => {
      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.delete(wallId)
      return { outerWalls: newOuterWalls }
    })
  },

  // Update operations
  updateOuterWallConstructionType: (wallId: OuterWallId, segmentId: WallSegmentId, type: OuterWallConstructionType) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        constructionType: type
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  updateOuterWallThickness: (wallId: OuterWallId, segmentId: WallSegmentId, thickness: Length) => {
    if (thickness <= 0) {
      throw new Error('Wall thickness must be greater than 0')
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      // Get the boundary points for this segment
      const startPoint = outerWall.boundary[segmentIndex]
      const endPoint = outerWall.boundary[(segmentIndex + 1) % outerWall.boundary.length]

      // Recompute geometry with new thickness
      const geometry = computeSegmentGeometry(startPoint, endPoint, thickness)

      const updatedSegments = [...outerWall.segments]
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        thickness,
        ...geometry
      }

      // Recalculate corners since thickness changed, preserving existing corner data
      const boundary = { points: outerWall.boundary }
      const updatedCorners = createCornersFromBoundary(boundary, updatedSegments, outerWall.corners)

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments,
        corners: updatedCorners
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  updateCornerBelongsTo: (wallId: OuterWallId, cornerId: OuterCornerId, belongsTo: 'previous' | 'next') => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const cornerIndex = outerWall.corners.findIndex(c => c.id === cornerId)
      if (cornerIndex === -1) {
        return state // Corner not found
      }

      const updatedCorners = [...outerWall.corners]
      updatedCorners[cornerIndex] = {
        ...updatedCorners[cornerIndex],
        belongsTo
      }

      const updatedOuterWall = {
        ...outerWall,
        corners: updatedCorners
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  // Opening operations
  addOpeningToOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingParams: Omit<Opening, 'id'>) => {
    if (openingParams.offsetFromStart < 0) {
      throw new Error('Opening offset from start must be non-negative')
    }
    if (openingParams.width <= 0) {
      throw new Error('Opening width must be greater than 0')
    }
    if (openingParams.height <= 0) {
      throw new Error('Opening height must be greater than 0')
    }
    if (openingParams.sillHeight != null && openingParams.sillHeight < 0) {
      throw new Error('Window sill height must be non-negative')
    }

    // Auto-generate ID for the new opening
    const openingId = createOpeningId()
    const newOpening: Opening = {
      id: openingId,
      ...openingParams
    }

    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      const updatedSegments = [...outerWall.segments]
      const segment = updatedSegments[segmentIndex]

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: [...segment.openings, newOpening]
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })

    return openingId
  },

  removeOpeningFromOuterWall: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) {
        return state // Segment not found
      }

      const segment = outerWall.segments[segmentIndex]
      const openingIndex = segment.openings.findIndex(o => o.id === openingId)
      if (openingIndex === -1) {
        return state // Opening not found
      }

      const updatedSegments = [...outerWall.segments]
      const updatedOpenings = [...segment.openings]
      updatedOpenings.splice(openingIndex, 1)

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: updatedOpenings
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  // Getters
  getOuterWallById: (wallId: OuterWallId) => {
    return get().outerWalls.get(wallId) ?? null
  },

  // Updated and new getter methods
  getSegmentById: (wallId: OuterWallId, segmentId: WallSegmentId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    return outerWall.segments.find(s => s.id === segmentId) ?? null
  },

  getCornerById: (wallId: OuterWallId, cornerId: OuterCornerId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    return outerWall.corners.find(c => c.id === cornerId) ?? null
  },

  getOpeningById: (wallId: OuterWallId, segmentId: WallSegmentId, openingId: OpeningId) => {
    const outerWall = get().outerWalls.get(wallId)
    if (outerWall == null) return null

    const segment = outerWall.segments.find(s => s.id === segmentId)
    if (segment == null) return null

    return segment.openings.find(o => o.id === openingId) ?? null
  },

  updateOpening: (
    wallId: OuterWallId,
    segmentId: WallSegmentId,
    openingId: OpeningId,
    updates: Partial<Omit<Opening, 'id'>>
  ) => {
    set(state => {
      const outerWall = state.outerWalls.get(wallId)
      if (outerWall == null) return state

      const segmentIndex = outerWall.segments.findIndex(s => s.id === segmentId)
      if (segmentIndex === -1) return state

      const segment = outerWall.segments[segmentIndex]
      const openingIndex = segment.openings.findIndex(o => o.id === openingId)
      if (openingIndex === -1) return state

      const updatedSegments = [...outerWall.segments]
      const updatedOpenings = [...segment.openings]

      updatedOpenings[openingIndex] = {
        ...updatedOpenings[openingIndex],
        ...updates
      }

      updatedSegments[segmentIndex] = {
        ...segment,
        openings: updatedOpenings
      }

      const updatedOuterWall = {
        ...outerWall,
        segments: updatedSegments
      }

      const newOuterWalls = new Map(state.outerWalls)
      newOuterWalls.set(wallId, updatedOuterWall)
      return { outerWalls: newOuterWalls }
    })
  },

  getOuterWallsByFloor: (floorId: FloorId) => {
    return Array.from(get().outerWalls.values()).filter(wall => wall.floorId === floorId)
  }
})
