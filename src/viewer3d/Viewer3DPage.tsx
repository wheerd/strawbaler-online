import { Suspense, lazy, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { type ConstructionModelId } from '@/construction/store'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'
import { elementSizeRef } from '@/shared/ui/hooks/useElementSize'

import { TagOpacityProvider } from './context/TagOpacityContext'

const ConstructionModelRegenerateButton = lazy(() => import('@/construction/ui/ConstructionModelRegenerateButton'))
const ConstructionViewer3DContent = lazy(() => import('./ConstructionViewer3DContent'))

export function Viewer3DPage(): React.JSX.Element {
  const { t } = useTranslation('construction')
  const [containerSize, containerRef, setObserverActive] = elementSizeRef()

  useEffect(() => {
    setObserverActive(true)
    return () => {
      setObserverActive(false)
    }
  }, [setObserverActive])

  const modelId = undefined as ConstructionModelId | undefined

  return (
    <div className="flex h-full w-full flex-col overflow-hidden p-4">
      <h1 className="mb-4 text-xl font-semibold">{t($ => $.viewer3DModal.title)}</h1>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-md border"
        style={{
          borderColor: 'var(--color-gray-600)'
        }}
      >
        <Suspense
          fallback={
            <div className="relative h-full w-full">
              <Skeleton height="100%" />
              <div className="absolute top-1/2 left-1/2 z-10 scale-[3]" style={{ transform: 'translate(-50%, -50%)' }}>
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
            <ConstructionViewer3DContent modelId={modelId} containerSize={containerSize} isOpen />
          </TagOpacityProvider>
        </Suspense>

        <div className="absolute right-3 bottom-3 z-10 p-0">
          <Suspense>
            <ConstructionModelRegenerateButton compact />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
