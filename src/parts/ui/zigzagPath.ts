import { type Vec2, newVec2 } from '@/shared/geometry'

/**
 * Configuration for zigzag pattern generation
 */
export interface ZigzagConfig {
  /** Horizontal amplitude of zigzag pattern */
  width: number
  /** Number of peaks in the zigzag */
  peaks: number
  /** Extension beyond boundaries (default: 0) */
  extend?: number
}

/**
 * Generate points for a single zigzag edge going from yMin to yMax.
 * Returns an array of points starting from bottom and going up.
 */
export function generateZigzagEdgePoints(x: number, yMin: number, yMax: number, config: ZigzagConfig): Vec2[] {
  const extend = config.extend ?? 0
  const startY = yMin - extend
  const endY = yMax + extend
  const height = endY - startY
  const peakHeight = height / config.peaks

  const points: Vec2[] = []

  // Start at bottom
  points.push(newVec2(x, startY))

  // Generate zigzag points going upward
  for (let i = 0; i < config.peaks; i++) {
    const y1 = startY + i * peakHeight + peakHeight / 2
    const y2 = startY + (i + 1) * peakHeight
    points.push(newVec2(x + config.width, y1))
    points.push(newVec2(x, y2))
  }

  return points
}

/**
 * Generate points for a straight vertical edge.
 */
export function generateStraightEdgePoints(x: number, yMin: number, yMax: number, extend = 0): Vec2[] {
  return [newVec2(x, yMin - extend), newVec2(x, yMax + extend)]
}

/**
 * Convert an array of points to an SVG path string.
 */
export function pointsToSvgPath(points: Vec2[], close = false): string {
  if (points.length === 0) return ''

  const pathParts = points.map(([x, y], index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${command} ${x} ${y}`
  })

  if (close) {
    pathParts.push('Z')
  }

  return pathParts.join(' ')
}
