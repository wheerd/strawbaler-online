import { useCurrentSelection, useSelectionPath } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import { useActiveTool } from '@/components/FloorPlanEditor/Tools/ToolSystem/ToolContext'
import { OuterWallInspector, WallSegmentInspector, OuterCornerInspector, OpeningInspector } from './Inspectors'
import { ActionButtons } from './ActionButtons'
import {
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

  return (
    <div className="bg-gray-50 h-full flex flex-col border-l border-gray-200">
      {/* Panel Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">Properties</h2>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Entity Inspector */}
        <div className="border-b border-gray-200">
          {!selectedId && (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-2">No entity selected</div>
              <div className="text-sm text-gray-400">Select a wall, room, or point to view its properties</div>
            </div>
          )}

          {/* Outer wall entities */}
          {selectedId && isOuterWallId(selectedId) && <OuterWallInspector key={selectedId} selectedId={selectedId} />}

          {selectedId && isWallSegmentId(selectedId) && (
            <WallSegmentInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              segmentId={selectedId}
            />
          )}

          {selectedId && isOuterCornerId(selectedId) && (
            <OuterCornerInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              cornerId={selectedId}
            />
          )}

          {selectedId && isOpeningId(selectedId) && (
            <OpeningInspector
              key={selectedId}
              outerWallId={selectionPath[0] as OuterWallId}
              segmentId={selectionPath[1] as WallSegmentId}
              openingId={selectedId}
            />
          )}

          {/* Unknown entity type */}
          {selectedId &&
            !isOuterWallId(selectedId) &&
            !isWallSegmentId(selectedId) &&
            !isOuterCornerId(selectedId) &&
            !isOpeningId(selectedId) && (
              <div className="bg-amber-50 border border-amber-200 p-4 m-4 rounded-lg">
                <h3 className="text-amber-800 font-semibold mb-2">Unknown Entity Type</h3>
                <p className="text-amber-700 text-sm">Entity type not recognized: {typeof selectedId}</p>
              </div>
            )}
        </div>

        {/* Tool Inspector */}
        {activeTool?.inspectorComponent && (
          <div className="border-b border-gray-200">
            <activeTool.inspectorComponent tool={activeTool} />
          </div>
        )}

        {/* Action Buttons */}
        <div>
          <ActionButtons tool={activeTool} />
        </div>
      </div>
    </div>
  )
}
