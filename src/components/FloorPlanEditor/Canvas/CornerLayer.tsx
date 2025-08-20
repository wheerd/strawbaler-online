import { Layer } from 'react-konva'
import { useFloors, useCorners, getActiveFloor } from '@/model/store'
import { useActiveFloorId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { CornerShape } from '@/components/FloorPlanEditor/Shapes/CornerShape'

export function CornerLayer (): React.JSX.Element {
  const floors = useFloors()
  const allCorners = useCorners()
  const activeFloorId = useActiveFloorId()
  const activeFloor = getActiveFloor(floors, activeFloorId)

  if (activeFloor == null) {
    return <Layer name='corners' />
  }

  // Get all corners for the active floor by checking which corners have points on this floor
  const floorPointIds = new Set(activeFloor.pointIds)
  const floorCorners = Array.from(allCorners.values()).filter(corner =>
    floorPointIds.has(corner.pointId)
  )

  return (
    <Layer name='corners'>
      {floorCorners.map(corner => (
        <CornerShape key={corner.id} corner={corner} />
      ))}
    </Layer>
  )
}
