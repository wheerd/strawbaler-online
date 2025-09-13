import { Layer } from 'react-konva/lib/ReactKonvaCore'
import { useStoreyPerimeters } from '@/model/store'
import { useActiveStoreyId } from '@/components/FloorPlanEditor/hooks/useEditorStore'
import { PerimeterShape } from '@/components/FloorPlanEditor/Shapes/PerimeterShape'

export function PerimeterLayer(): React.JSX.Element {
  const activeStoreyId = useActiveStoreyId()
  const perimeters = useStoreyPerimeters(activeStoreyId)

  return (
    <Layer name="perimeters">
      {perimeters.map(perimeter => (
        <PerimeterShape key={perimeter.id} perimeter={perimeter} />
      ))}
    </Layer>
  )
}
