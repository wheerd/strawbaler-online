import { Trash } from 'lucide-react'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import type { WallNodeId } from '@/building/model/ids'
import { useModelActions, useWallNodeById } from '@/building/store'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import { Bounds2D } from '@/shared/geometry'
import { Button } from '@/shared/ui/components/button'
import { FitToViewIcon } from '@/shared/ui/icons'

export function WallNodeInspector({ nodeId }: { nodeId: WallNodeId }): React.JSX.Element {
  const { t } = useTranslation('inspector')
  const node = useWallNodeById(nodeId)
  const { removeWallNode } = useModelActions()
  const { fitToView } = useViewportActions()

  const handleFitToView = useCallback(() => {
    const bounds = Bounds2D.fromPoints(node.boundary?.points ?? [node.center])
    fitToView(bounds)
  }, [node, fitToView])

  const handleDelete = useCallback(() => {
    removeWallNode(nodeId)
  }, [removeWallNode, nodeId])

  return (
    <div className="p-2">
      <div className="flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          <Button size="icon" title={t($ => $.wallNode.fitToView)} onClick={handleFitToView}>
            <FitToViewIcon />
          </Button>
          <Button size="icon" variant="destructive" title={t($ => $.wallNode.deleteNode)} onClick={handleDelete}>
            <Trash />
          </Button>
        </div>
      </div>
    </div>
  )
}
