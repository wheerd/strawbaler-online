import { useCallback, useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { WelcomeModal } from '@/app/welcome/WelcomeModal'
import { useWelcomeModal } from '@/app/welcome/useWelcomeModal'
import { ConfigurationModal } from '@/construction/config/components/ConfigurationModal'
import { type ConfigTab, ConfigurationModalContext } from '@/construction/config/context/ConfigurationModalContext'
import { useAutoClearSelection } from '@/editor/canvas/useAutoClearSelection'
import { ToolSystemProvider } from '@/editor/tools/system'
import { initializeCloudSync } from '@/projects/services/CloudSyncManager'
import { FeatureErrorFallback } from '@/shared/ui/errors/FeatureErrorFallback'

import { MainToolbar } from './MainToolbar'
import { SidePanel } from './SidePanel'
import { FloorPlanStage } from './canvas/FloorPlanStage'
import { ConstraintStatusOverlay } from './canvas/overlay/ConstraintStatusOverlay'
import { InitialSyncOverlay } from './canvas/overlay/InitialSyncOverlay'
import { ViewModeToggle } from './canvas/overlay/ViewModeToggle'
import { LengthInputComponent } from './canvas/services/length-input'
import { useAutoFitOnProjectChange } from './canvas/useAutoFitOnProjectChange'
import { StatusBar } from './status-bar/StatusBar'

export function FloorPlanEditor(): React.JSX.Element {
  useEffect(() => void initializeCloudSync(), [])
  useAutoFitOnProjectChange()
  useAutoClearSelection()
  const { isOpen, mode, openManually, handleAccept } = useWelcomeModal()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [configActiveTab, setConfigActiveTab] = useState<ConfigTab>('materials')
  const [configSelectedItemId, setConfigSelectedItemId] = useState<string | undefined>()

  const openConfiguration = useCallback((tab: ConfigTab, itemId?: string) => {
    setConfigActiveTab(tab)
    setConfigSelectedItemId(itemId)
    setConfigModalOpen(true)
  }, [])

  const updateDimensions = useCallback(() => {
    if (containerRef.current != null) {
      const { offsetWidth, offsetHeight } = containerRef.current
      const toolbarHeight = 64
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
      <ConfigurationModalContext.Provider value={{ openConfiguration }}>
        <div
          ref={containerRef}
          className="bg-muted m-0 grid h-screen w-screen grid-rows-[auto_1fr] p-0"
          tabIndex={0}
          data-testid="floor-plan-editor"
        >
          <div className="border-border border-b">
            <MainToolbar onInfoClick={openManually} />
          </div>

          <ConfigurationModal
            open={configModalOpen}
            onOpenChange={setConfigModalOpen}
            activeTab={configActiveTab}
            onTabChange={setConfigActiveTab}
            initialSelectionId={configSelectedItemId}
          />

          <WelcomeModal isOpen={isOpen} mode={mode} onAccept={handleAccept} />

          <div className="relative grid grid-cols-[1fr_320px] gap-0 overflow-hidden p-0">
            <InitialSyncOverlay />
            <div className="bg-background border-border relative overflow-hidden border-r">
              <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
                <ViewModeToggle />
                <FloorPlanStage width={dimensions.width} height={dimensions.height} />
                <ConstraintStatusOverlay />
                <StatusBar />
                <LengthInputComponent />
              </ErrorBoundary>
            </div>

            <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
              <SidePanel />
            </ErrorBoundary>
          </div>
        </div>
      </ConfigurationModalContext.Provider>
    </ToolSystemProvider>
  )
}
