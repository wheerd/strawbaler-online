import React from 'react'

import { Logo } from '@/shared/ui/Logo'
import { Skeleton } from '@/shared/ui/components/skeleton'

export function HeaderSkeleton(): React.JSX.Element {
  return (
    <header
      className="border-border bg-card flex h-14 items-center justify-between border-b px-4"
      data-testid="header-skeleton"
    >
      <div className="flex items-center gap-4">
        <Logo compact />
        <Skeleton className="h-8 w-40" />
      </div>

      <nav className="flex items-center gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16" />
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="size-8" />
        <Skeleton className="size-3 rounded-full" />
        <Skeleton className="size-8 rounded-full" />
      </div>
    </header>
  )
}
