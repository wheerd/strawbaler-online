import * as Toolbar from '@radix-ui/react-toolbar'
import { Redo2, Undo2 } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { getRedoFunction, getUndoFunction, useCanRedo, useCanUndo } from '@/building/store'
import { Button } from '@/shared/ui/components/button'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/components/tooltip'
import { FitToViewIcon } from '@/shared/ui/icons'
import type { IconProps } from '@/shared/ui/icons/types'

import PlanOverlayButton from './PlanOverlayButton'
import { fitActiveStoreyToView } from './canvas/helpers/fitActiveStoreyToView'
import { ActiveStoreySelector } from './status-bar/StoreySelector'
import { useToolSystem } from './tools/system/ToolSystemContext'
import { useActiveToolId } from './tools/system/hooks/useToolState'
import { getToolInfoById } from './tools/system/metadata'
import type { ToolId } from './tools/system/types'

export function EditorToolbar(): React.JSX.Element {
  const { t } = useTranslation('toolbar')
  const activeToolId = useActiveToolId()
  const toolSystem = useToolSystem()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  return (
    <div className="border-border flex items-center gap-4 border-b px-4 py-1" data-testid="editor-toolbar">
      <ActiveStoreySelector />

      <Separator orientation="vertical" className="h-6" decorative={false} />

      <Toolbar.Root>
        <div className="flex items-center gap-2">
          <ToolbarButton
            name={t($ => $.undo)}
            hotkey="Ctrl+Z"
            disabled={!canUndo}
            onClick={() => {
              if (canUndo) getUndoFunction()()
            }}
            icon={Undo2}
          />
          <ToolbarButton
            name={t($ => $.redo)}
            hotkey="Ctrl+Y"
            disabled={!canRedo}
            onClick={() => {
              if (canRedo) getRedoFunction()()
            }}
            icon={Redo2}
          />

          <Separator orientation="vertical" className="h-6" decorative={false} />

          <ToolButton toolId="basic.select" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="basic.move" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolbarButton name={t($ => $.fitToView)} hotkey="F" onClick={fitActiveStoreyToView} icon={FitToViewIcon} />
          <PlanOverlayButton />

          <Separator orientation="vertical" className="h-6" decorative={false} />

          <ToolButton toolId="perimeter.add" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="perimeter.preset" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="perimeter.add-opening" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="perimeter.add-post" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="perimeter.split-wall" activeToolId={activeToolId} toolSystem={toolSystem} />
          <ToolButton toolId="intermediate-wall.add" activeToolId={activeToolId} toolSystem={toolSystem} />

          <Separator orientation="vertical" className="h-6" decorative={false} />

          <ToolButton toolId="floors.add-opening" activeToolId={activeToolId} toolSystem={toolSystem} />

          <Separator orientation="vertical" className="h-6" decorative={false} />

          <ToolButton toolId="roofs.add-roof" activeToolId={activeToolId} toolSystem={toolSystem} />

          <Separator orientation="vertical" className="h-6" decorative={false} />

          <ToolButton toolId="test.data" activeToolId={activeToolId} toolSystem={toolSystem} />
        </div>
      </Toolbar.Root>
    </div>
  )
}

interface ToolButtonProps {
  toolId: ToolId
  activeToolId: ToolId
  toolSystem: ReturnType<typeof useToolSystem>
}

function ToolButton({ toolId, activeToolId, toolSystem }: ToolButtonProps) {
  const { t } = useTranslation('toolbar')
  const toolInfo = getToolInfoById(toolId)
  return (
    <ToolbarButton
      name={t($ => $.tools[toolInfo.nameKey])}
      hotkey={toolInfo.hotkey}
      active={activeToolId === toolId}
      onClick={() => {
        toolSystem.pushTool(toolId)
      }}
      icon={toolInfo.iconComponent}
    />
  )
}

interface ToolbarButtonProps {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  icon: React.ComponentType<IconProps>
  name: string
  hotkey?: string
}

function ToolbarButton({ name, hotkey, active, disabled, onClick, icon: Icon }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toolbar.Button asChild>
          <Button
            aria-label={name}
            size="icon"
            variant={active ? 'default' : 'outline'}
            onClick={onClick}
            disabled={disabled}
          >
            <Icon width={20} height={20} aria-hidden />
          </Button>
        </Toolbar.Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="flex items-center justify-between gap-2">
          <span>{name}</span>
          {hotkey && <Kbd>{hotkey.toUpperCase()}</Kbd>}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
