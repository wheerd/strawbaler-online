import type { WallNodeId } from '@/building/model/ids'
import { useWallNodeById } from '@/building/store'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

const NODE_RADIUS = 50

export function WallNodeShape({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const node = useWallNodeById(nodeId)

  const fillColor = MATERIAL_COLORS.strawbale

  const pathD = node.boundary ? polygonToSvgPath(node.boundary) : undefined

  return (
    <g data-entity-id={node.id} data-entity-type="wall-node" data-parent-ids={JSON.stringify([node.perimeterId])}>
      {pathD && <path d={pathD} fill={fillColor} className="stroke-border-contrast stroke-10" />}
      <circle
        cx={node.center[0]}
        cy={node.center[1]}
        r={NODE_RADIUS}
        fill="var(--color-background)"
        fillOpacity={0.5}
        stroke="var(--color-border-contrast)"
        strokeOpacity={0.5}
        strokeWidth={10}
      />
    </g>
  )
}
