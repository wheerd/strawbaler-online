import { type Bounds2D, type PolygonWithHoles2D } from '@/shared/geometry'

export interface VirtualSegment {
  start: number
  end: number
}

export function calculateBeamSegments(
  polygon: PolygonWithHoles2D,
  bounds: Bounds2D,
  bufferDistance = 50,
  minGapSize = 500,
  minLength = 1000
): VirtualSegment[] {
  const beamLength = bounds.size[0]

  if (beamLength < minLength) {
    return [
      {
        start: bounds.min[0],
        end: bounds.max[0]
      }
    ]
  }

  const allPoints = polygon.outer.points.concat(polygon.holes.flatMap(h => h.points))
  const xCoords = Array.from(new Set(allPoints.map(p => p[0]))).sort((a, b) => a - b)

  const segments: VirtualSegment[] = []

  let clusterMin = xCoords[0]
  let clusterMax = xCoords[0]
  for (let i = 1; i < xCoords.length; i++) {
    const delta = xCoords[i] - clusterMax
    if (delta < minGapSize) {
      clusterMax = xCoords[i]
    } else {
      const start = Math.max(bounds.min[0], clusterMin - bufferDistance)
      const end = Math.min(bounds.max[0], clusterMax + bufferDistance)
      segments.push({
        start,
        end
      })
      clusterMin = clusterMax = xCoords[i]
    }
  }

  const start = Math.max(bounds.min[0], clusterMin - bufferDistance)
  const end = Math.min(bounds.max[0], clusterMax + bufferDistance)
  segments.push({
    start,
    end
  })

  return segments
}
