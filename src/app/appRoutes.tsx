import React, { Suspense } from 'react'
import type { RouteObject } from 'react-router-dom'

import { EditorPageSkeleton } from '@/app/skeletons/EditorPageSkeleton'
import { configRoutes } from '@/config/ui/routes'
import { partsRoutes } from '@/parts/ui/partsRoutes'
import { ConstructionPlanPageSkeleton } from '@/plan/ConstructionPlanPageSkeleton'
import { Viewer3DPageSkeleton } from '@/viewer3d/Viewer3DPageSkeleton'

import { WelcomePage } from './welcome/WelcomePage'

const FloorPlanEditor = React.lazy(
  async () =>
    await import('@/editor/FloorPlanEditor').then(module => ({
      default: module.FloorPlanEditor
    }))
)

const ConstructionPlanPage = React.lazy(
  async () =>
    await import('@/plan/ConstructionPlanPage').then(module => ({
      default: module.ConstructionPlanPage
    }))
)

const Viewer3DPage = React.lazy(
  async () =>
    await import('@/viewer3d/Viewer3DPage').then(module => ({
      default: module.Viewer3DPage
    }))
)

export const appRoutes: RouteObject[] = [
  { index: true, element: <WelcomePage /> },
  {
    path: 'editor',
    element: (
      <Suspense fallback={<EditorPageSkeleton />}>
        <FloorPlanEditor />
      </Suspense>
    )
  },
  {
    path: 'plan/:focusId?',
    element: (
      <Suspense fallback={<ConstructionPlanPageSkeleton />}>
        <ConstructionPlanPage />
      </Suspense>
    )
  },
  {
    path: '3d-view/:focusId?',
    element: (
      <Suspense fallback={<Viewer3DPageSkeleton />}>
        <Viewer3DPage />
      </Suspense>
    )
  },
  partsRoutes,
  configRoutes
]
