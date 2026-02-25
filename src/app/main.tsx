import { ThemeProvider } from 'next-themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { Toaster } from '@/components/ui/sonner.tsx'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorFallback } from '@/shared/components/errors/ErrorFallback'
import '@/shared/i18n/config'
import { registerServiceWorker } from '@/shared/services/serviceWorkerRegistration'

import './index.css'

function removeInitialLoadingScreen() {
  const loadingScreen = document.querySelector('[data-loading-screen]')
  loadingScreen?.parentElement?.removeChild(loadingScreen)
}

async function bootstrap() {
  // Load both geometry modules in parallel
  await Promise.all([
    import('@/shared/geometry/clipperInstance').then(({ ensureClipperModule }) => ensureClipperModule()),
    import('@/shared/geometry/manifoldInstance').then(({ ensureManifoldModule }) => ensureManifoldModule()),
    import('@/editor/gcs/gcsInstance').then(({ ensureGcsModule }) => ensureGcsModule()),
    import('@/construction/materials/materialCSS').then(({ setupMaterialCss }) => setupMaterialCss())
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
