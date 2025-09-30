import { describe, expect, it } from 'vitest'

import { createConstructionElement } from './elements'
import { createConstructionGroup, transformModel } from './model'
import { createCuboidShape } from './shapes'

describe('Construction Model', () => {
  describe('createConstructionGroup', () => {
    it('should calculate bounds from transformed children', () => {
      // Create a simple 1x1x1 cube at origin
      const testElement = createConstructionElement('test-material' as any, createCuboidShape([0, 0, 0], [1, 1, 1]), {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      })

      // Original bounds should be 0,0,0 to 1,1,1
      expect(Array.from(testElement.bounds.min)).toEqual([0, 0, 0])
      expect(Array.from(testElement.bounds.max)).toEqual([1, 1, 1])

      // Create a group with z-transform (like ring beam at top)
      const transformedGroup = createConstructionGroup(
        [testElement],
        { position: [0, 0, 2], rotation: [0, 0, 0] } // Move up by 2 units
      )

      // Group bounds should reflect the transformed position
      expect(Array.from(transformedGroup.bounds.min)).toEqual([0, 0, 2]) // z moved from 0 to 2
      expect(Array.from(transformedGroup.bounds.max)).toEqual([1, 1, 3]) // z moved from 1 to 3
    })

    it('should handle multiple children with different transforms', () => {
      const element1 = createConstructionElement('test-material' as any, createCuboidShape([0, 0, 0], [1, 1, 1]), {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      })

      const element2 = createConstructionElement('test-material' as any, createCuboidShape([2, 0, 0], [1, 1, 1]), {
        position: [0, 0, 0],
        rotation: [0, 0, 0]
      })

      // Group transform moves everything up by 1 unit
      const multiElementGroup = createConstructionGroup([element1, element2], {
        position: [0, 0, 1],
        rotation: [0, 0, 0]
      })

      // Should encompass both transformed elements
      expect(Array.from(multiElementGroup.bounds.min)).toEqual([0, 0, 1]) // leftmost x, bottom y, transformed z
      expect(Array.from(multiElementGroup.bounds.max)).toEqual([3, 1, 2]) // rightmost x, top y, transformed z
    })
  })

  describe('transformModel', () => {
    it('should create group with correct bounds for ring beam scenario', () => {
      // Simulate a ring beam model
      const ringBeamElement = createConstructionElement(
        'wood' as any,
        createCuboidShape([0, 0, 0], [10, 1, 0.2]), // Long beam, 20cm high
        { position: [0, 0, 0], rotation: [0, 0, 0] }
      )

      const model = {
        elements: [ringBeamElement],
        measurements: [],
        areas: [],
        errors: [],
        warnings: [],
        bounds: ringBeamElement.bounds
      }

      // Transform to top of 3m high wall (like in perimeter.ts)
      const storeyHeight = 3
      const beamHeight = 0.2
      const transformedModel = transformModel(model, {
        position: [0, 0, storeyHeight - beamHeight],
        rotation: [0, 0, 0]
      })

      // Should have one group element
      expect(transformedModel.elements).toHaveLength(1)

      const group = transformedModel.elements[0]
      expect('children' in group).toBe(true)

      // Group bounds should reflect the transformed position at the top
      expect(group.bounds.min[2]).toBeCloseTo(2.8, 5) // 3 - 0.2 = 2.8
      expect(group.bounds.max[2]).toBeCloseTo(3.0, 5) // 2.8 + 0.2 = 3.0
    })
  })
})
