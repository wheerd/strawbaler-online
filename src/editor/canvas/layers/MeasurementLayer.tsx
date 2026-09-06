import type { WallEntity, WallEntityGeometry } from '@/building/model'
import type { PerimeterId } from '@/building/model/ids'
import {
  useIntermediateWallsByPerimeter,
  useModelActions,
  usePerimeterById,
  usePerimetersOfActiveStorey,
  useWallNodesByPerimeter
} from '@/building/store'
import { EntityMeasurementsShape } from '@/editor/canvas/layers/measurements/EntityMeasurementsShape'
import { IntermediateWallMeasurementsShape } from '@/editor/canvas/layers/measurements/IntermediateWallMeasurementsShape'
import { PerimeterCornerMeasurementsShape } from '@/editor/canvas/layers/measurements/PerimeterCornerMeasurementsShape'
import { PerimeterWallMeasurementsShape } from '@/editor/canvas/layers/measurements/PerimeterWallMeasurementsShape'
import { WallNodeMeasurementsShape } from '@/editor/canvas/layers/measurements/WallNodeMeasurementsShape'

export function MeasurementLayer(): React.JSX.Element {
  const perimeters = usePerimetersOfActiveStorey()

  return (
    <g data-layer="measurements" pointerEvents="none">
      {perimeters.map(perimeter => (
        <PerimeterMeasurementGroup key={perimeter.id} perimeterId={perimeter.id} />
      ))}
    </g>
  )
}

function PerimeterMeasurementGroup({ perimeterId }: { perimeterId: PerimeterId }): React.JSX.Element {
  const perimeter = usePerimeterById(perimeterId)
  const intermediateWalls = useIntermediateWallsByPerimeter(perimeterId)
  const wallNodes = useWallNodesByPerimeter(perimeterId)
  const modelActions = useModelActions()

  return (
    <g data-perimeter-id={perimeterId}>
      {perimeter.wallIds.map(wallId => {
        const wall = modelActions.getPerimeterWallById(wallId)
        return (
          <g key={wallId}>
            <PerimeterWallMeasurementsShape wallId={wallId} />
            {wall.entityIds.map(entityId => (
              <EntityMeasurementsShape
                key={entityId}
                entity={modelActions.getWallEntityById(entityId) as WallEntity & WallEntityGeometry}
              />
            ))}
          </g>
        )
      })}
      {intermediateWalls.map(wall => (
        <g key={wall.id}>
          <IntermediateWallMeasurementsShape wallId={wall.id} />
          {wall.entityIds.map(entityId => (
            <EntityMeasurementsShape
              key={entityId}
              entity={modelActions.getWallEntityById(entityId) as WallEntity & WallEntityGeometry}
            />
          ))}
        </g>
      ))}
      {perimeter.cornerIds.map(cornerId => (
        <PerimeterCornerMeasurementsShape key={cornerId} cornerId={cornerId} />
      ))}
      {wallNodes.map(node => (
        <WallNodeMeasurementsShape key={node.id} nodeId={node.id} />
      ))}
    </g>
  )
}
