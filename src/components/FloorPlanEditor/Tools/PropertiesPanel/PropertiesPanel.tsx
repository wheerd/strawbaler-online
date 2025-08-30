import { useCallback } from 'react'
import { useModelStore } from '@/model/store'
import { useSelectedEntity } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { useActiveTool } from '../ToolSystem/ToolContext'
import { WallInspector, RoomInspector, PointInspector, CornerInspector } from './Inspectors'
import { WallToolInspector } from './ToolInspectors/WallToolInspector'
import { ActionButtons } from './ActionButtons'
import type { Entity } from '../ToolSystem/types'
import type { Wall, Room, Point, Corner } from '@/types/model'

export function PropertiesPanel(): React.JSX.Element {
  const selectedEntityId = useSelectedEntity()
  const activeTool = useActiveTool()

  // Get selected entity from model store
  const selectedEntity = useModelStore(state => {
    if (!selectedEntityId) return null

    // Try to find entity in different collections
    const wall = state.walls.get(selectedEntityId as any)
    if (wall) return wall as Entity

    const room = state.rooms.get(selectedEntityId as any)
    if (room) return room as Entity

    const point = state.points.get(selectedEntityId as any)
    if (point) return point as Entity

    // For corners, we need to find by pointId
    const corner = Array.from(state.corners.values()).find(c => c.pointId === selectedEntityId)
    if (corner) return corner as Entity

    return null
  })

  // Handle entity property changes
  const handleEntityPropertyChange = useCallback(
    (property: string, value: any) => {
      if (!selectedEntity || !selectedEntityId) return

      // Apply changes to model store based on entity type
      const modelStore = useModelStore.getState()

      if ('id' in selectedEntity && selectedEntity.id.includes('wall_')) {
        const wall = selectedEntity as Wall
        switch (property) {
          case 'thickness':
            modelStore.updateWallThickness(wall.id, value)
            break
          case 'type':
            modelStore.updateWallType(wall.id, value)
            break
          case 'outsideDirection':
            modelStore.updateWallOutsideDirection(wall.id, value)
            break
          default:
            console.warn(`Unknown wall property: ${property}`)
        }
      } else if ('id' in selectedEntity && selectedEntity.id.includes('room_')) {
        const room = selectedEntity as Room
        switch (property) {
          case 'name':
            modelStore.updateRoomName(room.id, value)
            break
          default:
            console.warn(`Unknown room property: ${property}`)
        }
      } else if ('id' in selectedEntity && selectedEntity.id.includes('point_')) {
        const point = selectedEntity as Point
        switch (property) {
          case 'position':
            modelStore.movePoint(point.id, value)
            break
          default:
            console.warn(`Unknown point property: ${property}`)
        }
      }
      // Corner properties would be handled similarly
    },
    [selectedEntity, selectedEntityId]
  )

  // Handle tool property changes
  const handleToolPropertyChange = useCallback(
    (_property: string, _value: any) => {
      // Tool properties are handled directly by the tool inspectors
      // This callback is mainly for triggering re-renders or additional logic
    },
    [activeTool]
  )

  // Render entity inspector based on entity type
  const renderEntityInspector = () => {
    if (!selectedEntity) return null

    if ('id' in selectedEntity && selectedEntity.id.includes('wall_')) {
      return <WallInspector wall={selectedEntity as Wall} onChange={handleEntityPropertyChange} />
    }

    if ('id' in selectedEntity && selectedEntity.id.includes('room_')) {
      return <RoomInspector room={selectedEntity as Room} onChange={handleEntityPropertyChange} />
    }

    if ('id' in selectedEntity && selectedEntity.id.includes('point_')) {
      return <PointInspector point={selectedEntity as Point} onChange={handleEntityPropertyChange} />
    }

    if ('pointId' in selectedEntity) {
      return <CornerInspector corner={selectedEntity as Corner} onChange={handleEntityPropertyChange} />
    }

    return (
      <div className="unknown-entity">
        <h3>Unknown Entity Type</h3>
        <p>Entity type not recognized: {typeof selectedEntity}</p>
      </div>
    )
  }

  // Render tool inspector if tool has one
  const renderToolInspector = () => {
    if (!activeTool?.hasInspector) return null

    // For now, only wall tools have inspectors
    if (activeTool.category === 'walls') {
      return <WallToolInspector tool={activeTool as any} onPropertyChange={handleToolPropertyChange} />
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
          {selectedEntity ? (
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
          <ActionButtons entity={selectedEntity} tool={activeTool} />
        </div>
      </div>
    </div>
  )
}
