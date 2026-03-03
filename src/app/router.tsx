import React, { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/app/AppLayout'
import { PrivacyPage } from '@/app/PrivacyPage'
import { EditorPageSkeleton } from '@/app/skeletons/EditorPageSkeleton'
import { configRoutes } from '@/config/ui/routes'
import { partsRoutes } from '@/parts/ui/partsRoutes'
import { ConstructionPlanPageSkeleton } from '@/plan/ConstructionPlanPageSkeleton'
import { ErrorFallback } from '@/shared/ui/errors/ErrorFallback'
import { Viewer3DPageSkeleton } from '@/viewer3d/Viewer3DPageSkeleton'

import { AuthModalRoute } from './user/AuthModalRoute'
import { UpdatePasswordModalRoute } from './user/UpdatePasswordModalRoute'
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

export const router = createBrowserRouter([
  {
    path: '/privacy',
    element: (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <PrivacyPage />
      </ErrorBoundary>
    )
  },
  {
    path: '/',
    element: (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AppLayout />
      </ErrorBoundary>
    ),
    children: [
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
      configRoutes,
      { path: 'auth/:tab', element: <AuthModalRoute />, handle: { isModal: true } },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute />, handle: { isModal: true } }
    ]
  }
])
