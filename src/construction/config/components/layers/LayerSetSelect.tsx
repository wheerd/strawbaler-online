import { useTranslation } from 'react-i18next'

import type { LayerSetId } from '@/building/model/ids'
import { useLayerSets } from '@/construction/config/store'
import type { LayerSetConfig, LayerSetUse } from '@/construction/layers/types'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/components/select'
import { getLayerSetUseIcon } from '@/shared/ui/icons'

export interface LayerSetSelectProps {
  value: LayerSetId | undefined
  onValueChange: (value: LayerSetId) => void
  use?: LayerSetUse
  placeholder?: string
  disabled?: boolean
}

export function LayerSetSelect({
  value,
  onValueChange,
  use,
  placeholder,
  disabled
}: LayerSetSelectProps): React.JSX.Element {
  const { t } = useTranslation('config')
  const { formatLength } = useFormatters()
  const allLayerSets = useLayerSets()

  const layerSets = use ? allLayerSets.filter(ls => ls.use === use) : allLayerSets

  const displayName = (layerSet: { name: string; nameKey?: LayerSetConfig['nameKey'] }) =>
    layerSet.nameKey ? t(layerSet.nameKey) : layerSet.name

  const selectedLayerSet = layerSets.find(ls => ls.id === value)

  return (
    <Select
      value={value ?? ''}
      onValueChange={val => {
        onValueChange(val as LayerSetId)
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t($ => $.common.placeholder)}>
          {selectedLayerSet && (
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = getLayerSetUseIcon(selectedLayerSet.use)
                return <Icon className="shrink-0" width={14} height={14} />
              })()}
              <span>
                {displayName(selectedLayerSet)} ({formatLength(selectedLayerSet.totalThickness)})
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {layerSets.map(ls => {
          const Icon = getLayerSetUseIcon(ls.use)
          return (
            <SelectItem key={ls.id} value={ls.id}>
              <div className="flex items-center gap-2">
                <Icon className="shrink-0" width={14} height={14} />
                <span>
                  {displayName(ls)} ({formatLength(ls.totalThickness)})
                </span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
