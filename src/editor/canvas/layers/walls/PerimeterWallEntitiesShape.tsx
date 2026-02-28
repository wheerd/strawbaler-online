import { type PerimeterWallId, isOpeningId } from '@/building/model/ids'
import { usePerimeterWallById } from '@/building/store'
import { OpeningShape } from '@/editor/canvas/layers/walls/OpeningShape'
import { WallPostShape } from '@/editor/canvas/layers/walls/WallPostShape'

export function PerimeterWallEntitiesShape({ wallId }: { wallId: PerimeterWallId }): React.JSX.Element {
  const wall = usePerimeterWallById(wallId)

  return (
    <>
      {/* Render wall entities in this wall */}
      {wall.entityIds.map(id =>
        isOpeningId(id) ? (
          <OpeningShape key={`opening-${id}`} openingId={id} />
        ) : (
          <WallPostShape key={`post-${id}`} postId={id} />
        )
      )}
    </>
  )
}
