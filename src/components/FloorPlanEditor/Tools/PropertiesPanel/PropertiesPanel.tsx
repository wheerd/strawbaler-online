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
import * as Tabs from '@radix-ui/react-tabs'
import { usePropertiesPanel } from '@/hooks/usePropertiesPanel'

export function PropertiesPanel(): React.JSX.Element {
  const selectedId = useCurrentSelection()
  const selectionPath = useSelectionPath()
  const activeTool = useActiveTool()
  const {
    activeTab,
    setActiveTab,
    selectionTabEnabled,
    toolTabEnabled,
    selectionTabLabel,
    toolTabLabel,
    selectionTabIcon,
    toolTabIcon
  } = usePropertiesPanel()

  return (
    <div className="bg-gray-50 h-full flex flex-col border-l border-gray-200">
      {/* Tabbed Interface */}
      <Tabs.Root value={activeTab} onValueChange={value => setActiveTab(value as 'selection' | 'tool')}>
        {/* Tab Headers */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <Tabs.List className="flex">
            <Tabs.Trigger
              value="selection"
              disabled={!selectionTabEnabled}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span>{selectionTabIcon}</span>
              <span>{selectionTabLabel}</span>
            </Tabs.Trigger>
            <Tabs.Trigger
              value="tool"
              disabled={!toolTabEnabled}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <span>{toolTabIcon}</span>
              <span>{toolTabLabel}</span>
            </Tabs.Trigger>
          </Tabs.List>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Selection Tab */}
          <Tabs.Content value="selection" className="h-full">
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
          </Tabs.Content>

          {/* Tool Tab */}
          <Tabs.Content value="tool" className="h-full">
            {activeTool?.inspectorComponent && <activeTool.inspectorComponent tool={activeTool} />}
            {!activeTool?.inspectorComponent && (
              <div className="p-6 text-center">
                <div className="text-gray-500 mb-2">No tool inspector</div>
                <div className="text-sm text-gray-400">Select a tool with configuration options</div>
              </div>
            )}
          </Tabs.Content>

          {/* Action Buttons - Always visible at bottom */}
          <div className="border-t border-gray-200">
            <ActionButtons tool={activeTool} />
          </div>
        </div>
      </Tabs.Root>
    </div>
  )
}
