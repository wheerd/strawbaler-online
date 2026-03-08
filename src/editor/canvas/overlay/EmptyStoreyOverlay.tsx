import { Image, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useActiveStoreyId, usePerimetersOfActiveStorey } from '@/building/store'
import { PlanImportModal } from '@/editor/canvas/plan-overlay/PlanImportModal'
import { useFloorPlanForStorey } from '@/editor/canvas/plan-overlay/store'
import { useToolSystem } from '@/editor/tools/system/ToolSystemContext'
import { useActiveToolId } from '@/editor/tools/system/hooks/useToolState'
import { ImportChoiceDialog } from '@/projects/ui/ImportChoiceDialog'
import { useIfcImport } from '@/projects/ui/useIfcImport'
import { Button } from '@/shared/ui/components/button'
import { PerimeterDrawIcon, PerimeterPresetsIcon } from '@/shared/ui/icons'

export function EmptyStoreyOverlay(): React.JSX.Element | null {
  const { t } = useTranslation('overlay')
  const perimeters = usePerimetersOfActiveStorey()
  const activeToolId = useActiveToolId()
  const activeStoreyId = useActiveStoreyId()
  const existingPlan = useFloorPlanForStorey(activeStoreyId)
  const toolSystem = useToolSystem()
  const [planModalOpen, setPlanModalOpen] = useState(false)

  const { isImporting, importChoiceState, handleIfcImport, setImportChoiceState } = useIfcImport()

  const isStoreyEmpty = perimeters.length === 0
  const isSelectToolActive = activeToolId === 'basic.select'

  if (!isStoreyEmpty || !isSelectToolActive) {
    return null
  }

  return (
    <>
      <PlanImportModal
        floorId={activeStoreyId}
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        existingPlan={existingPlan}
      />
      {importChoiceState && (
        <ImportChoiceDialog
          open={importChoiceState.open}
          onOpenChange={open => {
            if (!open) {
              setImportChoiceState(null)
            }
          }}
          defaultProjectName={importChoiceState.defaultProjectName}
          onChoice={(choice, projectName) => void importChoiceState.handleConfirmChoice(choice, projectName)}
        />
      )}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
        <div className="bg-background/95 border-border pointer-events-auto max-w-md rounded-lg border p-6 shadow-lg backdrop-blur-sm">
          <h2 className="mb-1 text-xl font-semibold">{t($ => $.emptyStorey.title)}</h2>
          <p className="text-muted-foreground mb-4 text-sm">{t($ => $.emptyStorey.subtitle)}</p>

          <div className="flex flex-col gap-2">
            <OptionButton
              icon={Image}
              title={t($ => $.emptyStorey.planOverlay.title)}
              description={t($ => $.emptyStorey.planOverlay.description)}
              onClick={() => {
                setPlanModalOpen(true)
              }}
            />
            <OptionButton
              icon={PerimeterDrawIcon}
              title={t($ => $.emptyStorey.perimeterAdd.title)}
              description={t($ => $.emptyStorey.perimeterAdd.description)}
              onClick={() => {
                toolSystem.pushTool('perimeter.add')
              }}
            />
            <OptionButton
              icon={PerimeterPresetsIcon}
              title={t($ => $.emptyStorey.perimeterPreset.title)}
              description={t($ => $.emptyStorey.perimeterPreset.description)}
              onClick={() => {
                toolSystem.pushTool('perimeter.preset')
              }}
            />
            <OptionButton
              icon={Upload}
              title={t($ => $.emptyStorey.ifcImport.title)}
              description={t($ => $.emptyStorey.ifcImport.description)}
              onClick={() => {
                void handleIfcImport()
              }}
              disabled={isImporting}
            />
          </div>

          <p className="text-muted-foreground mt-4 text-center text-xs">{t($ => $.emptyStorey.toolbarHint)}</p>
        </div>
      </div>
    </>
  )
}

interface OptionButtonProps {
  icon: React.ComponentType<{ width?: number; height?: number }>
  title: string
  description: string
  onClick?: () => void
  disabled?: boolean
}

function OptionButton({ icon: Icon, title, description, onClick, disabled }: OptionButtonProps) {
  return (
    <Button
      variant="outline"
      className="h-auto w-full justify-start gap-3 px-3 py-3"
      onClick={onClick}
      disabled={disabled}
    >
      <div className="shrink-0">
        <Icon width={24} height={24} />
      </div>
      <div className="flex flex-col items-start text-left">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </div>
    </Button>
  )
}
