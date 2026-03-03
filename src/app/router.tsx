import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '@/app/AppLayout'
import { PrivacyPage } from '@/app/PrivacyPage'
import { ErrorFallback } from '@/shared/ui/errors/ErrorFallback'

import { appRoutes } from './appRoutes'
import { AuthModalRoute } from './user/AuthModalRoute'
import { UpdatePasswordModalRoute } from './user/UpdatePasswordModalRoute'

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
    path: '*',
    element: (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AppLayout />
      </ErrorBoundary>
    ),
    children: [
      ...appRoutes,
      { path: 'auth/:tab', element: <AuthModalRoute />, handle: { isModal: true } },
      { path: 'auth/update-password', element: <UpdatePasswordModalRoute />, handle: { isModal: true } }
    ]
  }
])
