import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import type { PerimeterWallId } from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { findColinearWallGroups } from '@/construction/store/builders'

import { usePlanView } from './PlanViewContext'

interface WallNavigation {
  previousWallId: PerimeterWallId | null
  nextWallId: PerimeterWallId | null
  goToPrevious: () => void
  goToNext: () => void
}

const emptyNavigation: WallNavigation = {
  previousWallId: null,
  nextWallId: null,
  goToPrevious: () => undefined,
  goToNext: () => undefined
}

export function useWallNavigation(): WallNavigation {
  const { focusId, focusType } = usePlanView()
  const navigate = useNavigate()

  const goToWall = useCallback(
    (wallId: PerimeterWallId) => () => {
      void navigate(`/plan/${wallId}`)
    },
    [navigate]
  )

  const navigation = useMemo((): WallNavigation => {
    if (focusType !== 'wall' || !focusId) {
      return emptyNavigation
    }

    const { getPerimeterWallById, getPerimeterById } = getModelActions()
    const wall = getPerimeterWallById(focusId as PerimeterWallId)
    const perimeter = getPerimeterById(wall.perimeterId)

    const groups = findColinearWallGroups(perimeter)

    const currentGroupIndex = groups.findIndex(group => group.wallIds.includes(focusId as PerimeterWallId))

    if (currentGroupIndex === -1) {
      return emptyNavigation
    }

    // Order is reversed because in UI the Y-axis is flipped
    // so the "previous" wall visually appears after the "current" wall
    // and the "next" wall visually appears before the "current" wall
    const previousGroupIndex = (currentGroupIndex + 1) % groups.length
    const nextGroupIndex = (currentGroupIndex - 1 + groups.length) % groups.length

    const previousWallId = groups[previousGroupIndex].wallIds[0]
    const nextWallId = groups[nextGroupIndex].wallIds[0]

    return {
      previousWallId,
      nextWallId,
      goToPrevious: goToWall(previousWallId),
      goToNext: goToWall(nextWallId)
    }
  }, [focusId, focusType, goToWall])

  return navigation
}
