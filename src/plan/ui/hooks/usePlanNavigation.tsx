import { useNavigate } from 'react-router-dom'

import type { PartId } from '@/parts/types'

export function usePlanNavigation() {
  const navigate = useNavigate()

  const viewPartInPlan = async (partId: PartId) => {
    await navigate('/plan', { state: { highlightedPartId: partId } })
  }

  return { viewPartInPlan }
}
