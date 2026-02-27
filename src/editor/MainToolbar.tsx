import * as Toolbar from '@radix-ui/react-toolbar'
import { FileText, Settings } from 'lucide-react'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { UserMenu } from '@/app/user'
import { useActiveStoreyId, useModelActions } from '@/building/store'
import { useConfigurationModal } from '@/config/context/ConfigurationModalContext'
import TopDownPlanModal from '@/construction/components/TopDownPlanModal'
import { ConstructionPartsListModal } from '@/construction/components/parts/ConstructionPartsListModal'
import { ConstructionViewer3DModal } from '@/construction/viewer3d/ConstructionViewer3DModal'
import { useToolSystem } from '@/editor/tools/system/ToolSystemContext'
import { useActiveToolId } from '@/editor/tools/system/hooks/useToolState'
import { TOOL_GROUPS, getToolInfoById } from '@/editor/tools/system/metadata'
import type { ToolId } from '@/editor/tools/system/types'
import { ProjectMenu } from '@/projects/ui/ProjectMenu'
import { Logo } from '@/shared/ui/Logo'
import { Button } from '@/shared/ui/components/button'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/components/tooltip'
import { ConstructionPlanIcon, Model3DIcon } from '@/shared/ui/icons'

export interface MainToolbarProps {
  onInfoClick?: () => void
}

export function MainToolbar({ onInfoClick }: MainToolbarProps): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const activeToolId = useActiveToolId()
  const { openConfiguration } = useConfigurationModal()
  const toolSystem = useToolSystem()

  const activeStoreyId = useActiveStoreyId()
  const activeStorey = useModelActions().getStoreyById(activeStoreyId)

  const handleToolSelect = useCallback(
    (toolId: ToolId) => {
      toolSystem.pushTool(toolId)
    },
    [toolSystem]
  )

  return (
    <div className="border-border flex items-center gap-4 border-b p-2" data-testid="main-toolbar">
      {/* Logo + Project Menu */}
      <div className="flex items-center gap-1">
        <div onClick={onInfoClick} className="cursor-pointer" role="button" title={t($ => $.about)}>
          <Logo compact />
        </div>
        <ProjectMenu />
      </div>
      {/* Tools positioned next to logo on the left */}
      <Toolbar.Root>
        <div className="flex items-center gap-2">
          {TOOL_GROUPS.map((group, groupIndex) => (
            <React.Fragment key={groupIndex}>
              {groupIndex > 0 && (
                <Toolbar.Separator orientation="vertical">
                  <Separator orientation="vertical" className="h-6" />
                </Toolbar.Separator>
              )}

              <div className="flex items-center gap-1">
                {/* Group of tools */}
                {group.tools.map(toolId => {
                  const toolInfo = getToolInfoById(toolId)
                  return (
                    <Tooltip key={toolId}>
                      <TooltipTrigger asChild>
                        <Toolbar.Button asChild>
                          <Button
                            aria-label={t($ => $.tools[toolInfo.nameKey])}
                            size="icon"
                            variant={activeToolId === toolId ? 'default' : 'outline'}
                            onClick={() => {
                              handleToolSelect(toolId)
                            }}
                          >
                            <toolInfo.iconComponent width={20} height={20} aria-hidden />
                          </Button>
                        </Toolbar.Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="flex items-center justify-between gap-2">
                          <span>{t($ => $.tools[toolInfo.nameKey])}</span>
                          {toolInfo.hotkey && <Kbd>{toolInfo.hotkey.toUpperCase()}</Kbd>}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </Toolbar.Root>
      {/* Configuration button on the right */}
      <div className="ml-auto flex items-center gap-2">
        <TopDownPlanModal
          title={
            activeStorey
              ? t($ => $.constructionPlanForStorey, {
                  storeyName: activeStorey.name
                })
              : t($ => $.constructionPlanForActiveStorey)
          }
          modelId={activeStoreyId}
          trigger={
            <Button title={t($ => $.viewConstructionPlan)} size="icon" variant="default">
              <ConstructionPlanIcon aria-hidden />
            </Button>
          }
        />
        <ConstructionPartsListModal
          title={t($ => $.partsListForEntireModel)}
          modelId={undefined}
          trigger={
            <Button title={t($ => $.viewPartsList)} size="icon" variant="default">
              <FileText aria-hidden />
            </Button>
          }
        />
        <ConstructionViewer3DModal
          modelId={undefined}
          trigger={
            <Button title={t($ => $.view3DConstruction)} size="icon" variant="default">
              <Model3DIcon aria-hidden />
            </Button>
          }
        />
        <Button
          title={t($ => $.configuration)}
          variant="outline"
          size="icon"
          onClick={() => {
            openConfiguration('materials')
          }}
        >
          <Settings aria-hidden />
        </Button>
        <UserMenu />
      </div>
    </div>
  )
}
