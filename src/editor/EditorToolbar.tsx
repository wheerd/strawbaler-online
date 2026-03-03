import * as Toolbar from '@radix-ui/react-toolbar'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { PlanOverlayControls } from '@/editor/canvas/plan-overlay/PlanOverlayControls'
import { useToolSystem } from '@/editor/tools/system/ToolSystemContext'
import { useActiveToolId } from '@/editor/tools/system/hooks/useToolState'
import { TOOL_GROUPS, getToolInfoById } from '@/editor/tools/system/metadata'
import type { ToolId } from '@/editor/tools/system/types'
import { Button } from '@/shared/ui/components/button'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/components/tooltip'

import { StoreySelector } from './status-bar/StoreySelector'

export function EditorToolbar(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const activeToolId = useActiveToolId()
  const toolSystem = useToolSystem()

  const handleToolSelect = useCallback(
    (toolId: ToolId) => {
      toolSystem.pushTool(toolId)
    },
    [toolSystem]
  )

  return (
    <div className="border-border flex items-center gap-4 border-b px-4 py-2" data-testid="editor-toolbar">
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

      <Separator orientation="vertical" className="h-6" />

      <StoreySelector />

      <PlanOverlayControls />
    </div>
  )
}
