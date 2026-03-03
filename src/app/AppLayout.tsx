import React, { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useMatches, useRoutes } from 'react-router-dom'

import { startChunkPreloading } from '@/app/pwa/chunkPreloader'
import { HeaderSkeleton } from '@/app/skeletons/HeaderSkeleton'
import { useAuth } from '@/app/user/useAuth'

import { appRoutes } from './appRoutes'

const Header = React.lazy(async () => {
  const module = await import('@/app/Header')
  return { default: module.Header }
})

interface LocationState {
  backgroundLocation?: Location
}

interface RouteHandle {
  isModal?: boolean
}

export function AppLayout(): React.JSX.Element {
  useAuth()

  const location = useLocation()
  const matches = useMatches()
  const state = location.state as LocationState | null
  const explicitBackground = state?.backgroundLocation

  const isModalRoute = matches.some(match => (match.handle as RouteHandle | undefined)?.isModal === true)

  const backgroundLocation = explicitBackground ?? (isModalRoute ? { pathname: '/' } : null)

  useEffect(() => {
    startChunkPreloading()
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="min-h-0 flex-1">
        {useRoutes(appRoutes, backgroundLocation ?? location)}
        {backgroundLocation && <Outlet />}
      </main>
    </div>
  )
}
