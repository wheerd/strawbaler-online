import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MeasurementLayer } from './MeasurementLayer'

describe('MeasurementLayer', () => {
  it('renders a pointer-transparent annotation group', () => {
    const { container } = render(
      <svg>
        <MeasurementLayer />
      </svg>
    )
    const layer = container.querySelector('[data-layer="measurements"]')

    expect(layer).toBeTruthy()
    expect(layer).toHaveAttribute('pointer-events', 'none')
  })
})
