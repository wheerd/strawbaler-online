import React, { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { startChunkPreloading } from '@/app/pwa/chunkPreloader'
import { HeaderSkeleton } from '@/app/skeletons/HeaderSkeleton'
import { useAuth } from '@/app/user/useAuth'

const Header = React.lazy(async () => {
  const module = await import('@/app/Header')
  return { default: module.Header }
})

export function AppLayout(): React.JSX.Element {
  useAuth()

  useEffect(() => {
    startChunkPreloading()
  }, [])

  return (
    <div className="flex h-screen flex-col">
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
