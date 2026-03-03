import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/components/button'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/components/toggle-group'

import { usePlanView } from './PlanViewContext'

export function PlanViewControls(): React.JSX.Element {
  const { t } = useTranslation('construction')
  const { focusType, viewOptions, currentViewIndex, setCurrentViewIndex, clearFocus } = usePlanView()

  const showFocusBadge = focusType !== null
  const showViewToggles = viewOptions.length > 1

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
        <Button
          variant="secondary"
          onClick={clearFocus}
          title={t($ => $.plan.clearFocus)}
          className="text-foreground flex h-9 items-center gap-1 bg-amber-200 p-0 px-3 shadow-none hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800"
        >
          <span className="text-sm font-medium">{focusLabel}</span>
          <X />
        </Button>
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
