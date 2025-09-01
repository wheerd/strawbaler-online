import { Group, Line } from 'react-konva'
import type { OuterWallPolygon } from '@/types/model'

interface OuterWallShapeProps {
  outerWall: OuterWallPolygon
}

export function OuterWallShape({ outerWall }: OuterWallShapeProps): React.JSX.Element {
  // Convert boundary points to a flat array for Konva
  const boundaryPoints: number[] = []
  for (const point of outerWall.boundary) {
    boundaryPoints.push(point.x, point.y)
  }

  // Create outline for each segment with thickness visualization
  const segmentElements = outerWall.segments.map((segment, index) => {
    const startPoint = outerWall.boundary[index]
    const endPoint = outerWall.boundary[(index + 1) % outerWall.boundary.length]

    return (
      <Group key={`segment-${index}`}>
        {/* Inside line (boundary) */}
        <Line
          points={[startPoint.x, startPoint.y, endPoint.x, endPoint.y]}
          stroke="#2563eb" // Blue for inside face
          strokeWidth={3}
          lineCap="round"
          listening={false}
        />

        {/* Outside line */}
        <Line
          points={[
            segment.outsideLine.start.x,
            segment.outsideLine.start.y,
            segment.outsideLine.end.x,
            segment.outsideLine.end.y
          ]}
          stroke="#1e40af" // Darker blue for outside face
          strokeWidth={2}
          lineCap="round"
          listening={false}
        />

        {/* Side lines connecting inside and outside */}
        <Line
          points={[startPoint.x, startPoint.y, segment.outsideLine.start.x, segment.outsideLine.start.y]}
          stroke="#1e40af"
          strokeWidth={1}
          listening={false}
        />
        <Line
          points={[endPoint.x, endPoint.y, segment.outsideLine.end.x, segment.outsideLine.end.y]}
          stroke="#1e40af"
          strokeWidth={1}
          listening={false}
        />
      </Group>
    )
  })

  return <Group name={`outer-wall-${outerWall.id}`}>{segmentElements}</Group>
}
