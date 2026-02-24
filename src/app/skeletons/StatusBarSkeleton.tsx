import React from 'react'

import { Skeleton } from '@/components/ui/skeleton'

export function StatusBarSkeleton(): React.JSX.Element {
  return (
    <div
      className="bg-card border-border pointer-events-none absolute right-0 bottom-0 left-0 z-5 m-0 h-9 border-t p-0 px-1"
      data-testid="statusbar-skeleton"
    >
      <div className="pointer-events-auto grid h-full grid-cols-[1fr_1fr_1fr] items-center gap-4 p-0.5">
        <div className="flex items-center gap-3 p-0">
          <Skeleton className="bg-secondary m-1 h-3 w-3 rounded-full" />
          <Skeleton className="bg-secondary h-7 w-7" />
          <Skeleton className="bg-secondary h-7 w-7" />
        </div>

        <div className="flex items-center justify-center gap-3">
          <Skeleton className="bg-secondary h-7 w-32" />
          <Skeleton className="bg-secondary h-7 w-7" />
        </div>

        <div className="flex items-center justify-end gap-3">
          <Skeleton className="bg-secondary h-7 w-7" />
          <Skeleton className="bg-secondary h-7 w-[6em]" />
        </div>
      </div>
    </div>
  )
}
