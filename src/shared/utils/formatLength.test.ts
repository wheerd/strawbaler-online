import { describe, expect, it } from 'vitest'

import { formatLength } from './formatLength'

describe('formatLength', () => {
  describe('mm format (< 100mm and not divisible by 10)', () => {
    it('formats small non-round values in mm', () => {
      expect(formatLength(1)).toBe('1mm')
      expect(formatLength(5)).toBe('5mm')
      expect(formatLength(23)).toBe('23mm')
      expect(formatLength(67)).toBe('67mm')
      expect(formatLength(91)).toBe('91mm')
    })

    it('formats values just under 100mm that are not round', () => {
      expect(formatLength(95)).toBe('95mm')
      expect(formatLength(97)).toBe('97mm')
      expect(formatLength(99)).toBe('99mm')
    })

    it('does not use mm for round values under 100mm', () => {
      // These should use cm format instead
      expect(formatLength(10)).toBe('1cm')
      expect(formatLength(50)).toBe('5cm')
      expect(formatLength(90)).toBe('9cm')
    })
  })

  describe('cm format (< 200mm and divisible by 10)', () => {
    it('formats small round values in cm', () => {
      expect(formatLength(10)).toBe('1cm')
      expect(formatLength(20)).toBe('2cm')
      expect(formatLength(50)).toBe('5cm')
      expect(formatLength(90)).toBe('9cm')
    })

    it('formats medium round values in cm', () => {
      expect(formatLength(100)).toBe('10cm')
      expect(formatLength(120)).toBe('12cm')
      expect(formatLength(150)).toBe('15cm')
      expect(formatLength(180)).toBe('18cm')
      expect(formatLength(190)).toBe('19cm')
    })

    it('uses cm up to but not including 200mm', () => {
      expect(formatLength(190)).toBe('19cm') // Last cm value
      expect(formatLength(200)).toBe('0.2m') // First m value in this range
    })

    it('does not use cm for non-round values', () => {
      // These should use mm or m format instead
      expect(formatLength(105)).toBe('0.105m')
      expect(formatLength(125)).toBe('0.125m')
      expect(formatLength(195)).toBe('0.195m')
    })
  })

  describe('m format (≥ 200mm or < 200mm but not meeting mm/cm criteria)', () => {
    describe('values < 200mm that need m format', () => {
      it('formats non-round values < 200mm in meters', () => {
        expect(formatLength(105)).toBe('0.105m')
        expect(formatLength(125)).toBe('0.125m')
        expect(formatLength(134)).toBe('0.134m')
        expect(formatLength(187)).toBe('0.187m')
        expect(formatLength(195)).toBe('0.195m')
      })
    })

    describe('values ≥ 200mm', () => {
      it('formats all values ≥ 200mm in meters regardless of divisibility', () => {
        expect(formatLength(200)).toBe('0.2m')
        expect(formatLength(210)).toBe('0.21m')
        expect(formatLength(250)).toBe('0.25m')
        expect(formatLength(300)).toBe('0.3m')
        expect(formatLength(500)).toBe('0.5m')
        expect(formatLength(999)).toBe('0.999m')
      })
    })

    describe('precision based on divisibility (exact thousands)', () => {
      it('formats exact thousands with no decimal places', () => {
        expect(formatLength(1000)).toBe('1m')
        expect(formatLength(2000)).toBe('2m')
        expect(formatLength(3000)).toBe('3m')
        expect(formatLength(5000)).toBe('5m')
        expect(formatLength(10000)).toBe('10m')
      })
    })

    describe('precision based on divisibility (hundreds)', () => {
      it('formats values divisible by 100 with 1 decimal place', () => {
        expect(formatLength(1100)).toBe('1.1m')
        expect(formatLength(1300)).toBe('1.3m')
        expect(formatLength(1500)).toBe('1.5m')
        expect(formatLength(2400)).toBe('2.4m')
        expect(formatLength(2700)).toBe('2.7m')
        expect(formatLength(4500)).toBe('4.5m')
      })
    })

    describe('precision based on divisibility (tens)', () => {
      it('formats values divisible by 10 (but not 100) with 2 decimal places', () => {
        expect(formatLength(1010)).toBe('1.01m')
        expect(formatLength(1250)).toBe('1.25m')
        expect(formatLength(1350)).toBe('1.35m')
        expect(formatLength(2750)).toBe('2.75m')
        expect(formatLength(3250)).toBe('3.25m')
        expect(formatLength(4680)).toBe('4.68m')
      })
    })

    describe('precision based on divisibility (units)', () => {
      it('formats values not divisible by 10 with 3 decimal places', () => {
        expect(formatLength(1001)).toBe('1.001m')
        expect(formatLength(1234)).toBe('1.234m')
        expect(formatLength(1567)).toBe('1.567m')
        expect(formatLength(2345)).toBe('2.345m')
        expect(formatLength(3456)).toBe('3.456m')
        expect(formatLength(4789)).toBe('4.789m')
      })
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('handles zero value', () => {
      expect(formatLength(0)).toBe('0m')
    })

    it('handles boundary between mm and cm (100mm)', () => {
      expect(formatLength(99)).toBe('99mm') // Non-round, uses mm
      expect(formatLength(100)).toBe('10cm') // Round and < 200mm, uses cm
    })

    it('handles boundary between cm and m (200mm)', () => {
      expect(formatLength(190)).toBe('19cm') // Round and < 200mm, uses cm
      expect(formatLength(200)).toBe('0.2m') // ≥ 200mm, uses m
    })

    it('handles rounding of fractional values', () => {
      expect(formatLength(99.4)).toBe('99mm')
      expect(formatLength(99.6)).toBe('10cm') // Rounds up to 100, which is 10cm
      expect(formatLength(199.4)).toBe('0.199m') // Rounds down to 199, which is not divisible by 10, so uses m
      expect(formatLength(199.6)).toBe('0.2m') // Rounds up to 200, which is 0.2m
    })

    it('handles negative values gracefully', () => {
      expect(formatLength(-5)).toBe('-5mm')
      expect(formatLength(-50)).toBe('-5cm')
      expect(formatLength(-1000)).toBe('-1m')
    })

    it('handles very large values', () => {
      expect(formatLength(100000)).toBe('100m')
      expect(formatLength(123456)).toBe('123.456m')
    })
  })

  describe('format consistency across ranges', () => {
    it('ensures no overlap between mm and cm ranges', () => {
      // Values that qualify for both mm and cm should use cm
      expect(formatLength(10)).toBe('1cm') // Not 10mm
      expect(formatLength(50)).toBe('5cm') // Not 50mm
      expect(formatLength(90)).toBe('9cm') // Not 90mm
    })

    it('ensures proper transition from cm to m', () => {
      expect(formatLength(190)).toBe('19cm') // Last cm value
      expect(formatLength(200)).toBe('0.2m') // First m value in >= 200 range
      expect(formatLength(210)).toBe('0.21m') // Next m value
    })

    it('validates precision rules for meter format', () => {
      // Same base value with different precisions
      expect(formatLength(1000)).toBe('1m') // Exact thousand
      expect(formatLength(1100)).toBe('1.1m') // Hundred
      expect(formatLength(1110)).toBe('1.11m') // Ten
      expect(formatLength(1111)).toBe('1.111m') // Unit
    })
  })
})
