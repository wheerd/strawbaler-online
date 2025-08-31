import type { WallType } from '@/types/model'

export interface WallEdge {
  color: string
  width: number
  position: 'left' | 'right'
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
 * Gets the visualization configuration for a wall based on its type, thickness, and outside direction
 * Returns edges positioned as 'left' or 'right' relative to the wall direction (start -> end)
 */
export function getWallVisualization(
  wallType: WallType,
  thickness: number,
  outsideDirection?: 'left' | 'right'
): WallVisualization {
  switch (wallType) {
    case 'outer': {
      // For outer walls, use outsideDirection to determine plaster placement
      // If no outsideDirection is specified, default to 'right' being outside
      const outsideSide = outsideDirection || 'right'
      const insideSide = outsideSide === 'left' ? 'right' : 'left'

      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: null,
        edges: [
          { color: WALL_COLORS.limePlaster, width: 40, position: outsideSide }, // Lime plaster on outside
          { color: WALL_COLORS.clayPlaster, width: 40, position: insideSide } // Clay plaster on inside
        ]
      }
    }

    case 'partition':
      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: null,
        edges: [
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'left' }, // Clay plaster on left side
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'right' } // Clay plaster on right side
        ]
      }

    case 'structural':
      return {
        mainColor: WALL_COLORS.strawbale,
        strokeWidth: thickness,
        pattern: { color: WALL_COLORS.woodSupport, dash: [100, 500] }, // Dashed pattern for wood supports
        edges: [
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'left' }, // Clay plaster on left side
          { color: WALL_COLORS.clayPlaster, width: 30, position: 'right' } // Clay plaster on right side
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
