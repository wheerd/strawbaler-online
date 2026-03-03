import { getModelActions } from '@/building/store'
import { viewportActions } from '@/editor/canvas/state/viewportStore'

export function fitActiveStoreyToView(): void {
  const { getActiveStoreyId, getBounds } = getModelActions()
  const bounds = getBounds(getActiveStoreyId())
  if (!bounds.isEmpty) {
    viewportActions().fitToView(bounds)
  }
}
