import { Image } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useActiveStoreyId, useStoreyById } from '@/building/store'
import { AlertDialog } from '@/shared/ui/components/alert-dialog'
import { Button } from '@/shared/ui/components/button'
import { DropdownMenu } from '@/shared/ui/components/dropdown-menu'

import { PlanImportModal } from './canvas/plan-overlay/PlanImportModal'
import { useFloorPlanActions, useFloorPlanForStorey } from './canvas/plan-overlay/store'
import type { FloorPlanPlacement } from './canvas/plan-overlay/types'

export default function PlanOverlayButton(): React.JSX.Element {
  const { t } = useTranslation('overlay')
  const activeStoreyId = useActiveStoreyId()
  const storey = useStoreyById(activeStoreyId)
  const plan = useFloorPlanForStorey(activeStoreyId)
  const { setPlacement, clearPlan } = useFloorPlanActions()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handlePlacementChange = (placement: FloorPlanPlacement) => {
    setPlacement(activeStoreyId, placement)
  }

  return (
    <>
      <PlanImportModal floorId={activeStoreyId} open={modalOpen} onOpenChange={setModalOpen} existingPlan={plan} />
      {plan ? (
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button size="icon" variant="outline" aria-label={t($ => $.planControls.ariaLabel)}>
              <Image width={20} height={20} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Label>{t($ => $.planControls.label)}</DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={plan.placement}
              onValueChange={value => {
                handlePlacementChange(value as FloorPlanPlacement)
              }}
            >
              <DropdownMenu.RadioItem value="hidden">{t($ => $.planControls.placement.hidden)}</DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="under">
                {t($ => $.planControls.placement.showUnder)}
              </DropdownMenu.RadioItem>
              <DropdownMenu.RadioItem value="over">{t($ => $.planControls.placement.showOnTop)}</DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onSelect={() => {
                setModalOpen(true)
              }}
            >
              {t($ => $.planControls.recalibrate)}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="text-destructive"
              onSelect={() => {
                setConfirmOpen(true)
              }}
            >
              {t($ => $.planControls.removePlan)}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      ) : (
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            setModalOpen(true)
          }}
          title={t($ => $.planControls.importPlan)}
        >
          <Image width={20} height={20} />
        </Button>
      )}

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Content>
          <div className="flex flex-col gap-3">
            <AlertDialog.Title>
              <div className="flex items-center gap-2">
                <span>{t($ => $.planControls.confirmRemove.title)}</span>
              </div>
            </AlertDialog.Title>
            <AlertDialog.Description>
              {t($ => $.planControls.confirmRemove.description, {
                floor: storey?.name ?? 'this floor'
              })}
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button
                  variant="soft"
                  onClick={() => {
                    setConfirmOpen(false)
                  }}
                >
                  {t($ => $.planControls.confirmRemove.cancel)}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    clearPlan(activeStoreyId)
                    setConfirmOpen(false)
                  }}
                >
                  {t($ => $.planControls.confirmRemove.confirm)}
                </Button>
              </AlertDialog.Action>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </>
  )
}
