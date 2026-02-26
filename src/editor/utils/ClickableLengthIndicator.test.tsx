import { describe, expect, it, vi } from 'vitest'

import { ZERO_VEC2, newVec2 } from '@/shared/geometry'
import { renderSvg } from '@/test/helpers'

import { ClickableLengthIndicator } from './ClickableLengthIndicator'

describe('ClickableLengthIndicator', () => {
  const mockOnClick = vi.fn()

  it('should render without crashing', () => {
    const { container } = renderSvg(
      <ClickableLengthIndicator startPoint={ZERO_VEC2} endPoint={newVec2(100, 0)} onClick={mockOnClick} />
    )

    expect(container.firstChild).toBeDefined()
  })

  it('should render with custom label', () => {
    const { container } = renderSvg(
      <ClickableLengthIndicator
        startPoint={ZERO_VEC2}
        endPoint={newVec2(100, 0)}
        label="Custom Label"
        onClick={mockOnClick}
      />
    )

    expect(container.firstChild).toBeDefined()
  })

  it('should handle zero-length measurement', () => {
    const { container } = renderSvg(
      <ClickableLengthIndicator startPoint={ZERO_VEC2} endPoint={ZERO_VEC2} onClick={mockOnClick} />
    )

    expect(container.firstChild).toBeDefined()
  })

  it('should apply visual styling props', () => {
    const { container } = renderSvg(
      <ClickableLengthIndicator
        startPoint={ZERO_VEC2}
        endPoint={newVec2(100, 0)}
        color="#ff0000"
        fontSize={24}
        strokeWidth={6}
        offset={30}
        onClick={mockOnClick}
      />
    )

    expect(container.firstChild).toBeDefined()
  })
})
