import type { WallType } from '@/types/model'

export interface WallEdge {
  color: string
  width: number
  position: 'outside' | 'inside'
}

export interface WallPattern {
  color: string
  dash: number[]
}

export interface WallVisualization {
  mainColor: string
  strokeWidth: number
  pattern: WallPattern | null
  edges: WallEdge[]
}

// Base colors for strawbale wall visualization
export const WALL_COLORS = {
  strawbale: '#DAA520', // Golden color for strawbale
  limePlaster: '#555555', // Dark gray for lime plaster
  clayPlaster: '#8B4513', // Dark brown for clay plaster
  other: '#2F2F2F', // Dark gray for "other" walls
  woodSupport: '#CD853F' // Lighter brown for wooden supports
} as const

/**
 * Gets the visualization configuration for a wall based on its type and thickness
 */
export function getWallVisualization(wallType: WallType, thickness: number): WallVisualization {
  switch (wallType) {
    case 'outer':
      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: null,
        edges: [
          { color: WALL_COLORS.limePlaster, width: 40, position: 'outside' }, // Lime plaster outside
          { color: WALL_COLORS.clayPlaster, width: 40, position: 'inside' } // Clay plaster inside
        ]
      }

    case 'partition':
      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: null,
        edges: [
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'outside' }, // Clay plaster on one side
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'inside' } // Clay plaster on other side
        ]
      }

    case 'structural':
      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: { color: WALL_COLORS.woodSupport, dash: [100, 500] }, // Dashed pattern for wood supports
        edges: [
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'outside' }, // Clay plaster on one side
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'inside' } // Clay plaster on other side
        ]
      }

    case 'other':
    default:
      return {
        mainColor: WALL_COLORS.other,
        strokeWidth: thickness,
        pattern: null,
        edges: []
      }
  }
}

/**
 * Gets a semi-transparent version of the wall visualization for previews
 * Note: opacity should be applied during rendering, not in the visualization config
 */
export function getWallPreviewVisualization(wallType: WallType, thickness: number): WallVisualization {
  return getWallVisualization(wallType, thickness)
}
