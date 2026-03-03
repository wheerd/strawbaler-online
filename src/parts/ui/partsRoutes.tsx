import React, { Suspense, lazy } from 'react'
import { Navigate } from 'react-router-dom'

import { PartsListContentSkeleton } from '@/parts/ui/PartsListContentSkeleton'
import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'

const PartsListLayout = lazy(async () => {
  const module = await import('./PartsListLayout')
  return { default: module.PartsListLayout }
})

const ConstructionPartsList = lazy(async () => {
  const module = await import('./ConstructionPartsList')
  return { default: module.ConstructionPartsList }
})

const ConstructionVirtualPartsList = lazy(async () => {
  const module = await import('./ConstructionVirtualPartsList')
  return { default: module.ConstructionVirtualPartsList }
})

export const partsRoutes = {
  path: 'parts',
  element: (
    <Suspense fallback={<PartsListLayoutSkeleton />}>
      <PartsListLayout />
    </Suspense>
  ),
  children: [
    { index: true, element: <Navigate to="materials" replace /> },
    {
      path: 'materials',
      element: (
        <Suspense fallback={<PartsListContentSkeleton />}>
          <ConstructionPartsList modelId={undefined} />
        </Suspense>
      )
    },
    {
      path: 'modules',
      element: (
        <Suspense fallback={<PartsListContentSkeleton />}>
          <ConstructionVirtualPartsList modelId={undefined} />
        </Suspense>
      )
    }
  ]
}

function PartsListLayoutSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden" data-testid="parts-list-layout-skeleton">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex gap-1">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="h-8 w-[90px] rounded" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
        <Spinner className="text-muted-foreground size-8" />
      </div>
    </div>
  )
}
