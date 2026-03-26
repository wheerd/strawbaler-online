import * as Label from '@radix-ui/react-label'
import { Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useReactiveTool } from '@/editor/tools/system/hooks/useReactiveTool'
import type { ToolInspectorProps } from '@/editor/tools/system/types'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { LengthField } from '@/shared/ui/LengthField'
import { MeasurementInfo } from '@/shared/ui/MeasurementInfo'
import { Button } from '@/shared/ui/components/button'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'

import type { IntermediateWallTool } from './IntermediateWallTool'

export function IntermediateWallToolInspector({ tool }: ToolInspectorProps<IntermediateWallTool>): React.JSX.Element {
  const { t } = useTranslation('tool')
  const { formatLength } = useFormatters()
  const { state } = useReactiveTool(tool)

  // Force re-renders when tool state changes
  const [, forceUpdate] = useState({})

  useEffect(
    () =>
      tool.onRenderNeeded(() => {
        forceUpdate({})
      }),
    [tool]
  )

  return (
    <div className="p-2">
      <div className="flex flex-col gap-2">
        {/* Informational Note */}
        <Callout color="blue">
          <CalloutIcon>
            <Info />
          </CalloutIcon>
          <CalloutText>
            <span className="text-xs">TODO</span>
          </CalloutText>
        </Callout>

        {/* Tool Properties */}
        <div className="grid grid-cols-[auto_1fr] gap-2">
          {/* Wall Thickness */}
          <div className="flex items-center gap-1">
            <Label.Root htmlFor="wall-thickness">
              <span className="text-muted-foreground text-xs font-medium">{t($ => $.perimeter.wallThickness)}</span>
            </Label.Root>
            <MeasurementInfo highlightedMeasurement="totalWallThickness" showFinishedSides />
          </div>
          <div className="flex items-center gap-1">
            <LengthField
              id="wall-thickness"
              value={state.thickness}
              onCommit={value => {
                tool.setThickness(value)
              }}
              min={10}
              max={undefined}
              step={10}
              size="sm"
              unit="mm"
              className="grow"
            />
          </div>
        </div>

        {/* Length Override Display */}
        {state.lengthOverride && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-blue-600">{t($ => $.perimeter.lengthOverride)}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-blue-600">{formatLength(state.lengthOverride)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive h-6 w-6"
                  onClick={() => {
                    tool.clearLengthOverride()
                  }}
                  title={t($ => $.perimeter.clearLengthOverride)}
                >
                  <X />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <Separator />
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium">{t($ => $.perimeter.controlsHeading)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlPlace)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlSnap)}</span>
          <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlNumbers)}</span>
          {state.lengthOverride ? (
            <span className="text-muted-foreground text-xs">
              • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscOverride, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              • <Kbd size="sm">{t($ => $.keyboard.esc)}</Kbd>{' '}
              {t($ => $.perimeter.controlEscAbort, {
                key: ''
              })
                .replace('{{key}}', '')
                .trim()}
            </span>
          )}
          {state.points.length >= 3 && (
            <>
              <span className="text-muted-foreground text-xs">
                • <Kbd size="sm">{t($ => $.keyboard.enter)}</Kbd>{' '}
                {t($ => $.perimeter.controlEnter, {
                  key: ''
                })
                  .replace('{{key}}', '')
                  .trim()}
              </span>
              <span className="text-muted-foreground text-xs">• {t($ => $.perimeter.controlClickFirst)}</span>
            </>
          )}
        </div>

        {/* Actions */}
        {state.points.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              {state.points.length >= 3 && (
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    tool.complete()
                  }}
                  disabled={!state.isValid}
                  title={t($ => $.perimeter.completeTooltip)}
                >
                  <span className="text-xs">{t($ => $.perimeter.completePerimeter)}</span>
                  <Kbd size="sm" className="ml-auto">
                    {t($ => $.keyboard.enter)}
                  </Kbd>
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="text-destructive w-full"
                onClick={() => {
                  tool.cancel()
                }}
                title={t($ => $.perimeter.cancelTooltip)}
              >
                <span className="text-xs">{t($ => $.perimeter.cancelPerimeter)}</span>
                <Kbd size="sm" className="ml-auto">
                  {t($ => $.keyboard.esc)}
                </Kbd>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
