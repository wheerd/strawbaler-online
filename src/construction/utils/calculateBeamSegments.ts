import { type Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

export interface BeamSegment {
  virtualStart: number // Original X coordinate
  virtualEnd: number // Original X coordinate
  displayStart: number // Mapped X for rendering
  displayEnd: number // Mapped X for rendering
}

export interface SegmentGap {
  virtualStart: number
  virtualEnd: number
  displayPosition: number // Where to show zigzag in display coords
  omittedLength: number
}

export interface SegmentationResult {
  segments: BeamSegment[]
  gaps: SegmentGap[]
}

/**
 * Calculates beam segments for visualization, identifying regions with features
 * and gaps that can be omitted with break indicators.
 */
export function calculateBeamSegments(
  polygon: PolygonWithHoles2D,
  bounds: Bounds2D,
  bufferDistance = 20,
  minGapSize = 500
): SegmentationResult {
  const beamLength = bounds.size[0]

  // Special case: beams < 1m (100cm) always show as one segment
  if (beamLength < 100) {
    return {
      segments: [
        {
          virtualStart: bounds.min[0],
          virtualEnd: bounds.max[0],
          displayStart: bounds.min[0],
          displayEnd: bounds.max[0]
        }
      ],
      gaps: []
    }
  }

  // Extract all unique X-coordinates from polygon points
  const allPoints = polygon.outer.points.concat(polygon.holes.flatMap(h => h.points))
  const xCoords = Array.from(new Set(allPoints.map(p => p[0]))).sort((a, b) => a - b)

  if (xCoords.length === 0) {
    // No features, show entire beam
    return {
      segments: [
        {
          virtualStart: bounds.min[0],
          virtualEnd: bounds.max[0],
          displayStart: bounds.min[0],
          displayEnd: bounds.max[0]
        }
      ],
      gaps: []
    }
  }

  // Create feature clusters by grouping nearby coordinates
  const clusters: { min: number; max: number }[] = []
  let currentCluster = { min: xCoords[0], max: xCoords[0] }

  for (let i = 1; i < xCoords.length; i++) {
    const coord = xCoords[i]
    const prevCoord = xCoords[i - 1]

    // Check if this coordinate is close enough to merge with current cluster
    // We merge if the gap between them (accounting for buffers) would be less than minGapSize
    const gapBetween = coord - prevCoord

    if (gapBetween < minGapSize) {
      // Extend current cluster
      currentCluster.max = coord
    } else {
      // Start new cluster
      clusters.push(currentCluster)
      currentCluster = { min: coord, max: coord }
    }
  }
  clusters.push(currentCluster)

  // Add buffers to each cluster and clip at beam bounds
  const bufferedSegments = clusters.map(cluster => {
    const virtualStart = Math.max(bounds.min[0], cluster.min - bufferDistance)
    const virtualEnd = Math.min(bounds.max[0], cluster.max + bufferDistance)
    return { virtualStart, virtualEnd }
  })

  // Merge overlapping buffered segments
  const mergedSegments: { virtualStart: number; virtualEnd: number }[] = []
  let current = bufferedSegments[0]

  for (let i = 1; i < bufferedSegments.length; i++) {
    const next = bufferedSegments[i]

    if (next.virtualStart <= current.virtualEnd) {
      // Overlapping or touching, merge them
      current.virtualEnd = Math.max(current.virtualEnd, next.virtualEnd)
    } else {
      mergedSegments.push(current)
      current = next
    }
  }
  mergedSegments.push(current)

  // Calculate display coordinates and gaps
  const segments: BeamSegment[] = []
  const gaps: SegmentGap[] = []
  let displayOffset = 0
  const gapDisplayWidth = 60 // Visual width allocated for zigzag indicator

  for (let i = 0; i < mergedSegments.length; i++) {
    const segment = mergedSegments[i]
    const segmentWidth = segment.virtualEnd - segment.virtualStart

    segments.push({
      virtualStart: segment.virtualStart,
      virtualEnd: segment.virtualEnd,
      displayStart: displayOffset,
      displayEnd: displayOffset + segmentWidth
    })

    displayOffset += segmentWidth

    // Add gap if there's a next segment
    if (i < mergedSegments.length - 1) {
      const nextSegment = mergedSegments[i + 1]
      const gapStart = segment.virtualEnd
      const gapEnd = nextSegment.virtualStart
      const omittedLength = gapEnd - gapStart

      gaps.push({
        virtualStart: gapStart,
        virtualEnd: gapEnd,
        displayPosition: displayOffset + gapDisplayWidth / 2,
        omittedLength
      })

      // Add visual gap width to display offset
      displayOffset += gapDisplayWidth
    }
  }

  return { segments, gaps }
}
