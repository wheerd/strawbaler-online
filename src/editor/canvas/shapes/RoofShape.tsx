import { vec2 } from 'gl-matrix'
import { useMemo } from 'react'
import { Arrow, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { Roof } from '@/building/model/model'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { Bounds2D, direction, perpendicular } from '@/shared/geometry'
import { useCanvasTheme } from '@/shared/theme/CanvasThemeContext'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

interface RoofShapeProps {
  roof: Roof
}

export function RoofShape({ roof }: RoofShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const theme = useCanvasTheme()
  const isSelected = select.isCurrentSelection(roof.id)

  const points = roof.referencePolygon.points.flatMap((point: vec2) => [point[0], point[1]])
  const eavePolygon = roof.overhangPolygon.points.flatMap((point: vec2) => [point[0], point[1]])

  // Calculate center point for direction arrow
  const { center, arrowEnd } = useMemo(() => {
    const bounds = Bounds2D.fromPoints(roof.referencePolygon.points)
    const centerPoint = vec2.fromValues((bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2)

    // Arrow length is 20% of the smaller dimension
    const size = bounds.size
    const arrowLength = Math.min(size[0], size[1]) * 0.2

    // Calculate direction perpendicular to mainSide
    const mainSideStart = roof.referencePolygon.points[roof.mainSideIndex]
    const mainSideEnd = roof.referencePolygon.points[(roof.mainSideIndex + 1) % roof.referencePolygon.points.length]
    const mainSideDirection = direction(mainSideStart, mainSideEnd)
    const roofDirection = perpendicular(mainSideDirection)

    // Arrow points in the direction vector
    const arrowEndPoint = vec2.scaleAndAdd(vec2.create(), centerPoint, roofDirection, arrowLength)

    return {
      center: centerPoint,
      arrowEnd: arrowEndPoint
    }
  }, [roof.referencePolygon.points, roof.mainSideIndex])

  return (
    <Group name={`roof-${roof.id}`} entityId={roof.id} entityType="roof" parentIds={[]} listening>
      {/* Main roof polygon - semi-transparent */}
      <Line points={points} closed fill={MATERIAL_COLORS.roof} opacity={0.6} listening />
      <Line points={points} closed stroke={theme.border} strokeWidth={10} listening />

      {/* Eave polygon - dashed outline */}
      <Line points={eavePolygon} closed stroke={MATERIAL_COLORS.roof} strokeWidth={20} dash={[200, 100]} listening />

      {/* Direction arrow */}
      {isSelected && (
        <Arrow
          points={[center[0], center[1], arrowEnd[0], arrowEnd[1]]}
          stroke={theme.white}
          strokeWidth={400}
          fill={theme.white}
          pointerLength={200}
          pointerWidth={200}
          listening={false}
        />
      )}
    </Group>
  )
}
