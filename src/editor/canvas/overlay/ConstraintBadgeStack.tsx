import { type Vec2, normVec2 } from '@/shared/geometry'

import { ConstraintBadge, type ConstraintBadgeProps, getConstraintBadgeSize } from './ConstraintBadge'

export type ConstraintBadgeStackItem = Omit<
  ConstraintBadgeProps,
  'basePoint' | 'offsetDirection' | 'offsetDistance'
> & {
  id: string
}

export function ConstraintBadgeStack({
  basePoint,
  offsetDirection,
  baseOffset,
  gap = 20,
  items
}: {
  basePoint: Vec2
  offsetDirection: Vec2
  baseOffset: number
  gap?: number
  items: readonly ConstraintBadgeStackItem[]
}): React.JSX.Element {
  const direction = normVec2(offsetDirection)
  const offsets: number[] = []
  let nextOffset = baseOffset

  for (const item of items) {
    offsets.push(nextOffset)
    // Offset distances are scaled by ConstraintBadge; use unscaled dimensions
    // here so the visual gap remains stable as the viewport zoom changes.
    const size = getConstraintBadgeSize(item.label, 1)
    const projectedHalfExtent = (size.width * Math.abs(direction[0]) + size.height * Math.abs(direction[1])) / 2
    nextOffset += projectedHalfExtent * 2 + gap
  }

  return (
    <>
      {items.map((item, index) => (
        <ConstraintBadge
          key={item.id}
          {...item}
          basePoint={basePoint}
          offsetDirection={direction}
          offsetDistance={offsets[index]}
        />
      ))}
    </>
  )
}
