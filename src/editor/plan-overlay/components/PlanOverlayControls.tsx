import { ExclamationTriangleIcon, ImageIcon, LayersIcon, TrashIcon } from '@radix-ui/react-icons'
import { AlertDialog, Button, Flex, IconButton } from '@radix-ui/themes'
import React, { useMemo, useState } from 'react'
import { useActiveStoreyId, useStoreyById } from '@/building/store'

import { useFloorPlanActions, useFloorPlanForStorey } from '../store'
import { PlanImportModal } from './PlanImportModal'

export function PlanOverlayControls(): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const storey = useStoreyById(activeStoreyId)
  const plan = useFloorPlanForStorey(activeStoreyId)
  const { togglePlacement, clearPlan } = useFloorPlanActions()
  const [modalOpen, setModalOpen] = useState(false)

  if (!activeStoreyId) {
    return null
  }

  const placementLabel = useMemo(() => {
    if (!plan) return null
    return plan.placement === 'over' ? 'Show underlay' : 'Show on top'
  }, [plan])

  return (
    <Flex align="center" gap="2">
      <PlanImportModal floorId={activeStoreyId} open={modalOpen} onOpenChange={setModalOpen} existingPlan={plan} />

      {plan ? (
        <>
          <Button size="1" variant="soft" onClick={() => togglePlacement(activeStoreyId)} title="Toggle plan placement">
            <LayersIcon />
            {placementLabel}
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton size="1" variant="outline" color="red" title="Remove plan image">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="400px">
              <Flex direction="column" gap="3">
                <Flex align="center" gap="2">
                  <ExclamationTriangleIcon />
                  <AlertDialog.Title>Remove plan image</AlertDialog.Title>
                </Flex>
                <AlertDialog.Description>
                  Remove the plan image for {storey?.name ?? 'this floor'}? This cannot be undone.
                </AlertDialog.Description>
                <Flex justify="end" gap="2">
                  <AlertDialog.Cancel>
                    <Button variant="soft">Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button color="red" onClick={() => clearPlan(activeStoreyId)}>
                      Remove
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </>
      ) : (
        <Button size="1" variant="surface" onClick={() => setModalOpen(true)} title="Import plan image">
          <ImageIcon />
          Add plan
        </Button>
      )}
    </Flex>
  )
}
