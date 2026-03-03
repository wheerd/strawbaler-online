import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { PerimeterId, PerimeterWallId, RoofId, StoreyId } from '@/building/model/ids'
import { isPerimeterId, isPerimeterWallId, isRoofId, isStoreyId } from '@/building/model/ids'
import { useActiveStoreyId } from '@/building/store'
import type { ConstructionModelId } from '@/construction/store'

export type Viewer3DFocusType = 'storey' | 'perimeter' | 'wall' | 'roof' | null

interface Viewer3DViewContextValue {
  focusId: string | null
  focusType: Viewer3DFocusType
  modelId: ConstructionModelId
  clearFocus: () => void
}

const Viewer3DViewContext = createContext<Viewer3DViewContextValue | null>(null)

function determineFocusType(focusId: string | undefined): Viewer3DFocusType {
  if (!focusId) return null
  if (isStoreyId(focusId)) return 'storey'
  if (isPerimeterId(focusId)) return 'perimeter'
  if (isPerimeterWallId(focusId)) return 'wall'
  if (isRoofId(focusId)) return 'roof'
  return null
}

export function Viewer3DViewProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { focusId: focusIdParam } = useParams<{ focusId?: string }>()
  const navigate = useNavigate()
  const activeStoreyId = useActiveStoreyId()

  const focusId = focusIdParam ?? null
  const focusType = useMemo(() => determineFocusType(focusIdParam), [focusIdParam])

  const modelId: ConstructionModelId = useMemo(() => {
    switch (focusType) {
      case null:
        return undefined
      case 'storey':
        return focusId as StoreyId
      case 'perimeter':
        return focusId as PerimeterId
      case 'wall':
        return focusId as PerimeterWallId
      case 'roof':
        return focusId as RoofId
    }
  }, [focusType, focusId])

  const clearFocus = useMemo(
    () => () => {
      if (focusId) {
        void navigate('..', { relative: 'path' })
      }
    },
    [navigate, focusId]
  )

  const previousStoreyIdRef = useRef(activeStoreyId)
  useEffect(() => {
    if (previousStoreyIdRef.current !== activeStoreyId && focusId) {
      clearFocus()
    }
    previousStoreyIdRef.current = activeStoreyId
  }, [activeStoreyId, focusId, clearFocus])

  const value: Viewer3DViewContextValue = useMemo(
    () => ({
      focusId,
      focusType,
      modelId,
      clearFocus
    }),
    [focusId, focusType, modelId, clearFocus]
  )

  return <Viewer3DViewContext.Provider value={value}>{children}</Viewer3DViewContext.Provider>
}

export function useViewer3DView(): Viewer3DViewContextValue {
  const context = useContext(Viewer3DViewContext)
  if (!context) {
    throw new Error('useViewer3DView must be used within Viewer3DViewProvider')
  }
  return context
}
