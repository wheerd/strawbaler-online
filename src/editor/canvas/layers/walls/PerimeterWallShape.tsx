import type { PerimeterWallId } from '@/building/model/ids'
import { usePerimeterWallById } from '@/building/store'
import { useWallAssemblyById } from '@/config/store'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

export function PerimeterWallShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const wall = usePerimeterWallById(wallId)

  const wallAssembly = useWallAssemblyById(wall.wallAssemblyId)
  const fillColor = wallAssembly?.type === 'non-strawbale' ? MATERIAL_COLORS.other : MATERIAL_COLORS.strawbale

  const wallPath = polygonToSvgPath(wall.polygon)

  return (
    <g data-entity-id={wall.id} data-entity-type="perimeter-wall" data-parent-ids={JSON.stringify([wall.perimeterId])}>
      <path d={wallPath} fill={fillColor} className="stroke-border-contrast stroke-10" />
    </g>
  )
}
