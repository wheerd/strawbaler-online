import React from 'react'

import { EditorSkeleton } from './EditorSkeleton'
import { SidePanelSkeleton } from './SidePanelSkeleton'
import { ToolbarSkeleton } from './ToolbarSkeleton'

export function AppSkeleton(): React.JSX.Element {
  return (
    <div className="bg-muted grid h-screen w-screen grid-rows-[auto_1fr] overflow-hidden" data-testid="app-skeleton">
      <div className="border-border z-100 shrink-0 border-b">
        <ToolbarSkeleton />
      </div>

      <div className="relative grid min-h-0 grid-cols-[1fr_320px] overflow-hidden">
        <EditorSkeleton />
        <SidePanelSkeleton />
      </div>
    </div>
  )
}
