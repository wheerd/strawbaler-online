import { Layer, Group } from 'react-konva'
import { useFloorOuterWalls } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { OuterWallShape } from '@/components/FloorPlanEditor/Shapes/OuterWallShape'
import { OuterCornerShape } from '@/components/FloorPlanEditor/Shapes/OuterCornerShape'

export function OuterWallLayer(): React.JSX.Element {
  const activeFloorId = useActiveFloorId()
  const outerWalls = useFloorOuterWalls(activeFloorId)

  return (
    <Layer name="outer-walls">
      {outerWalls.map(outerWall => (
        <Group key={outerWall.id}>
          {/* Render wall segments */}
          <OuterWallShape outerWall={outerWall} />

          {/* Render corner shapes */}
          {outerWall.corners.map((corner, cornerIndex) => {
            const prevSegmentIndex = (cornerIndex - 1 + outerWall.segments.length) % outerWall.segments.length
            const nextSegmentIndex = cornerIndex

            const previousSegment = outerWall.segments[prevSegmentIndex]
            const nextSegment = outerWall.segments[nextSegmentIndex]
            const boundaryPoint = outerWall.boundary[cornerIndex]

            return (
              <OuterCornerShape
                key={`corner-${cornerIndex}`}
                corner={corner}
                boundaryPoint={boundaryPoint}
                previousSegment={previousSegment}
                nextSegment={nextSegment}
                outerWallId={outerWall.id}
              />
            )
          })}
        </Group>
      ))}
    </Layer>
  )
}
