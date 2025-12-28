import type { ConstructionGroup, GroupOrElement } from '@/construction/elements'
import { useEffectiveOpacity } from '@/construction/viewer3d/context/TagOpacityContext'
import { toThreeTransform } from '@/construction/viewer3d/utils/geometry'

import ConstructionElement3D from './ConstructionElement3D'

interface ConstructionGroup3DProps {
  group: ConstructionGroup
  parentOpacity?: number
  parentTags?: { id: string; category: string }[]
}

function ConstructionGroup3D({
  group,
  parentOpacity = 1,
  parentTags = []
}: ConstructionGroup3DProps): React.JSX.Element | null {
  const { position, rotation, scale } = toThreeTransform(group.transform)
  const groupOpacity = useEffectiveOpacity(group.tags ?? [])
  const opacity = Math.min(parentOpacity, groupOpacity)

  if (opacity === 0) return null

  // Combine parent tags with this group's tags
  const combinedTags = [...parentTags, ...(group.tags ?? [])]

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {group.children.map(child => (
        <GroupOrElement3D key={child.id} element={child} parentOpacity={opacity} parentTags={combinedTags} />
      ))}
    </group>
  )
}

function GroupOrElement3D({
  element,
  parentOpacity,
  parentTags
}: {
  element: GroupOrElement
  parentOpacity?: number
  parentTags?: { id: string; category: string }[]
}): React.JSX.Element | null {
  if ('children' in element) {
    return <ConstructionGroup3D group={element} parentOpacity={parentOpacity} parentTags={parentTags} />
  }
  return <ConstructionElement3D element={element} parentOpacity={parentOpacity} parentTags={parentTags} />
}

export default ConstructionGroup3D
