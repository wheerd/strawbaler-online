import { Group } from 'react-konva/lib/ReactKonvaCore'

import type { PerimeterCornerGeometry } from '@/building/model'
import type { RoofId, SelectableId } from '@/building/model/ids'
import {
  isFloorAreaId,
  isFloorOpeningId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId,
  isWallPostId
} from '@/building/model/ids'
import {
  useFloorAreaById,
  useFloorOpeningById,
  usePerimeterById,
  usePerimeterCornerById,
  usePerimeterWallById,
  useRoofById,
  useWallOpeningById,
  useWallPostById
} from '@/building/store'
import { SelectionOutline } from '@/editor/canvas/utils/SelectionOutline'
import { useCurrentSelection, useSelectionPath } from '@/editor/hooks/useSelectionStore'
import { type Vec2, direction, perpendicular, scaleAddVec2 } from '@/shared/geometry'

function useSelectionOutlinePoints(
  selectionPath: SelectableId[],
  currentSelection: SelectableId | null
): Vec2[] | null {
  return currentSelection == null
    ? null
    : isPerimeterId(currentSelection)
      ? usePerimeterById(currentSelection).outerPolygon.points
      : isPerimeterWallId(currentSelection)
        ? usePerimeterWallById(currentSelection).polygon.points
        : isPerimeterCornerId(currentSelection)
          ? getPerimeterCornerPoints(usePerimeterCornerById(currentSelection))
          : isOpeningId(currentSelection)
            ? useWallOpeningById(currentSelection).polygon.points
            : isWallPostId(currentSelection)
              ? useWallPostById(currentSelection).polygon.points
              : isFloorAreaId(currentSelection)
                ? (useFloorAreaById(currentSelection)?.area.points ?? null)
                : isFloorOpeningId(currentSelection)
                  ? (useFloorOpeningById(currentSelection)?.area.points ?? null)
                  : isRoofId(currentSelection)
                    ? (useRoofById(currentSelection)?.overhangPolygon.points ?? null)
                    : isRoofOverhangId(currentSelection)
                      ? (useRoofById(selectionPath[0] as RoofId)?.overhangs.find(o => o.id === currentSelection)?.area
                          .points ?? null)
                      : null
}

export function SelectionOverlay(): React.JSX.Element | null {
  const selectionPath = useSelectionPath()
  const currentSelection = useCurrentSelection()

  const outlinePoints = useSelectionOutlinePoints(selectionPath, currentSelection)

  if (!outlinePoints || outlinePoints.length === 0) {
    return null
  }

  return (
    <Group name="selection-overlay">
      <SelectionOutline points={outlinePoints} />
    </Group>
  )
}

function getPerimeterCornerPoints(corner: PerimeterCornerGeometry): Vec2[] | null {
  const isNearStraight = Math.abs(corner.interiorAngle - 180) <= 5
  if (isNearStraight) {
    // For near-straight corners, use improved overlay shape (same as PerimeterCornerShape)
    const normal = perpendicular(direction(corner.insidePoint, corner.outsidePoint))
    const halfOverlayWidth = 80 / 2

    return [
      scaleAddVec2(corner.insidePoint, normal, -halfOverlayWidth),
      scaleAddVec2(corner.insidePoint, normal, halfOverlayWidth),
      scaleAddVec2(corner.outsidePoint, normal, halfOverlayWidth),
      scaleAddVec2(corner.outsidePoint, normal, -halfOverlayWidth)
    ]
  }

  return corner.polygon.points
}
