import { Box, Flex } from '@radix-ui/themes'
import React from 'react'

import { CanvasSkeleton, SidePanelSkeleton, ToolbarSkeleton } from '.'

/**
 * App-level skeleton that shows when React has loaded but FloorPlanEditor is still loading
 * This is a more refined version of the HTML skeleton
 */
export function AppSkeleton(): React.JSX.Element {
  return (
    <Box
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'var(--gray-2)'
      }}
      data-testid="app-skeleton"
    >
      {/* Top Toolbar Skeleton */}
      <Box style={{ flexShrink: 0, zIndex: 100, borderBottom: '1px solid var(--gray-6)' }}>
        <ToolbarSkeleton />
      </Box>

      {/* Main Content Area - Canvas + Side Panel */}
      <Flex style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Canvas Area Skeleton */}
        <CanvasSkeleton />

        {/* Right Side Panel Skeleton */}
        <Box
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--gray-2)',
            overflowY: 'auto'
          }}
        >
          <SidePanelSkeleton />
        </Box>
      </Flex>
    </Box>
  )
}
