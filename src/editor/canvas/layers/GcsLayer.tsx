import type { Constraint, SketchLine, SketchPoint } from '@salusoft89/planegcs'

import {
  useAllConstraintStatus,
  useGcsConstraints,
  useGcsLines,
  useGcsPerimeterRegistry,
  useGcsPoints
} from '@/building/gcs/store'
import { usePerimetersOfActiveStorey } from '@/building/store'
import { useZoom } from '@/editor/canvas/state/viewportStore'

const POINT_GROUP_TOLERANCE = 1e-6

interface PointGroup {
  points: SketchPoint[]
  position: [number, number]
}

export function GcsLayer(): React.JSX.Element {
  const registry = useGcsPerimeterRegistry()
  const points = useGcsPoints()
  const lines = useGcsLines()
  const constraints = useGcsConstraints()
  const constraintStatus = useAllConstraintStatus()
  const zoom = useZoom()

  const perimeters = usePerimetersOfActiveStorey()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredPoints = perimeters.flatMap(p => registry[p.id]?.pointIds ?? []).map(id => points[id])
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredLines = new Set(perimeters.flatMap(p => registry[p.id]?.lineIds ?? []))
  const visibleLines = lines.filter(line => filteredLines.has(line.id))
  const pointGroups = groupPoints(filteredPoints)
  const visibleConstraints = Object.values(constraints)

  return (
    <g data-layer="gcs">
      {visibleLines.map(line => {
        const p1 = points[line.p1_id]
        const p2 = points[line.p2_id]

        return (
          <line
            key={line.id}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={getGcsLineColor(line.id)}
            strokeWidth={2 / zoom}
            strokeLinecap="round"
            pointerEvents="stroke"
          >
            <title>{getLineTooltip(line, p1, p2, visibleConstraints, constraintStatus)}</title>
          </line>
        )
      })}

      {pointGroups
        .filter(group => group.points.some(point => !point.id.startsWith('virt_')))
        .map(group => (
          <g key={group.points.map(point => point.id).join('|')}>
            <circle
              cx={group.position[0]}
              cy={group.position[1]}
              r={group.points.some(point => point.fixed) ? 6 / zoom : 8 / zoom}
              fill={getGcsPointColor(group.points[0].id)}
              stroke="var(--color-border)"
              strokeWidth={2 / zoom}
            >
              <title>{getPointTooltip(group.points, visibleConstraints, constraintStatus)}</title>
            </circle>
          </g>
        ))}
    </g>
  )
}

function groupPoints(points: SketchPoint[]): PointGroup[] {
  const groups: PointGroup[] = []

  for (const point of points) {
    const group = groups.find(candidate => {
      const dx = candidate.position[0] - point.x
      const dy = candidate.position[1] - point.y
      return Math.hypot(dx, dy) <= POINT_GROUP_TOLERANCE
    })

    if (group) {
      group.points.push(point)
    } else {
      groups.push({ points: [point], position: [point.x, point.y] })
    }
  }

  return groups
}

function getPointTooltip(
  points: SketchPoint[],
  constraints: Constraint[],
  status: { conflicting: Set<string>; redundant: Set<string> }
): string {
  const pointIds = points.map(point => point.id)
  const relatedConstraints = constraints.filter(constraint => referencesAny(constraint, pointIds))
  return [`Points:\n- ${pointIds.join('\n- ')}`, formatConstraints(relatedConstraints, status)].join('\n\n')
}

function getLineTooltip(
  line: SketchLine,
  p1: SketchPoint,
  p2: SketchPoint,
  constraints: Constraint[],
  status: { conflicting: Set<string>; redundant: Set<string> }
): string {
  const relatedConstraints = constraints.filter(constraint => referencesAny(constraint, [line.id, p1.id, p2.id]))
  return [`Line: ${line.id}`, `Points:\n- ${p1.id}\n- ${p2.id}`, formatConstraints(relatedConstraints, status)].join(
    '\n\n'
  )
}

function formatConstraints(
  constraints: Constraint[],
  status: { conflicting: Set<string>; redundant: Set<string> }
): string {
  if (constraints.length === 0) return 'Constraints: none'

  return [
    'Constraints:',
    ...constraints.map(constraint => {
      const labels = []
      if (status.conflicting.has(constraint.id)) labels.push('conflicting')
      if (status.redundant.has(constraint.id)) labels.push('redundant')
      const suffix = labels.length > 0 ? ` [${labels.join(', ')}]` : ''
      return `- ${constraint.id} (${constraint.type})${suffix}`
    })
  ].join('\n')
}

function referencesAny(constraint: Constraint, ids: string[]): boolean {
  return Object.values(constraint).some(value => typeof value === 'string' && ids.includes(value))
}

function getGcsLineColor(id: string): string {
  if (id.endsWith('_ref')) return 'var(--color-primary)'
  if (id.endsWith('_nonref')) return 'var(--color-muted-foreground)'
  if (id.endsWith('_proj')) return 'var(--color-muted-foreground)'
  return 'var(--color-foreground)'
}

function getGcsPointColor(id: string): string {
  if (id.endsWith('_ref')) return 'var(--color-primary)'
  if (id.endsWith('_proj')) return 'var(--color-muted-foreground)'
  if (id.endsWith('_nonref')) return 'var(--color-foreground)'
  return 'var(--color-accent)'
}
