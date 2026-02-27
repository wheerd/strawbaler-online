import React, { createContext, useContext, useState } from 'react'

import type { ConstructionIssueId } from '@/construction/results'

interface IssueHoverContextValue {
  hoveredIssueId: ConstructionIssueId | null
  setHoveredIssueId: (id: ConstructionIssueId | null) => void
}

const IssueHoverContext = createContext<IssueHoverContextValue | null>(null)

export function IssueHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoveredIssueId, setHoveredIssueId] = useState<ConstructionIssueId | null>(null)

  return (
    <IssueHoverContext.Provider value={{ hoveredIssueId, setHoveredIssueId }}>{children}</IssueHoverContext.Provider>
  )
}

export function useIssueHover() {
  const context = useContext(IssueHoverContext)
  if (!context) {
    throw new Error('useIssueHover must be used within IssueHoverProvider')
  }
  return context
}
