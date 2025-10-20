import { Layer } from 'react-konva/lib/ReactKonvaCore'

import { useFloorAreasOfActiveStorey, useFloorOpeningsOfActiveStorey } from '@/building/store'
import { FloorAreaShape } from '@/editor/canvas/shapes/FloorAreaShape'
import { FloorOpeningShape } from '@/editor/canvas/shapes/FloorOpeningShape'

export function FloorLayer(): React.JSX.Element {
  const floorAreas = useFloorAreasOfActiveStorey()
  const floorOpenings = useFloorOpeningsOfActiveStorey()

  return (
    <Layer name="floors">
      {floorAreas.map(area => (
        <FloorAreaShape key={area.id} area={area} />
      ))}
      {floorOpenings.map(opening => (
        <FloorOpeningShape key={opening.id} opening={opening} />
      ))}
    </Layer>
  )
}
