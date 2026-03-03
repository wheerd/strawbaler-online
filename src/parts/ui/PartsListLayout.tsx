import React, { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { cn } from '@/shared/ui/utils'

const ConstructionModelRegenerateButton = React.lazy(
  () => import('@/construction/ui/ConstructionModelRegenerateButton')
)

export function PartsListLayout(): React.JSX.Element {
  const { t } = useTranslation('construction')

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <nav className="flex gap-1">
          <NavLink
            to="/parts/materials"
            className={({ isActive }) =>
              cn(
                'ring-offset-background inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                isActive && 'bg-background text-foreground shadow-sm'
              )
            }
          >
            {t($ => $.partsListModal.tabs.materials)}
          </NavLink>
          <NavLink
            to="/parts/modules"
            className={({ isActive }) =>
              cn(
                'ring-offset-background inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                isActive && 'bg-background text-foreground shadow-sm'
              )
            }
          >
            {t($ => $.partsListModal.tabs.modules)}
          </NavLink>
        </nav>

        <Suspense fallback={null}>
          <ConstructionModelRegenerateButton />
        </Suspense>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Outlet />
      </div>
    </div>
  )
}
