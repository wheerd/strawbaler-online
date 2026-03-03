import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/components/button'
import { Card } from '@/shared/ui/components/card'
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
        return t($ => $.planModal.focus.perimeter)
      case 'wall':
        return t($ => $.planModal.focus.wall)
      case 'roof':
        return t($ => $.planModal.focus.roof)
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
        <Card size="sm" variant="surface" className="text-foreground bg-amber-200 shadow-none dark:bg-amber-900">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{focusLabel}</span>
            <Button size="icon-xs" variant="ghost" onClick={clearFocus} title={t($ => $.planModal.clearFocus)}>
              <X />
            </Button>
          </div>
        </Card>
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
        >
          {viewOptions.map((viewOption, index) => (
            <ToggleGroupItem key={index} value={index.toString()}>
              {t(viewOption.label)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  )
}
