import { Button } from '@radix-ui/themes'

import { useOpacityControl } from '@/construction/viewer3d/context/OpacityControlContext'

function OpacityControlButton(): React.JSX.Element {
  const { getOpacityForCategory, cycleOpacityForCategory } = useOpacityControl()

  const strawOpacity = getOpacityForCategory('straw')

  const label = strawOpacity === 1.0 ? 'Straw: 100%' : strawOpacity === 0.5 ? 'Straw: 50%' : 'Straw: 0%'

  return (
    <Button
      size="2"
      variant={strawOpacity < 1.0 ? 'solid' : 'outline'}
      onClick={() => cycleOpacityForCategory('straw')}
    >
      {label}
    </Button>
  )
}

export default OpacityControlButton
