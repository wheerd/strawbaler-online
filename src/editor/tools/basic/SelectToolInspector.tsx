import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
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
} from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import { useCurrentSelection } from '@/editor/canvas/state/selectionStore'
import { FloorAreaInspector } from '@/editor/inspectors/FloorAreaInspector'
import { FloorOpeningInspector } from '@/editor/inspectors/FloorOpeningInspector'
import { IntermediateWallInspector } from '@/editor/inspectors/IntermediateWallInspector'
import { OpeningInspector } from '@/editor/inspectors/OpeningInspector'
import { PerimeterCornerInspector } from '@/editor/inspectors/PerimeterCornerInspector'
import { PerimeterInspector } from '@/editor/inspectors/PerimeterInspector'
import { PerimeterWallInspector } from '@/editor/inspectors/PerimeterWallInspector'
import { RoofInspector } from '@/editor/inspectors/RoofInspector'
import { RoofOverhangInspector } from '@/editor/inspectors/RoofOverhangInspector'
import { StoreyInspector } from '@/editor/inspectors/StoreyInspector'
import { WallNodeInspector } from '@/editor/inspectors/WallNodeInspector'
import { WallPostInspector } from '@/editor/inspectors/WallPostInspector'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'

export function SelectToolInspector(): React.JSX.Element {
  const { t } = useTranslation('tool')
  const selectedId = useCurrentSelection()
  const storeyId = useActiveStoreyId()

  return (
    <div className="flex flex-col gap-2 p-2">
      {!selectedId && <StoreyInspector key="storey" selectedId={storeyId} />}

      {/* Perimeter entities */}
      {selectedId && isPerimeterId(selectedId) && <PerimeterInspector key={selectedId} selectedId={selectedId} />}
      {selectedId && isPerimeterWallId(selectedId) && <PerimeterWallInspector key={selectedId} wallId={selectedId} />}
      {selectedId && isPerimeterCornerId(selectedId) && (
        <PerimeterCornerInspector key={selectedId} cornerId={selectedId} />
      )}
      {selectedId && isOpeningId(selectedId) && <OpeningInspector key={selectedId} openingId={selectedId} />}
      {selectedId && isWallPostId(selectedId) && <WallPostInspector key={selectedId} postId={selectedId} />}
      {selectedId && isFloorAreaId(selectedId) && <FloorAreaInspector key={selectedId} floorAreaId={selectedId} />}
      {selectedId && isFloorOpeningId(selectedId) && (
        <FloorOpeningInspector key={selectedId} floorOpeningId={selectedId} />
      )}
      {selectedId && isRoofId(selectedId) && <RoofInspector key={selectedId} roofId={selectedId} />}
      {selectedId && isRoofOverhangId(selectedId) && <RoofOverhangInspector key={selectedId} overhangId={selectedId} />}
      {selectedId && isIntermediateWallId(selectedId) && (
        <IntermediateWallInspector key={selectedId} wallId={selectedId} />
      )}
      {selectedId && isWallNodeId(selectedId) && <WallNodeInspector key={selectedId} nodeId={selectedId} />}

      {/* Unknown entity type */}
      {selectedId &&
        !isPerimeterId(selectedId) &&
        !isPerimeterWallId(selectedId) &&
        !isPerimeterCornerId(selectedId) &&
        !isOpeningId(selectedId) &&
        !isWallPostId(selectedId) &&
        !isFloorAreaId(selectedId) &&
        !isFloorOpeningId(selectedId) &&
        !isRoofId(selectedId) &&
        !isRoofOverhangId(selectedId) &&
        !isIntermediateWallId(selectedId) &&
        !isWallNodeId(selectedId) && (
          <Callout color="yellow">
            <CalloutIcon>
              <TriangleAlert />
            </CalloutIcon>
            <CalloutText>
              <span className="font-bold">{t($ => $.select.unknownEntityType)}</span>
              <br />
              {t($ => $.select.unknownEntityMessage, {
                id: selectedId
              })}
            </CalloutText>
          </Callout>
        )}
    </div>
  )
}
