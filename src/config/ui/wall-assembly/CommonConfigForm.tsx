import * as Label from '@radix-ui/react-label'
import { useTranslation } from 'react-i18next'

import type { WallAssemblyId } from '@/building/model/ids'
import { useConfigActions } from '@/config/store'
import type { WallAssemblyConfig } from '@/config/types'
import { LayerSetSelectWithEdit } from '@/config/ui/layers/LayerSetSelect'
import { OpeningAssemblySelectWithEdit } from '@/config/ui/opening-assembly/OpeningAssemblySelectWithEdit'
import { MeasurementInfo } from '@/shared/ui/MeasurementInfo'
import { Separator } from '@/shared/ui/components/separator'

interface CommonConfigFormProps {
  assemblyId: WallAssemblyId
  config: WallAssemblyConfig
}

export function CommonConfigForm({ assemblyId, config }: CommonConfigFormProps): React.JSX.Element {
  const { updateWallAssemblyConfig } = useConfigActions()
  const { t } = useTranslation('config')

  return (
    <div className="flex flex-col gap-3">
      <h2>{t($ => $.walls.openingsSection)}</h2>
      <div className="flex flex-col gap-1">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.walls.openingAssembly)}</span>
        </Label.Root>
        <OpeningAssemblySelectWithEdit
          value={config.openingAssemblyId}
          onValueChange={value => {
            updateWallAssemblyConfig(assemblyId, {
              openingAssemblyId: value
            })
          }}
          allowDefault
          showDefaultIndicator
          placeholder={t($ => $.common.placeholder)}
          size="sm"
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.insideLayers)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="insideLayer" showFinishedSides />
          </div>
          <LayerSetSelectWithEdit
            value={config.insideLayerSetId}
            allowNone
            onValueChange={value => {
              updateWallAssemblyConfig(assemblyId, { insideLayerSetId: value })
            }}
            use="wall"
            placeholder={t($ => $.walls.noInsideLayers)}
          />
        </div>

        <Separator />

        <div className="grid grid-cols-[auto_1fr] items-center gap-2 gap-x-3">
          <div className="flex items-center gap-1">
            <Label.Root>
              <span className="text-sm font-medium">{t($ => $.walls.outsideLayers)}</span>
            </Label.Root>
            <MeasurementInfo highlightedPart="outsideLayer" showFinishedSides />
          </div>
          <LayerSetSelectWithEdit
            value={config.outsideLayerSetId}
            allowNone
            onValueChange={value => {
              updateWallAssemblyConfig(assemblyId, { outsideLayerSetId: value })
            }}
            use="wall"
            placeholder={t($ => $.walls.noOutsideLayers)}
          />
        </div>
      </div>
    </div>
  )
}
