import React from 'react'

import { GridSizeDisplay } from '@/editor/status-bar/GridSizeDisplay'
import { PointerPositionDisplay } from '@/editor/status-bar/PointerPositionDisplay'

export function EditorStatusOverlay(): React.JSX.Element {
  return (
    <div
      className="bg-card/80 pointer-events-auto absolute right-2 bottom-2 z-10 flex items-center gap-3 rounded-md border px-3 py-1.5 backdrop-blur-sm"
      data-testid="editor-status-overlay"
    >
      <PointerPositionDisplay />
      <GridSizeDisplay />
    </div>
  )
}
