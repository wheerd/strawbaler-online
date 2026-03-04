import React, { Suspense, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'

import { type StoreyId, isStoreyId } from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import { StoreySelector } from '@/editor/status-bar/StoreySelector'
import { cn } from '@/shared/ui/utils'

import { PartsListControls } from './PartsListControls'

const ConstructionModelRegenerateButton = React.lazy(
  () => import('@/construction/ui/ConstructionModelRegenerateButton')
)

export function PartsListLayout(): React.JSX.Element {
  const { t } = useTranslation('construction')
  const navigate = useNavigate()
  const location = useLocation()
  const { focusId } = useParams<{ focusId?: string }>()
  const activeStoreyId = useActiveStoreyId()
  const storeyId = focusId && isStoreyId(focusId) ? focusId : activeStoreyId

  const handleStoreyChange = useCallback(
    (storeyId: StoreyId) => {
      const currentTab = location.pathname.includes('/modules') ? 'modules' : 'materials'
      void navigate(`/parts/${currentTab}/${storeyId}`)
    },
    [navigate, location.pathname, focusId]
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <nav className="flex items-center gap-2">
          <NavLink
            to={focusId ? `/parts/materials/${focusId}` : '/parts/materials'}
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
            to={focusId ? `/parts/modules/${focusId}` : '/parts/modules'}
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

        <div className="flex items-center gap-2">
          <StoreySelector value={storeyId} onStoreyChange={handleStoreyChange} />
          <PartsListControls />
        </div>

        <Suspense fallback={<div />}>
          <ConstructionModelRegenerateButton />
        </Suspense>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Outlet />
      </div>
    </div>
  )
}
