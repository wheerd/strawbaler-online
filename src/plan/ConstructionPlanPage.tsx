import { Suspense, lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  TAG_BASE_PLATE,
  TAG_DECKING,
  TAG_ROOF,
  TAG_SUBFLOOR,
  TAG_TOP_PLATE,
  TAG_WALLS
} from '@/construction/model/tags'
import { type ConstructionModelId, useConstructionModel } from '@/construction/store'
import type { PartId } from '@/parts/types'
import { ConstructionPartsList } from '@/parts/ui/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/parts/ui/ConstructionVirtualPartsList'
import { IssueDescriptionPanel } from '@/plan/IssueDescriptionPanel'
import { PartHighlightPanel } from '@/plan/PartHighlightPanel'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'
import { Tabs } from '@/shared/ui/components/tabs'
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
  const { setHighlightedPartId } = usePlanHighlight()
  const [activeTab, setActiveTab] = useState<'plan' | 'parts' | 'modules'>('plan')
  const [currentViewIndex, setCurrentViewIndex] = useState(0)
  const [containerSize, containerRef] = elementSizeRef()

  const modelId = undefined as ConstructionModelId | undefined
  const model = useConstructionModel(modelId)

  const viewsWithLabels: ViewOption[] = defaultViews.map(view => ({
    ...view,
    label:
      view.label === 'Walls'
        ? t($ => $.planModal.views.walls)
        : view.label === 'Roof'
          ? t($ => $.planModal.views.roof)
          : t($ => $.planModal.views.floor)
  }))

  const handleViewInPlan = (partId: string) => {
    setHighlightedPartId(partId as PartId)
    setActiveTab('plan')
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Tabs.Root
        value={activeTab}
        onValueChange={value => {
          setActiveTab(value as 'plan' | 'parts' | 'modules')
        }}
        className="flex h-full w-full flex-col"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <Tabs.List>
            <Tabs.Trigger value="plan">{t($ => $.planModal.tabs.planIssues)}</Tabs.Trigger>
            <Tabs.Trigger value="parts">{t($ => $.planModal.tabs.partsList)}</Tabs.Trigger>
            <Tabs.Trigger value="modules">{t($ => $.planModal.tabs.modules)}</Tabs.Trigger>
          </Tabs.List>
          <Suspense fallback={null}>
            <ConstructionModelRegenerateButton />
          </Suspense>
        </div>

        <Tabs.Content value="plan" className="flex min-h-0 flex-1 p-0">
          {model ? (
            <div className="flex h-full w-full flex-col gap-2 overflow-hidden p-4">
              <div ref={containerRef} className="relative flex min-h-0 flex-1 overflow-hidden rounded-md border">
                <TagVisibilityProvider
                  defaultHidden={['floor-layer', 'wall-layer', 'roof-layer', 'finished-measurement']}
                >
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

              <div className="flex w-full shrink-0">
                <IssueDescriptionPanel model={model} />
              </div>
            </div>
          ) : (
            <PlanSkeleton />
          )}
        </Tabs.Content>

        <Tabs.Content value="parts" className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          {model ? <ConstructionPartsList modelId={modelId} onViewInPlan={handleViewInPlan} /> : <PartsSkeleton />}
        </Tabs.Content>

        <Tabs.Content value="modules" className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          {model ? (
            <ConstructionVirtualPartsList modelId={modelId} onViewInPlan={handleViewInPlan} />
          ) : (
            <PartsSkeleton />
          )}
        </Tabs.Content>
      </Tabs.Root>
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

function PartsSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  )
}

function CardSkeleton() {
  return <Skeleton className="h-[160px] rounded-lg" />
}
