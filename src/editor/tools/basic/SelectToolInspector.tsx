import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { FloorAreaInspector } from '@/building/components/inspectors/FloorAreaInspector'
import { FloorOpeningInspector } from '@/building/components/inspectors/FloorOpeningInspector'
import { OpeningInspector } from '@/building/components/inspectors/OpeningInspector'
import { PerimeterCornerInspector } from '@/building/components/inspectors/PerimeterCornerInspector'
import { PerimeterInspector } from '@/building/components/inspectors/PerimeterInspector'
import { PerimeterWallInspector } from '@/building/components/inspectors/PerimeterWallInspector'
import { RoofInspector } from '@/building/components/inspectors/RoofInspector'
import { RoofOverhangInspector } from '@/building/components/inspectors/RoofOverhangInspector'
import { StoreyInspector } from '@/building/components/inspectors/StoreyInspector'
import { WallPostInspector } from '@/building/components/inspectors/WallPostInspector'
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
import { useActiveStoreyId } from '@/building/store'
import { Callout, CalloutIcon, CalloutText } from '@/components/ui/callout'
import { useCurrentSelection } from '@/editor/hooks/useSelectionStore'

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
        !isRoofOverhangId(selectedId) && (
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
