import React from 'react'

import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'

function Viewer3DToolbarSkeleton(): React.JSX.Element {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-1">
      <Skeleton className="h-8 w-[90px] rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-[90px] rounded" />
      </div>
    </div>
  )
}

export function Viewer3DPageSkeleton(): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden" data-testid="viewer3d-page-skeleton">
      <Viewer3DToolbarSkeleton />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="text-muted-foreground size-16 border-4" />
        </div>
      </div>
    </div>
  )
}
