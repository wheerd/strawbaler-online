import React, { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/app/AppLayout'
import { PrivacyPage } from '@/app/PrivacyPage'
import { EditorPageSkeleton } from '@/app/skeletons/EditorPageSkeleton'
import { configRoutes } from '@/config/ui/routes'
import { ErrorFallback } from '@/shared/ui/errors/ErrorFallback'

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

const PartsListPage = React.lazy(
  async () =>
    await import('@/parts/ui/PartsListPage').then(module => ({
      default: module.PartsListPage
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
          <Suspense fallback={null}>
            <ConstructionPlanPage />
          </Suspense>
        )
      },
      {
        path: '3d-view',
        element: (
          <Suspense fallback={null}>
            <Viewer3DPage />
          </Suspense>
        )
      },
      {
        path: 'parts',
        element: (
          <Suspense fallback={null}>
            <PartsListPage />
          </Suspense>
        )
      },
      configRoutes,
      { path: 'auth/:tab', element: <AuthModalRoute />, handle: { isModal: true } },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute />, handle: { isModal: true } }
    ]
  }
])
