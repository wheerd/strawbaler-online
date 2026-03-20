import type { WallNodeId } from '@/building/model/ids'
import { useWallNodeById } from '@/building/store'
import { MATERIAL_COLORS } from '@/shared/theme/colors'
import { polygonToSvgPath } from '@/shared/utils/svg'

const NODE_RADIUS = 100

export function WallNodeShape({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const node = useWallNodeById(nodeId)

  const fillColor = MATERIAL_COLORS.strawbale

  const pathD = polygonToSvgPath(node.boundary)

  return (
    <g data-entity-id={node.id} data-entity-type="wall-node" data-parent-ids={JSON.stringify([node.perimeterId])}>
      <path d={pathD} fill={fillColor} className="stroke-border-contrast stroke-10" />
      <circle
        cx={node.center[0]}
        cy={node.center[1]}
        r={NODE_RADIUS}
        fill={fillColor}
        stroke="var(--color-border-contrast)"
        strokeWidth={10}
      />
    </g>
  )
}
