import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/components/button'
import { Checkbox } from '@/shared/ui/components/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/components/dialog'
import { Label } from '@/shared/ui/components/label'

interface ExportJsonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExport: (options: { includeFloorPlans: boolean }) => void
  hasFloorPlans: boolean
}

export function ExportJsonDialog({
  open,
  onOpenChange,
  onExport,
  hasFloorPlans
}: ExportJsonDialogProps): React.JSX.Element {
  const { t } = useTranslation('common')
  const [includeFloorPlans, setIncludeFloorPlans] = useState(false)

  React.useEffect(() => {
    if (open) {
      setIncludeFloorPlans(false)
    }
  }, [open])

  const handleExport = () => {
    onExport({ includeFloorPlans })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t($ => $.projectMenu.exportJsonTitle)}</DialogTitle>
          <p className="text-muted-foreground text-sm">{t($ => $.projectMenu.exportJsonDescription)}</p>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start space-x-3 rounded-md border p-3">
            <Checkbox
              id="includeFloorPlans"
              checked={includeFloorPlans}
              onCheckedChange={checked => {
                setIncludeFloorPlans(checked === true)
              }}
              disabled={!hasFloorPlans}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="includeFloorPlans"
                className={`cursor-pointer font-medium ${!hasFloorPlans ? 'opacity-50' : ''}`}
              >
                {t($ => $.projectMenu.exportIncludeFloorPlans)}
              </Label>
              <p className="text-muted-foreground mt-1 text-sm">
                {hasFloorPlans
                  ? t($ => $.projectMenu.exportIncludeFloorPlansDescription)
                  : t($ => $.projectMenu.exportNoFloorPlans)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t($ => $.actions.cancel)}
          </Button>
          <Button onClick={handleExport}>{t($ => $.projectMenu.export)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
