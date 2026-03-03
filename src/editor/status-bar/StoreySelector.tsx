import { Pencil } from 'lucide-react'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { Storey } from '@/building/model'
import type { StoreyId } from '@/building/model/ids'
import { useActiveStoreyId, useModelActions, useStoreysOrderedByLevel } from '@/building/store'
import { StoreyManagementModal } from '@/building/ui/StoreyManagementModal'
import { useStoreyName } from '@/building/ui/useStoreyName'
import { Button } from '@/shared/ui/components/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/components/select'
import { cn } from '@/shared/ui/utils'

export function getLevelColor(level: number): string {
  if (level === 0) {
    return 'text-green-600 dark:text-green-400'
  } else if (level > 0) {
    return 'text-indigo-600 dark:text-indigo-400'
  } else {
    return 'text-amber-800 dark:text-amber-600'
  }
}

function StoreyName({ storey }: { storey: Storey }) {
  const name = useStoreyName(storey)
  return <span>{name}</span>
}

export function StoreySelector({
  onStoreyChange
}: {
  onStoreyChange?: (storeyId: StoreyId) => void
}): React.JSX.Element {
  const { t } = useTranslation('common')
  const storeysOrdered = useStoreysOrderedByLevel()
  const activeStoreyId = useActiveStoreyId()
  const { setActiveStoreyId } = useModelActions()

  const storeysDisplayOrder = [...storeysOrdered].reverse()

  const handleStoreyChange = useCallback(
    (newStoreyId: string) => {
      setActiveStoreyId(newStoreyId as StoreyId)
      if (onStoreyChange) {
        onStoreyChange(newStoreyId as StoreyId)
      }
    },
    [setActiveStoreyId, onStoreyChange]
  )

  return (
    <div className="flex items-center gap-2">
      <Select value={activeStoreyId} onValueChange={handleStoreyChange}>
        <SelectTrigger className="h-9 w-50 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {storeysDisplayOrder.map(storey => (
            <SelectItem key={storey.id} value={storey.id}>
              <span className="flex items-center gap-2">
                <span className={cn('font-mono text-sm font-bold', getLevelColor(storey.level))}>L{storey.level}</span>
                <StoreyName storey={storey} />
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <StoreyManagementModal
        trigger={
          <Button
            size="icon-sm"
            className="size-7"
            title={t($ => $.storeys.manageFloorsTooltip)}
            type="button"
            variant="secondary"
          >
            <Pencil />
          </Button>
        }
      />
    </div>
  )
}
