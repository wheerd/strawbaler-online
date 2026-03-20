import {
  type SelectableId,
  isConstraintId,
  isFloorAreaId,
  isFloorOpeningId,
  isIntermediateWallId,
  isOpeningId,
  isPerimeterCornerId,
  isPerimeterId,
  isPerimeterWallId,
  isRoofId,
  isRoofOverhangId,
  isWallNodeId,
  isWallPostId
} from '@/building/model'
import { getModelActions } from '@/building/store/store'
import { assertUnreachable } from '@/shared/utils'

export function deleteEntity(selectedId: SelectableId): boolean {
  const modelStore = getModelActions()

  if (isPerimeterWallId(selectedId)) {
    return modelStore.removePerimeterWall(selectedId)
  } else if (isPerimeterCornerId(selectedId)) {
    return modelStore.removePerimeterCorner(selectedId)
  } else if (isOpeningId(selectedId)) {
    modelStore.removeWallOpening(selectedId)
    return true
  } else if (isWallPostId(selectedId)) {
    modelStore.removeWallPost(selectedId)
    return true
  } else if (isPerimeterId(selectedId)) {
    modelStore.removePerimeter(selectedId)
    return true
  } else if (isFloorAreaId(selectedId)) {
    modelStore.removeFloorArea(selectedId)
    return true
  } else if (isFloorOpeningId(selectedId)) {
    modelStore.removeFloorOpening(selectedId)
    return true
  } else if (isRoofId(selectedId)) {
    modelStore.removeRoof(selectedId)
    return true
  } else if (isConstraintId(selectedId)) {
    modelStore.removeBuildingConstraint(selectedId)
    return true
  } else if (isRoofOverhangId(selectedId)) {
    // Cannot be deleted
    return false
  } else if (isIntermediateWallId(selectedId)) {
    modelStore.removeIntermediateWall(selectedId)
    return true
  } else if (isWallNodeId(selectedId)) {
    modelStore.removeWallNode(selectedId)
    return true
  } else {
    assertUnreachable(selectedId, `Unknown sub-entity type for deletion: ${selectedId}`)
  }
}
