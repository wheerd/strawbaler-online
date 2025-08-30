import { useState, useCallback } from 'react'
import type { Wall, WallType, OutsideDirection } from '@/types/model'
import { useModelStore } from '@/model/store'
import { createLength } from '@/types/geometry'

interface WallInspectorProps {
  wall: Wall
  onChange: (property: string, value: any) => void
}

interface CornerAction {
  pointId: string
  connectedWalls: string[]
  canSwitchMainWalls: boolean
}

export function WallInspector({ wall, onChange }: WallInspectorProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true)

  // Get model store data
  const getWallsAtPoint = useModelStore(state => state.getWallsConnectedToPoint)
  const getPoint = useModelStore(state => state.points.get.bind(state.points))

  // Calculate corner actions
  const cornerActions: CornerAction[] = [wall.startPointId, wall.endPointId]
    .map(pointId => {
      const connectedWalls = getWallsAtPoint(pointId, wall.floorId)
      return {
        pointId,
        connectedWalls: connectedWalls.map(w => w.id).filter(id => id !== wall.id),
        canSwitchMainWalls: connectedWalls.length >= 2
      }
    })
    .filter(action => action.canSwitchMainWalls)

  // Material options
  const materialOptions = [
    { value: 'concrete', label: 'Concrete' },
    { value: 'brick', label: 'Brick' },
    { value: 'drywall', label: 'Drywall' },
    { value: 'wood', label: 'Wood Frame' },
    { value: 'steel', label: 'Steel Frame' },
    { value: 'block', label: 'Concrete Block' },
    { value: 'stone', label: 'Stone' }
  ]

  const handleThicknessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(50, Math.min(1000, Number(e.target.value))) // Clamp between 50mm and 1000mm
      onChange('thickness', createLength(value))
    },
    [onChange]
  )

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange('type', e.target.value as WallType)
    },
    [onChange]
  )

  const handleOutsideDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value === '' ? undefined : (e.target.value as OutsideDirection)
      onChange('outsideDirection', value)
    },
    [onChange]
  )

  const handleMaterialChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange('material', e.target.value)
    },
    [onChange]
  )

  const handleCornerAction = useCallback((pointId: string) => {
    // This would trigger corner main wall switching
    console.log(`Switching main walls for corner at point ${pointId}`)
    // Implementation would be added to open corner configuration dialog
  }, [])

  const calculateWallLength = (): string => {
    const startPoint = getPoint(wall.startPointId)
    const endPoint = getPoint(wall.endPointId)

    if (startPoint && endPoint) {
      const length = Math.hypot(
        endPoint.position.x - startPoint.position.x,
        endPoint.position.y - startPoint.position.y
      )
      return `${(length / 1000).toFixed(2)} m`
    }

    return 'N/A'
  }

  return (
    <div className="wall-inspector">
      <div className="inspector-header">
        <button
          className="inspector-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
          <h3>Wall Properties</h3>
        </button>
      </div>

      {isExpanded && (
        <div className="inspector-content">
          {/* Basic Properties */}
          <div className="property-section">
            <h4>Basic Properties</h4>

            <div className="property-group">
              <label htmlFor="wall-type">Wall Type</label>
              <select id="wall-type" value={wall.type} onChange={handleTypeChange}>
                <option value="structural">Structural</option>
                <option value="partition">Partition</option>
                <option value="outer">Outer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="property-group">
              <label htmlFor="wall-thickness">Thickness (mm)</label>
              <input
                id="wall-thickness"
                type="number"
                value={wall.thickness}
                onChange={handleThicknessChange}
                min="50"
                max="1000"
                step="10"
              />
            </div>

            {wall.type === 'outer' && (
              <div className="property-group">
                <label htmlFor="outside-direction">Outside Direction</label>
                <select
                  id="outside-direction"
                  value={wall.outsideDirection || ''}
                  onChange={handleOutsideDirectionChange}
                >
                  <option value="">Not Set</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>
            )}

            <div className="property-group">
              <label htmlFor="wall-material">Material</label>
              <select id="wall-material" value={(wall as any).material || 'concrete'} onChange={handleMaterialChange}>
                {materialOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Measurements */}
          <div className="property-section">
            <h4>Measurements</h4>

            <div className="measurement-group">
              <div className="measurement">
                <label>Length:</label>
                <span className="measurement-value">{calculateWallLength()}</span>
              </div>
              <div className="measurement">
                <label>Thickness:</label>
                <span className="measurement-value">{wall.thickness} mm</span>
              </div>
            </div>
          </div>

          {/* Openings */}
          {wall.openings && wall.openings.length > 0 && (
            <div className="property-section">
              <h4>Openings ({wall.openings.length})</h4>

              <div className="openings-list">
                {wall.openings.map((opening, index) => (
                  <div key={index} className="opening-item">
                    <span className="opening-type">{opening.type}</span>
                    <span className="opening-dimensions">
                      {opening.width} × {opening.height} mm
                    </span>
                    <button
                      className="remove-opening"
                      onClick={() => {
                        // Remove opening implementation
                        console.log(`Remove opening ${index} from wall ${wall.id}`)
                      }}
                      title="Remove opening"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button className="add-opening-btn">+ Add Opening</button>
            </div>
          )}

          {/* Corner Actions */}
          {cornerActions.length > 0 && (
            <div className="property-section">
              <h4>Corner Configuration</h4>

              <div className="corner-actions">
                {cornerActions.map(action => (
                  <div key={action.pointId} className="corner-action">
                    <label>Corner at Point {action.pointId}:</label>
                    <button className="corner-action-button" onClick={() => handleCornerAction(action.pointId)}>
                      Configure Main Walls ({action.connectedWalls.length} connected)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Room Connections */}
          <div className="property-section">
            <h4>Room Connections</h4>

            <div className="room-connections">
              <div className="room-connection">
                <label>Left Room:</label>
                <span className="room-value">{wall.leftRoomId ? `Room ${wall.leftRoomId}` : 'None'}</span>
              </div>
              <div className="room-connection">
                <label>Right Room:</label>
                <span className="room-value">{wall.rightRoomId ? `Room ${wall.rightRoomId}` : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
