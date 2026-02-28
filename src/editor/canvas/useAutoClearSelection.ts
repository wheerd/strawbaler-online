import { useEffect } from 'react'

import { useActiveStoreyId, useModelEntityById } from '@/building/store'
import { clearSelection, popSelection, useCurrentSelection } from '@/editor/canvas/state/selectionStore'

export function useAutoClearSelection(): void {
  const selectedId = useCurrentSelection()
  try {
    useModelEntityById(selectedId)
  } catch {
    popSelection()
  }

  const activeStoreyId = useActiveStoreyId()
  useEffect(() => {
    clearSelection()
  }, [activeStoreyId])
}
