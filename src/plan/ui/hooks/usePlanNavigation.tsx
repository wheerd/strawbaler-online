import { useNavigate } from 'react-router-dom'

import type { PartId } from '@/parts/types'

export function usePlanNavigation() {
  const navigate = useNavigate()

  const viewPartInPlan = async (partId: PartId, focusId?: string | null) => {
    const targetPath = focusId ? `/plan/${focusId}` : '/plan'
    await navigate(targetPath, { state: { highlightedPartId: partId } })
  }

  return { viewPartInPlan }
}
