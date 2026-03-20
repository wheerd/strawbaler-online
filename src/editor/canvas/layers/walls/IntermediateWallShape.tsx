import type { IntermediateWallId } from '@/building/model/ids'
import { useIntermediateWallById } from '@/building/store'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function IntermediateWallShape({ wallId }: { wallId: IntermediateWallId }): React.JSX.Element {
  const wall = useIntermediateWallById(wallId)

  const fillColor = MATERIAL_COLORS.strawbale

  const wallPath = polygonToSvgPath(wall.boundary)

  return (
    <g
      data-entity-id={wall.id}
      data-entity-type="intermediate-wall"
      data-parent-ids={JSON.stringify([wall.perimeterId])}
    >
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />
    </g>
  )
}
