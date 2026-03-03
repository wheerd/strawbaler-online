import { useEffect, useState } from 'react'

import type { ConstructionModel } from '@/construction/model/model'
import { type ConstructionModelId, useConstructionModel } from '@/construction/store'
import { Spinner } from '@/shared/ui/components/spinner'

import ConstructionViewer3D from './ConstructionViewer3D'
import type { ExportFormat } from './components/ExportButton'
import { acquireGeometryCache, prewarmGeometryCache, releaseGeometryCache } from './utils/geometryCache'
import { acquireMaterialCache, releaseMaterialCache } from './utils/materialCache'

export interface ConstructionViewer3DContentProps {
  modelId: ConstructionModelId
  containerSize: { width: number; height: number }
  isOpen: boolean
  onExportReady?: (exportFn: (format: ExportFormat) => void | Promise<void>) => void
}

export default function ConstructionViewer3DContent({
  modelId,
  containerSize,
  isOpen,
  onExportReady
}: ConstructionViewer3DContentProps) {
  const constructionModel = useConstructionModel(modelId)
  const geometryReady = useGeometryPrewarm(constructionModel)
  const shouldRenderCanvas = useDeferredCanvasMount(
    isOpen && geometryReady && containerSize.width > 0 && containerSize.height > 0
  )

  useEffect(() => {
    if (!shouldRenderCanvas) {
      return
    }

    acquireGeometryCache()
    acquireMaterialCache()

    return () => {
      releaseMaterialCache()
      releaseGeometryCache()
    }
  }, [shouldRenderCanvas])

  if (!constructionModel || !shouldRenderCanvas) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <ConstructionViewer3D model={constructionModel} containerSize={containerSize} onExportReady={onExportReady} />
}

function useDeferredCanvasMount(isEnabled: boolean): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isEnabled) {
      setReady(false)
      return
    }

    let cancelled = false
    let frameId: number | null = requestAnimationFrame(() => {
      if (!cancelled) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
        frameId = null
      }
    }
  }, [isEnabled])

  return ready
}

function useGeometryPrewarm(model: ConstructionModel | null): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!model) {
      setReady(false)
      return
    }

    prewarmGeometryCache(model)
    setReady(true)
  }, [model])

  return ready
}
