import { useState, useEffect, useRef, useCallback } from 'react'
import { FloorPlanStage } from './Canvas/FloorPlanStageNew'
import { useFloors } from '@/model/store'
import { useEditorStore } from './hooks/useEditorStore'
import { ToolContextProvider, MainToolbar, PropertiesPanel, initializeToolSystem } from './Tools'
import { toolManager } from './Tools/ToolSystem/ToolManager'
import './FloorPlanEditor.css'

export function FloorPlanEditor(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [isToolSystemReady, setIsToolSystemReady] = useState(false)

  const floors = useFloors()
  const setActiveFloor = useEditorStore(state => state.setActiveFloor)

  // Initialize tool system once
  useEffect(() => {
    if (!isToolSystemReady) {
      try {
        initializeToolSystem(toolManager)
        setIsToolSystemReady(true)
        console.log('Tool system ready')
      } catch (error) {
        console.error('Failed to initialize tool system:', error)
      }
    }
  }, [isToolSystemReady])

  // Sync editor store with model store's default floor
  useEffect(() => {
    if (floors.size > 0) {
      const groundFloor = Array.from(floors.values())[0]
      if (groundFloor != null) {
        setActiveFloor(groundFloor.id)
      }
    }
  }, [floors, setActiveFloor])

  const updateDimensions = useCallback(() => {
    if (containerRef.current != null) {
      const { offsetWidth, offsetHeight } = containerRef.current
      const toolbarHeight = 60
      const propertiesPanelWidth = 300

      const newDimensions = {
        width: Math.max(offsetWidth - propertiesPanelWidth, 400),
        height: Math.max(offsetHeight - toolbarHeight, 400)
      }

      setDimensions(prevDimensions => {
        if (prevDimensions.width !== newDimensions.width || prevDimensions.height !== newDimensions.height) {
          return newDimensions
        }
        return prevDimensions
      })
    }
  }, [])

  useEffect(() => {
    updateDimensions()

    const handleResize = (): void => {
      updateDimensions()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [updateDimensions])

  if (!isToolSystemReady) {
    return (
      <div className="floor-plan-editor loading">
        <div className="loading-message">
          <p>Initializing tool system...</p>
        </div>
      </div>
    )
  }

  return (
    <ToolContextProvider>
      <div ref={containerRef} className="floor-plan-editor with-tools">
        {/* Main Toolbar */}
        <div className="toolbar-section">
          <MainToolbar />
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          {/* Canvas */}
          <div className="canvas-container">
            <FloorPlanStage width={dimensions.width} height={dimensions.height} />
          </div>

          {/* Properties Panel */}
          <div className="properties-section">
            <PropertiesPanel />
          </div>
        </div>
      </div>
    </ToolContextProvider>
  )
}
