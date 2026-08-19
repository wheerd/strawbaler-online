import { useGcsLines, useGcsPerimeterRegistry, useGcsPoints } from '@/building/gcs/store'
import { usePerimetersOfActiveStorey } from '@/building/store'
import { useZoom } from '@/editor/canvas/state/viewportStore'

export function GcsLayer(): React.JSX.Element {
  const registry = useGcsPerimeterRegistry()
  const points = useGcsPoints()
  const lines = useGcsLines()
  const zoom = useZoom()

  const perimeters = usePerimetersOfActiveStorey()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredPoints = perimeters.flatMap(p => registry[p.id]?.pointIds ?? []).map(p => points[p])
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const filteredLines = new Set(perimeters.flatMap(p => registry[p.id]?.lineIds ?? []))

  return (
    <g data-layer="gcs">
      {lines
        .filter(l => filteredLines.has(l.id))
        .map(line => {
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
              className="pointer-events-none"
            />
          )
        })}

      {filteredPoints
        .filter(p => !p.id.startsWith('virt_'))
        .map(point => {
          return (
            <g key={point.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={point.fixed ? 6 / zoom : 8 / zoom}
                fill={getGcsPointColor(point.id)}
                stroke="var(--color-border)"
                strokeWidth={2 / zoom}
              >
                <title>{point.id}</title>
              </circle>
            </g>
          )
        })}
    </g>
  )
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
