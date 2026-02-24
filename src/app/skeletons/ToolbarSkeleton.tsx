import * as Toolbar from '@radix-ui/react-toolbar'
import React from 'react'

import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/shared/components/Logo'

export function ToolbarSkeleton(): React.JSX.Element {
  return (
    <div className="border-border flex items-center gap-4 border-b p-2" data-testid="toolbar-skeleton">
      {/* Logo + ProjectMenu */}
      <div className="flex items-center gap-1">
        <Logo compact />
        <Skeleton className="bg-background h-8 w-50" />
      </div>

      {/* Tools skeleton */}
      <Toolbar.Root>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
        </div>
      </Toolbar.Root>

      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="bg-background size-10" />
        <Skeleton className="bg-background size-10" />
        <Skeleton className="bg-background size-10" />
        <Skeleton className="bg-background size-10" />
        <Skeleton className="bg-background size-8 rounded-full" />
      </div>
    </div>
  )
}
