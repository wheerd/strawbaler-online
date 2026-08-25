import { useEffect, useState } from 'react'

import { useActiveStoreyId } from '@/building/store'
import { useFloorPlanForStorey } from '@/editor/canvas/plan-overlay/store'

export function PlanImageLayer({ placement }: { placement: 'under' | 'over' }): React.JSX.Element | null {
  const activeStoreyId = useActiveStoreyId()
  const plan = useFloorPlanForStorey(activeStoreyId)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (plan?.image) {
      const url = URL.createObjectURL(plan.image)
      setImageUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setImageUrl(null)
    }
  }, [plan?.image])

  if (plan?.placement !== placement || !imageUrl) {
    return null
  }
  const mmPerPixel = plan.calibration.mmPerPixel
  const worldWidth = plan.imageMeta.width * mmPerPixel
  const worldHeight = plan.imageMeta.height * mmPerPixel
  const worldX = plan.origin.world.x - plan.origin.image.x * mmPerPixel
  const worldY = plan.origin.world.y + plan.origin.image.y * mmPerPixel

  return (
    <g
      data-layer={`plan-image-${placement}`}
      className="pointer-events-none"
      opacity={plan.opacity}
      transform="scale(1, -1)"
    >
      <image
        href={imageUrl}
        x={worldX}
        y={-worldY}
        width={worldWidth}
        height={worldHeight}
        crossOrigin="anonymous"
        pointerEvents="none"
      />
    </g>
  )
}
