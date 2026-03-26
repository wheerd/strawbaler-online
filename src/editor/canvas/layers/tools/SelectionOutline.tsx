import { useMemo } from 'react'

import { useZoom } from '@/editor/canvas/state/viewportStore'
import { type Polygon2D, type Vec2, offsetPolygon } from '@/shared/geometry'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function SelectionOutline({ points }: { points: Vec2[] }): React.JSX.Element | null {
  const zoom = useZoom()

  // Calculate offset polygon
  const offset = 4 / zoom
  const polygon: Polygon2D = useMemo(() => offsetPolygon({ points }, offset), [points, offset])
  const path = polygonToSvgPath(polygon)

  // Calculate zoom-responsive values
  const strokeWidth = 4 / zoom
  const dashPattern = `${10 / zoom} ${10 / zoom}`

  return points.length === 1 ? (
    <circle
      cx={points[0][0]}
      cy={points[0][1]}
      r={8 / zoom}
      className="fill-none stroke-blue-600/80"
      strokeWidth={strokeWidth}
      strokeDasharray={dashPattern}
      strokeLinecap="round"
      pointerEvents="none"
    />
  ) : (
    <path
      d={path}
      className="fill-none stroke-blue-600/80"
      strokeWidth={strokeWidth}
      strokeDasharray={dashPattern}
      strokeLinecap="round"
      pointerEvents="none"
    />
  )
}
