import React from 'react'

import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'

function SummaryCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-lg bg-[var(--gray-3)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <Skeleton className="h-[100px] w-full" />
    </div>
  )
}

function DetailCardSkeleton(): React.JSX.Element {
  return (
    <div className="rounded-lg bg-[var(--gray-3)] p-3">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="size-6 rounded" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-[120px] w-full" />
    </div>
  )
}

export function PartsListContentSkeleton(): React.JSX.Element {
  return (
    <div className="flex w-full flex-col gap-4" data-testid="parts-list-content-skeleton">
      <SummaryCardSkeleton />
      <DetailCardSkeleton />
      <div className="flex justify-center">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    </div>
  )
}
