import { Layers, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { useActiveStoreyId } from '@/building/store'
import { Button } from '@/shared/ui/components/button'

import { useViewer3DView } from './Viewer3DViewContext'

export function Viewer3DViewControls(): React.JSX.Element {
  const { t } = useTranslation('viewer')
  const { focusType, clearFocus } = useViewer3DView()
  const activeStoreyId = useActiveStoreyId()
  const navigate = useNavigate()

  const showFocusBadge = focusType !== null
  const showFocusOnStoreyButton = focusType === null

  const focusLabel = (() => {
    switch (focusType) {
      case 'storey':
        return t($ => $.focus.storey)
      case 'perimeter':
        return t($ => $.focus.perimeter)
      case 'roof':
        return t($ => $.focus.roof)
      default:
        return ''
    }
  })()

  const handleFocusOnStorey = () => {
    void navigate(`/3d-view/${activeStoreyId}`)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {showFocusBadge && (
          <Button
            variant="secondary"
            onClick={clearFocus}
            title={t($ => $.clearFocus)}
            className="text-foreground flex h-9 items-center gap-1 bg-amber-200 p-0 px-3 shadow-none hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800"
          >
            <span className="text-sm font-medium">{focusLabel}</span>
            <X />
          </Button>
        )}

        {showFocusOnStoreyButton && (
          <Button variant="outline" size="sm" onClick={handleFocusOnStorey} title={t($ => $.focusOnStorey)}>
            <Layers />
            <span className="ml-1">{t($ => $.focusOnStorey)}</span>
          </Button>
        )}
      </div>
    </div>
  )
}
