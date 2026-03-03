import * as Toolbar from '@radix-ui/react-toolbar'
import React from 'react'

import { Skeleton } from '@/shared/ui/components/skeleton'
import { Spinner } from '@/shared/ui/components/spinner'

function EditorToolbarSkeleton(): React.JSX.Element {
  return (
    <div className="border-border flex items-center gap-4 border-b px-4 py-1">
      <div className="flex items-center gap-2">
        <Skeleton className="bg-background h-8 w-50" />
        <Skeleton className="bg-background size-7" />
      </div>

      <div className="bg-border h-6 w-px" />

      <Toolbar.Root>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
          </div>
          <div className="bg-border h-6 w-px" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
          </div>
          <div className="bg-border h-6 w-px" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
            <Skeleton className="bg-background size-10" />
          </div>
          <div className="bg-border h-6 w-px" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
          <div className="bg-border h-6 w-px" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
          <div className="bg-border h-6 w-px" />
          <div className="flex items-center gap-1">
            <Skeleton className="bg-background size-10" />
          </div>
        </div>
      </Toolbar.Root>
    </div>
  )
}

function SidePanelSkeleton(): React.JSX.Element {
  return (
    <div className="bg-card border-border side-panel overflow-hidden border-l p-4">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  )
}

export function EditorPageSkeleton(): React.JSX.Element {
  return (
    <div className="bg-muted m-0 grid h-full w-full grid-rows-[auto_1fr] p-0" data-testid="editor-page-skeleton">
      <EditorToolbarSkeleton />

      <div className="relative grid grid-cols-[1fr_320px] gap-0 overflow-hidden p-0">
        <div className="bg-background border-border relative overflow-hidden border-r">
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="text-muted-foreground size-16 border-4" />
          </div>
        </div>

        <SidePanelSkeleton />
      </div>
    </div>
  )
}
