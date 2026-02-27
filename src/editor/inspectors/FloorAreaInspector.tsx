import { Trash } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { FloorAreaId } from '@/building/model/ids'
import { useFloorAreaById, useModelActions } from '@/building/store'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import { Bounds2D, calculatePolygonArea, polygonPerimeter } from '@/shared/geometry'
import { useFormatters } from '@/shared/i18n/useFormatters'
import { Button } from '@/shared/ui/components/button'
import { DataList } from '@/shared/ui/components/data-list'
import { Separator } from '@/shared/ui/components/separator'
import { FitToViewIcon } from '@/shared/ui/icons'

interface FloorAreaInspectorProps {
  floorAreaId: FloorAreaId
}

export function FloorAreaInspector({ floorAreaId }: FloorAreaInspectorProps): React.JSX.Element | null {
  const { t } = useTranslation('inspector')
  const { formatArea, formatLength } = useFormatters()
  const floorArea = useFloorAreaById(floorAreaId)
  const { removeFloorArea } = useModelActions()
  const { fitToView } = useViewportActions()

  const perimeterLength = useMemo(() => {
    if (!floorArea) return 0
    return polygonPerimeter(floorArea.area)
  }, [floorArea])

  const area = useMemo(() => {
    if (!floorArea) return 0
    return calculatePolygonArea(floorArea.area)
  }, [floorArea])

  const handleFitToView = useCallback(() => {
    if (!floorArea) return
    const bounds = Bounds2D.fromPoints(floorArea.area.points)
    fitToView(bounds)
  }, [floorArea, fitToView])

  if (!floorArea) {
    return (
      <div className="p-2">
        <span className="text-sm font-bold text-red-800">{t($ => $.floorArea.notFound)}</span>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>{t($ => $.floorArea.perimeter)}</DataList.Label>
            <DataList.Value>{formatLength(perimeterLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>{t($ => $.floorArea.area)}</DataList.Label>
            <DataList.Value>{formatArea(area)}</DataList.Value>
          </DataList.Item>
        </DataList.Root>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button size="icon" title={t($ => $.floorArea.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            title={t($ => $.floorArea.removeFloorArea)}
            onClick={() => {
              removeFloorArea(floorArea.id)
            }}
          >
            <Trash />
          </Button>
        </div>
      </div>
    </div>
  )
}
