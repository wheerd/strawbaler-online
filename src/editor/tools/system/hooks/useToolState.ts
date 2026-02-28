import { useCallback, useSyncExternalStore } from 'react'

import { useToolSystem } from '@/editor/tools/system/ToolSystemContext'
import type { ToolId, ToolImplementation } from '@/editor/tools/system/types'

export function useActiveTool(): ToolImplementation {
  const toolSystem = useToolSystem()
  const subscribe = useCallback((listener: () => void) => toolSystem.subscribe(listener), [toolSystem])
  const getSnapshot = useCallback(() => toolSystem.getActiveTool(), [toolSystem])
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useActiveToolId(): ToolId {
  const toolSystem = useToolSystem()
  const subscribe = useCallback((listener: () => void) => toolSystem.subscribe(listener), [toolSystem])
  const getSnapshot = useCallback(() => toolSystem.getActiveToolId(), [toolSystem])
  return useSyncExternalStore(subscribe, getSnapshot)
}
