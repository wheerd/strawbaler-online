import type { ConstructionGroup } from '@/construction/elements'
import type { CutFunction, Projection, RotationProjection, ZOrder } from '@/construction/geometry'
import { createSvgTransform } from '@/construction/geometry'
import type { ResolveMaterialFunction } from '@/construction/materials/material'

import { ConstructionElementShape } from './ConstructionElementShape'

export interface ConstructionGroupElementProps {
  group: ConstructionGroup
  projection: Projection
  zOrder: ZOrder
  rotationProjection: RotationProjection
  resolveMaterial: ResolveMaterialFunction
  aboveCut: CutFunction
}

export function ConstructionGroupElement({
  group,
  projection,
  zOrder,
  rotationProjection,
  resolveMaterial,
  aboveCut
}: ConstructionGroupElementProps): React.JSX.Element {
  const sortedElements = [...group.children].sort(zOrder)

  // Check if group should be hidden by cut
  const className = aboveCut(group) ? 'construction-group above-cut' : 'construction-group'

  return (
    <g className={className} transform={createSvgTransform(group.transform, projection, rotationProjection)}>
      {sortedElements.map(element =>
        'children' in element ? (
          <ConstructionGroupElement
            key={element.id}
            group={element}
            projection={projection}
            zOrder={zOrder}
            rotationProjection={rotationProjection}
            resolveMaterial={resolveMaterial}
            aboveCut={aboveCut}
          />
        ) : (
          <ConstructionElementShape
            key={element.id}
            element={element}
            projection={projection}
            rotationProjection={rotationProjection}
            resolveMaterial={resolveMaterial}
            aboveCut={aboveCut}
          />
        )
      )}
    </g>
  )
}
