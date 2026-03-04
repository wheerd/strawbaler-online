import { Suspense, lazy, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { type StoreyId, isStoreyId } from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import { StoreySelector } from '@/editor/status-bar/StoreySelector'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'
import { elementSizeRef } from '@/shared/ui/hooks/useElementSize'

import { Viewer3DViewProvider, useViewer3DView } from './Viewer3DViewContext'
import { Viewer3DViewControls } from './Viewer3DViewControls'
import type { ExportFormat } from './components/ExportButton'
import ExportButton from './components/ExportButton'
import { TagOpacityProvider } from './context/TagOpacityContext'

const ConstructionModelRegenerateButton = lazy(() => import('@/construction/ui/ConstructionModelRegenerateButton'))

const ConstructionViewer3DContent = lazy(() => import('./ConstructionViewer3DContent'))

function Viewer3DPageContent(): React.JSX.Element {
  const [containerSize, containerRef, setObserverActive] = elementSizeRef()
  const { modelId, focusId } = useViewer3DView()
  const navigate = useNavigate()
  const exportFnRef = useRef<((format: ExportFormat) => void | Promise<void>) | null>(null)
  const activeStoreyId = useActiveStoreyId()
  const storeyId = focusId && isStoreyId(focusId) ? focusId : activeStoreyId

  useEffect(() => {
    setObserverActive(true)
    return () => {
      setObserverActive(false)
    }
  }, [setObserverActive])

  const handleStoreyChange = useCallback(
    (storeyId: StoreyId) => {
      void navigate(`/3d-view/${storeyId}`)
    },
    [navigate]
  )

  const handleExportReady = useCallback((exportFn: (format: ExportFormat) => void | Promise<void>) => {
    exportFnRef.current = exportFn
  }, [])

  const handleExport = useCallback((format: ExportFormat) => void exportFnRef.current?.(format), [])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-1">
        <StoreySelector value={storeyId} onStoreyChange={handleStoreyChange} />

        <Viewer3DViewControls />

        <div className="flex items-center gap-2">
          <ExportButton onExport={handleExport} />
          <Suspense fallback={null}>
            <ConstructionModelRegenerateButton />
          </Suspense>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
          <Suspense
            fallback={
              <div className="relative h-full w-full">
                <Skeleton height="100%" />
                <div
                  className="absolute top-1/2 left-1/2 z-10 scale-[3]"
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
                  <Spinner size="lg" />
                </div>
                <div className="absolute top-[12px] left-[12px] z-10">
                  <Skeleton
                    height="48px"
                    width="90px"
                    style={{
                      borderRadius: 'var(--radius-3)',
                      boxShadow: 'var(--shadow-3)'
                    }}
                  />
                </div>
              </div>
            }
          >
            <TagOpacityProvider>
              <ConstructionViewer3DContent
                modelId={modelId}
                containerSize={containerSize}
                isOpen
                onExportReady={handleExportReady}
              />
            </TagOpacityProvider>
          </Suspense>
        </div>
      </div>
    </div>
  )
}

export function Viewer3DPage(): React.JSX.Element {
  return (
    <Viewer3DViewProvider>
      <Viewer3DPageContent />
    </Viewer3DViewProvider>
  )
}
