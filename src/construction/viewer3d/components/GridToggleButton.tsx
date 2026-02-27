import { Frame } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useGrid3DActions, useShowGrid3D } from '@/construction/viewer3d/hooks/useGrid3D'
import { Button } from '@/shared/ui/components/button'

export function GridToggleButton(): React.JSX.Element {
  const { t } = useTranslation('viewer')
  const showGrid = useShowGrid3D()
  const { toggleGrid } = useGrid3DActions()

  return (
    <Button
      variant={showGrid ? 'default' : 'outline'}
      size="icon-sm"
      title={showGrid ? t($ => $.grid.hide) : t($ => $.grid.show)}
      onClick={toggleGrid}
    >
      <Frame />
    </Button>
  )
}
