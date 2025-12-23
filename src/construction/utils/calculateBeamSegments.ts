import { type Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

/**
 * Represents a segment in virtual (original) coordinate space
 */
export interface VirtualSegment {
  start: number
  end: number
}

export interface SegmentationResult {
  segments: VirtualSegment[]
}

/**
 * Calculates beam segments for visualization, identifying regions with features
 * and gaps that can be omitted with break indicators.
 *
 * This function only deals with virtual (original) coordinates - display coordinate
 * mapping is handled by CoordinateMapper.
 */
export function calculateBeamSegments(
  polygon: PolygonWithHoles2D,
  bounds: Bounds2D,
  bufferDistance = 50,
  minGapSize = 500
): SegmentationResult {
  const beamLength = bounds.size[0]

  // Special case: beams < 1m (100cm) always show as one segment
  if (beamLength < 100) {
    return {
      segments: [
        {
          start: bounds.min[0],
          end: bounds.max[0]
        }
      ]
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
          start: bounds.min[0],
          end: bounds.max[0]
        }
      ]
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
    const start = Math.max(bounds.min[0], cluster.min - bufferDistance)
    const end = Math.min(bounds.max[0], cluster.max + bufferDistance)
    return { start, end }
  })

  // Merge overlapping buffered segments
  const mergedSegments: VirtualSegment[] = []
  let current = bufferedSegments[0]

  for (let i = 1; i < bufferedSegments.length; i++) {
    const next = bufferedSegments[i]

    if (next.start <= current.end) {
      // Overlapping or touching, merge them
      current.end = Math.max(current.end, next.end)
    } else {
      mergedSegments.push(current)
      current = next
    }
  }
  mergedSegments.push(current)

  return { segments: mergedSegments }
}
