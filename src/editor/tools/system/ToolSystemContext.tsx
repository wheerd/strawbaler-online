import { createContext, useContext } from 'react'

import type { IToolSystem } from '@/editor/tools/system/types'

export const ToolSystemContext = createContext<IToolSystem | null>(null)

export function useToolSystem(): IToolSystem {
  const system = useContext(ToolSystemContext)
  if (!system) {
    throw new Error('useToolSystem must be used within a ToolSystemProvider')
  }
  return system
}
