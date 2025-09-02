import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '../ToolSystem/ToolContext'
import {
  WallInspector,
  RoomInspector,
  CornerInspector,
  OuterWallInspector,
  WallSegmentInspector,
  OuterCornerInspector,
  OpeningInspector
} from './Inspectors'
import { WallToolInspector } from './ToolInspectors/WallToolInspector'
import { ActionButtons } from './ActionButtons'
import {
  isWallId,
  isRoomId,
  isPointId,
  isOuterWallId,
  isWallSegmentId,
  isOuterCornerId,
  isOpeningId,
  type WallSegmentId,
  type OuterWallId
} from '@/types/ids'

export function PropertiesPanel(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const activeTool = useActiveTool()

  // Render entity inspector based on ID type
  const renderEntityInspector = () => {
    if (!selectedId) return null

    // Handle legacy wall entity
    if (isWallId(selectedId)) {
      return <WallInspector selectedId={selectedId} />
    }

    // Handle room entity
    if (isRoomId(selectedId)) {
      return <RoomInspector selectedId={selectedId} />
    }

    // Handle point entity
    if (isPointId(selectedId)) {
      // Points can be either standalone points or corner points
      // For now, treat point selection as corner selection
      return <CornerInspector selectedId={selectedId} />
    }

    // Handle outer wall entities (new)
    if (isOuterWallId(selectedId)) {
      return <OuterWallInspector selectedId={selectedId} />
    }

    if (isWallSegmentId(selectedId)) {
      const [outerWallId] = selectionPath
      return <WallSegmentInspector outerWallId={outerWallId as OuterWallId} segmentId={selectedId} />
    }

    if (isOuterCornerId(selectedId)) {
      const [outerWallId] = selectionPath
      return <OuterCornerInspector outerWallId={outerWallId as OuterWallId} cornerId={selectedId} />
    }

    if (isOpeningId(selectedId)) {
      const [outerWallId, segmentId] = selectionPath
      return (
        <OpeningInspector
          outerWallId={outerWallId as OuterWallId}
          segmentId={segmentId as WallSegmentId}
          openingId={selectedId}
        />
      )
    }

    return (
      <div className="unknown-entity">
        <h3>Unknown Entity Type</h3>
        <p>Entity ID not recognized: {selectedId}</p>
      </div>
    )
  }

  // Render tool inspector if tool has one
  const renderToolInspector = () => {
    if (!activeTool?.hasInspector) return null

    // For now, only wall tools have inspectors
    if (activeTool.category === 'walls') {
      return <WallToolInspector tool={activeTool as any} />
    }

    // Future tool inspectors would be added here

    return null
  }

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h2>Properties</h2>
      </div>

      <div className="panel-content">
        {/* Entity Inspector */}
        <div className="entity-section">
          {selectedId ? (
            renderEntityInspector()
          ) : (
            <div className="no-selection">
              <p>No entity selected</p>
              <p className="help-text">Select a wall, room, or point to view its properties</p>
            </div>
          )}
        </div>

        {/* Tool Inspector */}
        <div className="tool-section">{renderToolInspector()}</div>

        {/* Action Buttons */}
        <div className="actions-section">
          <ActionButtons tool={activeTool} />
        </div>
      </div>
    </div>
  )
}
