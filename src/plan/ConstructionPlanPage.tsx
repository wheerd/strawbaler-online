import { Suspense, lazy, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useConstructionModel } from '@/construction/store'
import { StoreySelector } from '@/editor/status-bar/StoreySelector'
import type { PartId } from '@/parts/types'
import { IssueDescriptionPanel } from '@/plan/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/plan/PartHighlightPanel'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'
import { elementSizeRef } from '@/shared/ui/hooks/useElementSize'

import { ConstructionPlan } from './ConstructionPlan'
import { PlanHighlightProvider, usePlanHighlight } from './PlanHighlightContext'
import { PlanViewProvider, usePlanView } from './PlanViewContext'
import { PlanViewControls } from './PlanViewControls'
import { TagVisibilityProvider } from './TagVisibilityContext'

const ConstructionModelRegenerateButton = lazy(() => import('@/construction/ui/ConstructionModelRegenerateButton'))

function ConstructionPlanPageContent() {
  const location = useLocation()
  const { setHighlightedPartId } = usePlanHighlight()
  const [containerSize, containerRef] = elementSizeRef()

  const {
    modelId,
    viewOptions,
    currentViewIndex,
    setCurrentViewIndex,
    defaultHiddenTags,
    midCutActiveDefault,
    focusId
  } = usePlanView()
  const model = useConstructionModel(modelId)

  const state = location.state as { highlightedPartId?: PartId } | null
  const highlightedPartIdFromNav = state?.highlightedPartId

  useEffect(() => {
    if (highlightedPartIdFromNav) {
      setHighlightedPartId(highlightedPartIdFromNav)
    }
  }, [highlightedPartIdFromNav, setHighlightedPartId])

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-1">
        <StoreySelector />
        <PlanViewControls />
        <Suspense fallback={<div />}>
          <ConstructionModelRegenerateButton />
        </Suspense>
      </div>

      {model ? (
        <div className="flex h-full w-full flex-col gap-2 overflow-hidden">
          <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden border-b">
            <TagVisibilityProvider defaultHidden={defaultHiddenTags} key={focusId ?? 'storey'}>
              <ConstructionPlan
                model={model}
                views={viewOptions}
                containerSize={containerSize}
                midCutActiveDefault={midCutActiveDefault}
                currentViewIndex={currentViewIndex}
                setCurrentViewIndex={setCurrentViewIndex}
              />
            </TagVisibilityProvider>
            <PartHighlightPanel />
          </div>

          <div className="flex w-full shrink-0 px-2">
            <IssueDescriptionPanel model={model} />
          </div>
        </div>
      ) : (
        <PlanSkeleton />
      )}
    </div>
  )
}

export function ConstructionPlanPage(): React.JSX.Element {
  return (
    <PlanHighlightProvider>
      <PlanViewProvider>
        <ConstructionPlanPageContent />
      </PlanViewProvider>
    </PlanHighlightProvider>
  )
}

function PlanSkeleton() {
  return (
    <div className="relative h-full w-full">
      <Skeleton height="95vh" />
      <div className="absolute top-[30%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 scale-[3]">
        <Spinner size="lg" />
      </div>
      <div className="absolute top-[12px] left-[12px] z-10">
        <Skeleton height="48px" width="90px" className="rounded-lg shadow-lg" />
      </div>
    </div>
  )
}
