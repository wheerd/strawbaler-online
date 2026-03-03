import { useEffect, useRef } from 'react'

import { useIsHydrated } from '@/projects/services/persistenceStore'
import { subscribeToProjectChanges } from '@/projects/store'

import { fitActiveStoreyToView } from './helpers/fitActiveStoreyToView'

export function useAutoFitOnProjectChange(): void {
  const isHydrated = useIsHydrated()
  const hasRun = useRef(false)

  useEffect(() => {
    if (isHydrated && !hasRun.current) {
      hasRun.current = true
      setTimeout(fitActiveStoreyToView, 100)
    }
  }, [isHydrated])

  useEffect(() => subscribeToProjectChanges(fitActiveStoreyToView), [])
}
