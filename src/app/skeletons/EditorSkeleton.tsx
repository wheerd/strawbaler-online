import React from 'react'

import { Spinner } from '@/components/ui/spinner'

import { StatusBarSkeleton } from './StatusBarSkeleton'

export function EditorSkeleton(): React.JSX.Element {
  return (
    <div className="border-border bg-background relative flex-1 overflow-hidden border-r" data-testid="editor-skeleton">
      <div className="bg-background absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="text-muted-foreground size-50 border-10" />
        </div>
      </div>
      <StatusBarSkeleton />
    </div>
  )
}
