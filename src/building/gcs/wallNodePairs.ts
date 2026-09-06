import type { WallId } from '@/building/model'
import type { Vec2 } from '@/shared/geometry'

export interface WallNodeIncident {
  id: WallId
  direction: Vec2
  isPerimeterRay?: boolean
}

export function getAdjacentWallNodePairs<T extends WallNodeIncident>(incidents: readonly T[]): [T, T][] {
  const ordered = [...incidents].sort(
    (a, b) => Math.atan2(b.direction[1], b.direction[0]) - Math.atan2(a.direction[1], a.direction[0])
  )
  if (ordered.length < 2) return []
  if (
    ordered.length === 2 &&
    (ordered[0].id === ordered[1].id || (ordered[0].isPerimeterRay && ordered[1].isPerimeterRay))
  ) {
    return []
  }

  const perimeterRays = ordered.filter(incident => incident.isPerimeterRay)
  const nonPerimeterWalls = ordered.filter(incident => !incident.isPerimeterRay)
  if (perimeterRays.length === 2 && nonPerimeterWalls.length === 1) {
    // The two perimeter rays are opposite representations of one perimeter wall.
    return [[perimeterRays[0], nonPerimeterWalls[0]]]
  }

  const pairs =
    ordered.length === 2
      ? [[ordered[0], ordered[1]] as [T, T]]
      : ordered.flatMap((wallA, index) => {
          const wallB = ordered[(index + 1) % ordered.length]
          if (wallA.id === wallB.id || (wallA.isPerimeterRay && wallB.isPerimeterRay)) return []
          return [[wallA, wallB] as [T, T]]
        })

  return pairs
}
