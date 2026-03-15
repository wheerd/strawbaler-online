import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'

import { registerServiceWorker } from '@/app/pwa/serviceWorkerRegistration'
import { router } from '@/app/router'
import '@/shared/i18n/config'
import { Toaster } from '@/shared/ui/components/sonner'
import { TooltipProvider } from '@/shared/ui/components/tooltip'
import { ErrorFallback } from '@/shared/ui/errors/ErrorFallback'

import './index.css'

function removeInitialLoadingScreen() {
  const loadingScreen = document.querySelector('[data-loading-screen]')
  loadingScreen?.parentElement?.removeChild(loadingScreen)
}

async function bootstrap() {
  // Load both geometry modules in parallel
  await Promise.all([
    import('@/shared/geometry/polygon/clipperInstance').then(({ ensureClipperModule }) => ensureClipperModule()),
    import('@/shared/geometry/manifoldInstance').then(({ ensureManifoldModule }) => ensureManifoldModule()),
    import('@/building/gcs/gcsInstance').then(({ ensureGcsModule }) => ensureGcsModule()),
    import('@/materials/css').then(({ setupMaterialCss }) => setupMaterialCss())
  ])

  const rootElement = document.getElementById('root')
  if (rootElement === null) {
    throw new Error('Root element not found')
  }

  const root = createRoot(rootElement)

  root.render(
    <StrictMode>
      <ErrorBoundary fallback={<div>An error occurred</div>}>
        <ThemeProvider attribute="class">
          <TooltipProvider>
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              <Toaster />
              <RouterProvider router={router} />
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  )

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoadingScreen()
      registerServiceWorker()
    })
  })
}

void bootstrap()
