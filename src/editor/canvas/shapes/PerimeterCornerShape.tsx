import { Arrow, Group, Line } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterCorner, PerimeterWall } from '@/building/model/model'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { useSelectionStore } from '@/editor/hooks/useSelectionStore'
import { add, direction, midpoint, perpendicular, scale } from '@/shared/geometry'
import { COLORS } from '@/shared/theme/colors'

interface PerimeterCornerShapeProps {
  corner: PerimeterCorner
  previousWall: PerimeterWall
  nextWall: PerimeterWall
  perimeterId: string
}

export function PerimeterCornerShape({
  corner,
  previousWall,
  nextWall,
  perimeterId
}: PerimeterCornerShapeProps): React.JSX.Element {
  const select = useSelectionStore()
  const isSelected = select.isCurrentSelection(corner.id)

  const cornerPolygon = [
    corner.insidePoint,
    previousWall.insideLine.end,
    previousWall.outsideLine.end,
    corner.outsidePoint,
    nextWall.outsideLine.start,
    nextWall.insideLine.start
  ]
  const polygonArray = cornerPolygon.flatMap(point => [point[0], point[1]])

  const arrowDir = corner.constructedByWall === 'previous' ? previousWall.direction : scale(nextWall.direction, -1)
  const arrowCenter =
    corner.constructedByWall === 'previous'
      ? midpoint(previousWall.insideLine.end, previousWall.outsideLine.end)
      : midpoint(nextWall.insideLine.start, nextWall.outsideLine.start)
  const arrowStart = add(arrowCenter, scale(arrowDir, -60))
  const arrowEnd = add(arrowCenter, scale(arrowDir, 90))

  const constructingWall = corner.constructedByWall === 'previous' ? previousWall : nextWall
  const constructionMethod = usePerimeterConstructionMethodById(constructingWall.constructionMethodId)
  const cornerColor =
    constructionMethod?.config.type === 'non-strawbale' ? COLORS.materials.other : COLORS.materials.strawbale
  const finalColor = isSelected ? COLORS.selection.primary : cornerColor

  // Check if corner is nearly straight (close to 180°)
  const interiorAngleDegrees = corner.interiorAngle
  const exteriorAngleDegrees = corner.exteriorAngle
  const isNearStraight = Math.abs(interiorAngleDegrees - 180) <= 5 || Math.abs(exteriorAngleDegrees - 180) <= 5

  const normal = perpendicular(direction(corner.insidePoint, corner.outsidePoint))
  const overlayWidth = 80

  return (
    <Group
      name={`perimeter-corner-${corner.id}`}
      entityId={corner.id}
      entityType="perimeter-corner"
      parentIds={[perimeterId]}
      listening
    >
      {/* Corner polygon fill */}
      <Line points={polygonArray} fill={finalColor} stroke={COLORS.ui.black} strokeWidth={10} closed listening />

      {/* Rounded rectangle overlay for near-straight corners */}
      {isNearStraight && (
        <Line
          points={[
            corner.insidePoint[0] - normal[0] * (overlayWidth / 2),
            corner.insidePoint[1] - (normal[1] * overlayWidth) / 2,
            corner.insidePoint[0] + (normal[0] * overlayWidth) / 2,
            corner.insidePoint[1] + (normal[1] * overlayWidth) / 2,
            corner.outsidePoint[0] + (normal[0] * overlayWidth) / 2,
            corner.outsidePoint[1] + (normal[1] * overlayWidth) / 2,
            corner.outsidePoint[0] - (normal[0] * overlayWidth) / 2,
            corner.outsidePoint[1] - (normal[1] * overlayWidth) / 2
          ]}
          fill={finalColor}
          stroke={COLORS.ui.black}
          strokeWidth={8}
          opacity={0.5}
          dash={[20, 20]}
          closed
          listening
        />
      )}

      {!isNearStraight && (
        <Line
          points={[corner.insidePoint[0], corner.insidePoint[1], corner.outsidePoint[0], corner.outsidePoint[1]]}
          stroke={COLORS.ui.black}
          opacity={0.5}
          strokeWidth={8}
          dash={[20, 20]}
          listening={false}
        />
      )}

      {/* Corner ownership indicator - small arrow */}
      {isSelected && (
        <Arrow
          points={[arrowStart[0], arrowStart[1], arrowEnd[0], arrowEnd[1]]}
          stroke={COLORS.ui.white}
          fill={COLORS.ui.white}
          strokeWidth={20}
          pointerLength={50}
          pointerWidth={50}
          listening={false}
        />
      )}
    </Group>
  )
}
