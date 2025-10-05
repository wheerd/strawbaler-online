import { describe, expect, it } from 'vitest'

import { degreesToRadians, radiansToDegrees } from './basic'

describe('basic geometry utilities', () => {
  describe('angle conversion', () => {
    it('should convert degrees to radians correctly', () => {
      expect(degreesToRadians(0)).toBeCloseTo(0)
      expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2)
      expect(degreesToRadians(180)).toBeCloseTo(Math.PI)
      expect(degreesToRadians(270)).toBeCloseTo((3 * Math.PI) / 2)
      expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI)
    })

    it('should convert radians to degrees correctly', () => {
      expect(radiansToDegrees(0)).toBeCloseTo(0)
      expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90)
      expect(radiansToDegrees(Math.PI)).toBeCloseTo(180)
      expect(radiansToDegrees((3 * Math.PI) / 2)).toBeCloseTo(270)
      expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360)
    })
  })
})
