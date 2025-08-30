import { useCallback } from 'react'
import type { ToolInspectorProps } from '../../ToolSystem/types'
import type { BaseWallTool, WallToolState } from '../../Categories/WallTools/BaseWallTool'

type WallTool = BaseWallTool

interface WallToolInspectorProps extends ToolInspectorProps {
  tool: WallTool
}

export function WallToolInspector({ tool, onPropertyChange }: WallToolInspectorProps): React.JSX.Element {
  const state = tool.state as WallToolState

  // Material options based on wall type
  const getMaterialOptions = () => {
    if (tool.id === 'wall.structural') {
      return [
        { value: 'concrete', label: 'Concrete' },
        { value: 'brick', label: 'Brick' },
        { value: 'block', label: 'Concrete Block' },
        { value: 'steel', label: 'Steel Frame' },
        { value: 'wood', label: 'Wood Frame' },
        { value: 'stone', label: 'Stone' }
      ]
    } else {
      // partition walls
      return [
        { value: 'drywall', label: 'Drywall' },
        { value: 'wood', label: 'Wood Frame' },
        { value: 'glass', label: 'Glass Partition' },
        { value: 'metal', label: 'Metal Stud' },
        { value: 'plaster', label: 'Plaster' }
      ]
    }
  }

  const handleThicknessChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(50, Math.min(1000, Number(e.target.value)))
      if ('setThickness' in tool) {
        tool.setThickness(value)
      }
      onPropertyChange('thickness', value)
    },
    [tool, onPropertyChange]
  )

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(1000, Math.min(5000, Number(e.target.value)))
      if ('setHeight' in tool) {
        tool.setHeight(value)
      }
      onPropertyChange('height', value)
    },
    [tool, onPropertyChange]
  )

  const handleMaterialChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      if ('setMaterial' in tool) {
        tool.setMaterial(e.target.value)
      }
      onPropertyChange('material', e.target.value)
    },
    [tool, onPropertyChange]
  )

  const handlePresetThickness = useCallback(
    (thickness: number) => {
      if ('setThickness' in tool) {
        tool.setThickness(thickness)
      }
      onPropertyChange('thickness', thickness)
    },
    [tool, onPropertyChange]
  )

  return (
    <div className="wall-tool-inspector">
      <h4>{tool.name} Settings</h4>

      {/* Thickness Setting */}
      <div className="property-group">
        <label htmlFor="wall-tool-thickness">Wall Thickness (mm)</label>
        <input
          id="wall-tool-thickness"
          type="number"
          value={state.thickness}
          onChange={handleThicknessChange}
          min="50"
          max="1000"
          step="25"
        />
        <div className="input-help">Use [ and ] keys to adjust thickness quickly</div>
      </div>

      {/* Thickness Presets */}
      <div className="property-group">
        <label>Quick Thickness:</label>
        <div className="preset-buttons">
          {tool.id === 'wall.structural' ? (
            <>
              <button className="preset-btn" onClick={() => handlePresetThickness(150)}>
                150mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(200)}>
                200mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(250)}>
                250mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(300)}>
                300mm
              </button>
            </>
          ) : (
            <>
              <button className="preset-btn" onClick={() => handlePresetThickness(75)}>
                75mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(100)}>
                100mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(125)}>
                125mm
              </button>
              <button className="preset-btn" onClick={() => handlePresetThickness(150)}>
                150mm
              </button>
            </>
          )}
        </div>
      </div>

      {/* Height Setting */}
      <div className="property-group">
        <label htmlFor="wall-tool-height">Wall Height (mm)</label>
        <input
          id="wall-tool-height"
          type="number"
          value={state.height}
          onChange={handleHeightChange}
          min="1000"
          max="5000"
          step="100"
        />
      </div>

      {/* Height Presets */}
      <div className="property-group">
        <label>Standard Heights:</label>
        <div className="preset-buttons">
          <button
            className="preset-btn"
            onClick={() => {
              if ('setHeight' in tool) tool.setHeight(2400)
              onPropertyChange('height', 2400)
            }}
          >
            2.4m
          </button>
          <button
            className="preset-btn"
            onClick={() => {
              if ('setHeight' in tool) tool.setHeight(2700)
              onPropertyChange('height', 2700)
            }}
          >
            2.7m
          </button>
          <button
            className="preset-btn"
            onClick={() => {
              if ('setHeight' in tool) tool.setHeight(3000)
              onPropertyChange('height', 3000)
            }}
          >
            3.0m
          </button>
        </div>
      </div>

      {/* Material Setting */}
      <div className="property-group">
        <label htmlFor="wall-tool-material">Material</label>
        <select id="wall-tool-material" value={state.material} onChange={handleMaterialChange}>
          {getMaterialOptions().map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drawing Status */}
      <div className="property-group">
        <div className="status-indicator">
          <label>Status:</label>
          <span className={`status-badge ${state.isDrawing ? 'drawing' : 'ready'}`}>
            {state.isDrawing ? 'Drawing...' : 'Ready'}
          </span>
        </div>

        {state.isDrawing && (
          <div className="drawing-help">
            <p>Click to place the end point of the wall.</p>
            <p>
              Press <kbd>Escape</kbd> to cancel.
            </p>
          </div>
        )}

        {!state.isDrawing && (
          <div className="drawing-help">
            <p>Click to start drawing a {tool.name.toLowerCase()}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
