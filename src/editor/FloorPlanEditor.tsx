import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { useAutoClearSelection } from '@/editor/canvas/useAutoClearSelection'
import { ToolSystemProvider } from '@/editor/tools/system/ToolSystemProvider'
import { initializeCloudSync } from '@/projects/services/CloudSyncManager'
import { FeatureErrorFallback } from '@/shared/ui/errors/FeatureErrorFallback'

import { EditorStatusOverlay } from './EditorStatusOverlay'
import { EditorToolbar } from './EditorToolbar'
import { SidePanel } from './SidePanel'
import { FloorPlanStage } from './canvas/FloorPlanStage'
import { ConstraintStatusOverlay } from './canvas/overlay/ConstraintStatusOverlay'
import { EmptyStoreyOverlay } from './canvas/overlay/EmptyStoreyOverlay'
import { InitialSyncOverlay } from './canvas/overlay/InitialSyncOverlay'
import { ViewModeToggle } from './canvas/overlay/ViewModeToggle'
import { LengthInputComponent } from './canvas/services/length-input'
import { useAutoFitOnProjectChange } from './canvas/useAutoFitOnProjectChange'

export function FloorPlanEditor(): React.JSX.Element {
  useEffect(() => void initializeCloudSync(), [])
  useAutoFitOnProjectChange()
  useAutoClearSelection()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const updateDimensions = useCallback(() => {
    if (containerRef.current != null) {
      const { offsetWidth, offsetHeight } = containerRef.current
      const toolbarHeight = 56
      const sidePanelWidth = 320

      const newDimensions = {
        width: Math.max(offsetWidth - sidePanelWidth, 400),
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

  return (
    <ToolSystemProvider>
      <div
        ref={containerRef}
        className="bg-muted m-0 grid h-full w-full grid-rows-[auto_1fr] p-0"
        tabIndex={0}
        data-testid="floor-plan-editor"
      >
        <EditorToolbar />

        <div className="relative grid grid-cols-[1fr_320px] gap-0 overflow-hidden p-0">
          <InitialSyncOverlay />
          <div className="bg-background border-border relative overflow-hidden border-r">
            <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
              <ViewModeToggle />
              <FloorPlanStage width={dimensions.width} height={dimensions.height} />
              <ConstraintStatusOverlay />
              <EditorStatusOverlay />
              <EmptyStoreyOverlay />
              <LengthInputComponent />
            </ErrorBoundary>
          </div>

          <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
            <SidePanel />
          </ErrorBoundary>
        </div>
      </div>
    </ToolSystemProvider>
  )
}
