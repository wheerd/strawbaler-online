import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/components/toggle-group'

import { usePlanView } from './PlanViewContext'
import { useWallNavigation } from './useWallNavigation'

export function PlanViewControls(): React.JSX.Element {
  const { t } = useTranslation('construction')
  const { focusType, viewOptions, currentViewIndex, setCurrentViewIndex, clearFocus } = usePlanView()
  const { previousWallId, nextWallId, goToPrevious, goToNext } = useWallNavigation()

  const showFocusBadge = focusType !== null
  const showViewToggles = viewOptions.length > 1
  const showWallNavigation = focusType === 'wall' && previousWallId !== null && nextWallId !== null

  const focusLabel = (() => {
    switch (focusType) {
      case 'perimeter':
        return t($ => $.plan.focus.perimeter)
      case 'wall':
        return t($ => $.plan.focus.wall)
      case 'roof':
        return t($ => $.plan.focus.roof)
      default:
        return ''
    }
  })()

  if (!showFocusBadge && !showViewToggles) {
    return <div />
  }

  return (
    <div className="flex items-center justify-center gap-2">
      {showFocusBadge && (
        <>
          {showWallNavigation && (
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={goToPrevious}
              title={t($ => $.plan.nav.previousWall)}
              className="h-9"
            >
              <ChevronLeft />
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={clearFocus}
            title={t($ => $.plan.clearFocus)}
            className="text-foreground flex h-9 items-center gap-1 bg-amber-200 p-0 px-3 shadow-none hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800"
          >
            <span className="text-sm font-medium">{focusLabel}</span>
            <X />
          </Button>

          {showWallNavigation && (
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={goToNext}
              title={t($ => $.plan.nav.nextWall)}
              className="h-9"
            >
              <ChevronRight />
            </Button>
          )}
        </>
      )}

      {showViewToggles && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="default"
          value={currentViewIndex.toString()}
          onValueChange={value => {
            if (value) {
              setCurrentViewIndex(parseInt(value, 10))
            }
          }}
          className="h-9"
        >
          {viewOptions.map((viewOption, index) => (
            <ToggleGroupItem key={index} value={index.toString()} className="h-9">
              {t(viewOption.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}
