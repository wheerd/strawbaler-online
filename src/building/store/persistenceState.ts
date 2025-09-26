import { useEffect, useState } from 'react'

import type { PersistenceState } from './types'

// Simple persistence state management
let persistenceState: PersistenceState = {
  isSaving: false,
  lastSaved: null,
  saveError: null
}

const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach(listener => listener())
}

export const setPersistenceState = (newState: Partial<PersistenceState>): void => {
  persistenceState = { ...persistenceState, ...newState }
  notifyListeners()
}

export const getPersistenceState = (): PersistenceState => ({ ...persistenceState })

export const usePersistenceState = (): PersistenceState => {
  const [state, setState] = useState(persistenceState)

  useEffect(() => {
    const unsubscribe = () => {
      setState({ ...persistenceState })
    }

    listeners.add(unsubscribe)

    return () => {
      listeners.delete(unsubscribe)
    }
  }, [])

  return state
}

// Mock saving behavior to trigger state changes
let saveTimeout: NodeJS.Timeout | null = null

export const simulateSave = (): void => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  setPersistenceState({ isSaving: true, saveError: null })

  saveTimeout = setTimeout(() => {
    setPersistenceState({
      isSaving: false,
      lastSaved: new Date(),
      saveError: null
    })
  }, 1000)
}
