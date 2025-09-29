import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { ConstructionElement } from '@/construction/elements'
import { createConstructionElement } from '@/construction/elements'
import type { MaterialId, ResolveMaterialFunction } from '@/construction/materials/material'
import { createCuboidShape, createCutCuboidShape } from '@/construction/shapes'
import type { Length, Vec3 } from '@/shared/geometry'

import { ConstructionElementShape } from './ConstructionElementShape'

// Mock the shape components
vi.mock('./CuboidShape', () => ({
  CuboidShape: ({ fill }: { fill: string }) => <rect data-testid="cuboid-shape" data-fill={fill} />
}))

vi.mock('./CutCuboidShape', () => ({
  CutCuboidShape: ({ fill }: { fill: string }) => <polygon data-testid="cut-cuboid-shape" data-fill={fill} />
}))

describe('ConstructionElementShape', () => {
  const mockMaterialId = 'material_test' as MaterialId

  const mockResolveMaterial: ResolveMaterialFunction = vi.fn((id: MaterialId) => ({
    id,
    name: 'Test Material',
    type: 'dimensional' as const,
    color: '#FF0000',
    width: 100 as Length,
    thickness: 50 as Length,
    availableLengths: [1000 as Length]
  }))

  // Mock projection functions for testing
  const mockProjection = vi.fn((p: Vec3): Vec3 => p)
  const mockRotationProjection = vi.fn((r: Vec3): number => (r[2] * 180) / Math.PI)

  const mockCuboidElement: ConstructionElement = createConstructionElement(
    mockMaterialId,
    createCuboidShape([0, 0, 0], [100, 50, 25]),
    { position: [0, 0, 0], rotation: [0, 0, 0] }
  )

  const mockCutCuboidElement: ConstructionElement = createConstructionElement(
    mockMaterialId,
    createCutCuboidShape([0, 0, 0], [100, 50, 25], {
      plane: 'xy',
      axis: 'y',
      angle: 45
    }),
    { position: [0, 0, 0], rotation: [0, 0, 0] }
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cuboid shapes correctly', () => {
    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          resolveMaterial={mockResolveMaterial}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toBeInTheDocument()
    expect(cuboidShape).toHaveAttribute('data-fill', '#FF0000')
  })

  it('renders cut-cuboid shapes correctly', () => {
    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape
          element={mockCutCuboidElement}
          resolveMaterial={mockResolveMaterial}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cutCuboidShape = getByTestId('cut-cuboid-shape')
    expect(cutCuboidShape).toBeInTheDocument()
    expect(cutCuboidShape).toHaveAttribute('data-fill', '#FF0000')
  })

  it('uses material color for fill', () => {
    const customMaterialResolver: ResolveMaterialFunction = vi.fn(() => ({
      id: mockMaterialId,
      name: 'Custom Material',
      type: 'dimensional' as const,
      color: '#00FF00',
      width: 100 as Length,
      thickness: 50 as Length,
      availableLengths: [1000 as Length]
    }))

    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          resolveMaterial={customMaterialResolver}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toHaveAttribute('data-fill', '#00FF00')
  })

  it('uses fallback color when material is not found', () => {
    const failingResolver: ResolveMaterialFunction = vi.fn(() => undefined)

    const { getByTestId } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          resolveMaterial={failingResolver}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
        />
      </svg>
    )

    const cuboidShape = getByTestId('cuboid-shape')
    expect(cuboidShape).toHaveAttribute('data-fill', '#8B4513') // fallback color
  })

  it('throws error for unsupported shape types', () => {
    const unsupportedElement: ConstructionElement = createConstructionElement(
      mockMaterialId,
      {
        type: 'unsupported-shape' as any,
        offset: [0, 0, 0],
        size: [100, 50, 25],
        bounds: { min: [0, 0, 0], max: [100, 50, 25] }
      },
      { position: [0, 0, 0], rotation: [0, 0, 0] }
    )

    expect(() => {
      render(
        <svg>
          <ConstructionElementShape
            element={unsupportedElement}
            resolveMaterial={mockResolveMaterial}
            projection={mockProjection}
            rotationProjection={mockRotationProjection}
          />
        </svg>
      )
    }).toThrow('Unsupported shape type: unsupported-shape')
  })

  it('passes through props correctly', () => {
    const { container } = render(
      <svg>
        <ConstructionElementShape
          element={mockCuboidElement}
          resolveMaterial={mockResolveMaterial}
          projection={mockProjection}
          rotationProjection={mockRotationProjection}
          stroke="#0000FF"
          strokeWidth={10}
          showDebugMarkers
          className="test-class"
        />
      </svg>
    )

    const group = container.querySelector('g')
    expect(group).toHaveClass('test-class')
  })
})
