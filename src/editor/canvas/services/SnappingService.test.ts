import { newVec2 } from '@/shared/geometry'

import { type SnapCandidate, type SnappingContext, SnappingService } from './SnappingService'

describe('SnappingService', () => {
  let service: SnappingService<unknown>

  beforeEach(() => {
    service = new SnappingService<unknown>({ candidates: [] })
  })

  describe('Constructor', () => {
    it('should create service with empty candidates', () => {
      expect(service).toBeInstanceOf(SnappingService)
    })

    it('should always include origin candidates', () => {
      const target = newVec2(10, 10)
      const result = service.findSnapResult(target)
      expect(result).not.toBeNull()
      expect(result?.meta).toBe('origin')
    })

    it('should create service with default distances', () => {
      const context: SnappingContext<void> = { candidates: [] }
      const svc = new SnappingService<void>(context)
      expect(svc).toBeInstanceOf(SnappingService)
    })

    it('should create service with custom distances', () => {
      const context: SnappingContext<void> = {
        candidates: [],
        defaultPointDistance: 300,
        defaultLineDistance: 150
      }
      const svc = new SnappingService<void>(context)
      expect(svc).toBeInstanceOf(SnappingService)
    })
  })

  describe('Point Snapping', () => {
    it('should snap to nearby snap point', () => {
      const point = newVec2(100, 100)
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: point, mode: 'snap' }]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(150, 120)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position).toEqual(point)
      expect(result?.type).toBe('snap')
    })

    it('should not snap to point outside default distance', () => {
      const point = newVec2(100, 100)
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: point, mode: 'snap' }]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(500, 500)
      const result = svc.findSnapResult(target)

      expect(result).toBeNull()
    })

    it('should snap to closest point when multiple are nearby', () => {
      const point1 = newVec2(100, 100)
      const point2 = newVec2(150, 150)
      const candidates: SnapCandidate<void>[] = [
        { type: 'point', position: point1, mode: 'snap' },
        { type: 'point', position: point2, mode: 'snap' }
      ]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(120, 110)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position).toBe(point1)
    })
  })

  describe('Align Point Snapping', () => {
    it('should snap to horizontal line through align point', () => {
      const point = newVec2(100, 100)
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: point, mode: 'align' }]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(400, 110)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100)
      expect(result?.position[0]).toBe(400)
      expect(result?.type).toBe('align')
    })

    it('should snap to vertical line through align point', () => {
      const point = newVec2(100, 100)
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: point, mode: 'align' }]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(110, 400)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position[0]).toBe(100)
      expect(result?.position[1]).toBe(400)
      expect(result?.type).toBe('align')
    })
  })

  describe('Line Snapping', () => {
    it('should snap to infinite line', () => {
      const candidates: SnapCandidate<void>[] = [
        {
          type: 'line',
          line: { point: newVec2(100, 100), direction: newVec2(1, 0) }
        }
      ]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(300, 110)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100)
      expect(result?.position[0]).toBe(300)
    })

    it('should snap to line segment', () => {
      const candidates: SnapCandidate<void>[] = [
        {
          type: 'segment',
          segment: { start: newVec2(100, 100), end: newVec2(200, 100) }
        }
      ]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(150, 110)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100)
      expect(result?.position[0]).toBe(150)
    })

    it('should not snap to segment when projected point is outside segment', () => {
      const candidates: SnapCandidate<void>[] = [
        {
          type: 'segment',
          segment: { start: newVec2(100, 100), end: newVec2(200, 100) }
        }
      ]
      const svc = new SnappingService<void>({ candidates, defaultLineDistance: 10 })

      const target = newVec2(300, 105)
      const result = svc.findSnapResult(target)

      expect(result).toBeNull()
    })
  })

  describe('Intersection Snapping', () => {
    it('should snap to intersection of two lines', () => {
      const candidates: SnapCandidate<void>[] = [
        { type: 'point', position: newVec2(1000, 1000), mode: 'align' },
        { type: 'point', position: newVec2(2000, 2000), mode: 'align' }
      ]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(1005, 1995)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.lines?.length).toBe(2)
      expect(result?.position[0]).toBe(1000)
      expect(result?.position[1]).toBe(2000)
    })
  })

  describe('Reference Point', () => {
    it('should filter results too close to reference point', () => {
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: newVec2(100, 100), mode: 'align' }]
      const svc = new SnappingService<void>({ candidates })
      svc.referencePoint = newVec2(100, 100)
      svc.referenceMinDistance = 50

      const target = newVec2(130, 105)
      const result = svc.findSnapResult(target)

      expect(result).toBeNull()
    })

    it('should allow results far enough from reference point', () => {
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: newVec2(100, 100), mode: 'align' }]
      const svc = new SnappingService<void>({ candidates })
      svc.referencePoint = newVec2(100, 100)
      svc.referenceMinDistance = 50

      const target = newVec2(400, 110)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position[1]).toBe(100)
    })

    it('should not filter when reference point is null', () => {
      const candidates: SnapCandidate<void>[] = [{ type: 'point', position: newVec2(100, 100), mode: 'snap' }]
      const svc = new SnappingService<void>({ candidates })
      svc.referencePoint = null

      const target = newVec2(110, 105)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
    })
  })

  describe('Priority', () => {
    it('should prefer higher priority candidates', () => {
      const lowPriority: SnapCandidate<void> = { type: 'point', position: newVec2(100, 100), mode: 'snap', priority: 0 }
      const highPriority: SnapCandidate<void> = {
        type: 'point',
        position: newVec2(200, 200),
        mode: 'snap',
        priority: 1
      }
      const candidates: SnapCandidate<void>[] = [lowPriority, highPriority]
      const svc = new SnappingService<void>({ candidates })

      const target = newVec2(180, 180)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position).toEqual(newVec2(200, 200))
    })
  })

  describe('addSnapCandidate', () => {
    it('should dynamically add candidates', () => {
      const svc = new SnappingService<void>({ candidates: [] })

      svc.addSnapCandidate({ type: 'point', position: newVec2(500, 500), mode: 'snap' })

      const target = newVec2(510, 505)
      const result = svc.findSnapResult(target)

      expect(result).not.toBeNull()
      expect(result?.position).toEqual(newVec2(500, 500))
    })

    it('should expand align points into horizontal and vertical lines', () => {
      const svc = new SnappingService<void>({ candidates: [] })

      svc.addSnapCandidate({ type: 'point', position: newVec2(300, 300), mode: 'align' })

      const horizontalResult = svc.findSnapResult(newVec2(500, 310))
      expect(horizontalResult).not.toBeNull()
      expect(horizontalResult?.position[1]).toBe(300)

      const verticalResult = svc.findSnapResult(newVec2(310, 500))
      expect(verticalResult).not.toBeNull()
      expect(verticalResult?.position[0]).toBe(300)
    })
  })

  describe('minDistance', () => {
    it('should use per-candidate minDistance when set', () => {
      const candidates: SnapCandidate<void>[] = [
        { type: 'line', line: { point: newVec2(0, 100), direction: newVec2(1, 0) }, minDistance: 10 }
      ]
      const svc = new SnappingService<void>({ candidates, defaultLineDistance: 200 })

      const target = newVec2(200, 115)
      const result = svc.findSnapResult(target)

      expect(result).toBeNull()
    })
  })
})
