import { resolveDefaultMaterial, type WallConstructionPlan } from '@/construction'

interface WallConstructionPlanDisplayProps {
  plan: WallConstructionPlan
}

export function WallConstructionPlanDisplay({ plan }: WallConstructionPlanDisplayProps): React.JSX.Element {
  const { length: wallLength, height: wallHeight } = plan.wallDimensions
  const elements = plan.segments.flatMap(s => s.elements)
  const sortedElements = elements.sort((a, b) => a.position[1] - b.position[1])

  return (
    <svg viewBox={`0 0 ${wallLength} ${wallHeight}`} transform="scale(1,-1)">
      {sortedElements.map(e => (
        <rect
          key={e.id}
          x={e.position[0]}
          y={e.position[2]}
          width={e.size[0]}
          height={e.size[2]}
          fill={resolveDefaultMaterial(e.material)?.color}
          stroke="#000000"
          strokeWidth="5"
        />
      ))}
    </svg>
  )
}
