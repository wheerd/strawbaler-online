import { Suspense, lazy, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useActiveStoreyId } from '@/building/store'
import {
  TAG_BASE_PLATE,
  TAG_DECKING,
  TAG_ROOF,
  TAG_SUBFLOOR,
  TAG_TOP_PLATE,
  TAG_WALLS
} from '@/construction/model/tags'
import { useConstructionModel } from '@/construction/store'
import type { PartId } from '@/parts/types'
import { IssueDescriptionPanel } from '@/plan/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/plan/PartHighlightPanel'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'
import { elementSizeRef } from '@/shared/ui/hooks/useElementSize'

import { ConstructionPlan, TOP_VIEW, type ViewOption } from './ConstructionPlan'
import { PlanHighlightProvider, usePlanHighlight } from './PlanHighlightContext'
import { TagVisibilityProvider } from './TagVisibilityContext'

const ConstructionModelRegenerateButton = lazy(() => import('@/construction/ui/ConstructionModelRegenerateButton'))

const defaultViews: ViewOption[] = [
  {
    view: TOP_VIEW,
    label: 'Walls',
    alwaysHiddenTags: [TAG_ROOF.id, 'roof-measurement', 'floor-measurement']
  },
  {
    view: TOP_VIEW,
    label: 'Roof',
    alwaysHiddenTags: ['wall-measurement', 'opening-measurement', 'floor-measurement'],
    toggleHideTags: [TAG_DECKING.id]
  },
  {
    view: TOP_VIEW,
    label: 'Floor',
    alwaysHiddenTags: [
      TAG_WALLS.id,
      TAG_BASE_PLATE.id,
      TAG_TOP_PLATE.id,
      TAG_ROOF.id,
      'wall-measurement',
      'roof-measurement',
      'opening-measurement'
    ],
    toggleHideTags: [TAG_SUBFLOOR.id]
  }
]

function ConstructionPlanPageContent() {
  const { t } = useTranslation('construction')
  const location = useLocation()
  const { setHighlightedPartId } = usePlanHighlight()
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [containerSize, containerRef] = elementSizeRef()

  const storeyId = useActiveStoreyId()
  const model = useConstructionModel(storeyId)

  const state = location.state as { highlightedPartId?: PartId } | null
  const highlightedPartIdFromNav = state?.highlightedPartId

  useEffect(() => {
    if (highlightedPartIdFromNav) {
      setHighlightedPartId(highlightedPartIdFromNav)
    }
  }, [highlightedPartIdFromNav, setHighlightedPartId])

  const viewsWithLabels: ViewOption[] = defaultViews.map(view => ({
    ...view,
    label:
      view.label === 'Walls'
        ? t($ => $.planModal.views.walls)
        : view.label === 'Roof'
          ? t($ => $.planModal.views.roof)
          : t($ => $.planModal.views.floor)
  }))

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        TODO: Wall mode
        <Suspense fallback={null}>
          <ConstructionModelRegenerateButton />
        </Suspense>
      </div>

      {model ? (
        <div className="flex h-full w-full flex-col gap-2 overflow-hidden">
          <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden border-b">
            <TagVisibilityProvider defaultHidden={['floor-layer', 'wall-layer', 'roof-layer', 'finished-measurement']}>
              <ConstructionPlan
                model={model}
                views={viewsWithLabels}
                containerSize={containerSize}
                midCutActiveDefault
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
      <ConstructionPlanPageContent />
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
