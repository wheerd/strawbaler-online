import React from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/app/AppLayout'
import { PrivacyPage } from '@/app/PrivacyPage'
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

const ConfigPage = React.lazy(
  async () =>
    await import('@/config/ui/ConfigPage').then(module => ({
      default: module.ConfigPage
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
      { path: 'editor', element: <FloorPlanEditor /> },
      { path: 'plan', element: <ConstructionPlanPage /> },
      { path: '3d-view', element: <Viewer3DPage /> },
      { path: 'parts', element: <PartsListPage /> },
      { path: 'config', element: <ConfigPage /> },
      { path: 'auth/:tab', element: <AuthModalRoute />, handle: { isModal: true } },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute />, handle: { isModal: true } }
    ]
  }
])
