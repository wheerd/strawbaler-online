import {
  type Length,
  type Line2D,
  type LineSegment2D,
  type Vec2,
  ZERO_VEC2,
  distSqrVec2,
  distVec2,
  distanceToInfiniteLine,
  dotVec2,
  lenSqrVec2,
  lineFromSegment,
  lineIntersection,
  lineSegmentIntersect,
  newVec2,
  projectPointOntoLine,
  scaleAddVec2,
  subVec2
} from '@/shared/geometry'

export interface SnappingContext<T> {
  candidates: SnapCandidate<T>[]
  defaultPointDistance?: Length
  defaultLineDistance?: Length
}

export interface SnapResult<T> {
  position: Vec2
  distance: Length
  lines?: readonly [Line2D] | readonly [Line2D, Line2D]
  meta?: T | 'origin'
  type: 'snap' | 'align'
}

export interface SnapMeta<T> {
  priority?: number
  minDistance?: Length
  meta?: T | 'origin'
}

export interface SnapPoint<T> extends SnapMeta<T> {
  type: 'point'
  position: Vec2
  mode: 'snap' | 'align'
}

export interface SnapLine<T> extends SnapMeta<T> {
  type: 'line'
  line: Line2D
}

export interface SnapLineSegment<T> extends SnapMeta<T> {
  type: 'segment'
  segment: LineSegment2D
}

export type SnapCandidate<T> = SnapPoint<T> | SnapLine<T> | SnapLineSegment<T>

interface InternalMeta {
  priority: number
  isDerived: boolean
  minDistance: Length
  lines?: readonly [Line2D] | readonly [Line2D, Line2D]
}

type InternalSnapCandidate<T> = SnapCandidate<T> & InternalMeta

const PRIORITY_EPS = 0.1

const DEFAULT_DISTANCE = 100

const DEFAULT_CANDIDATES: InternalSnapCandidate<unknown>[] = [
  {
    type: 'point',
    position: ZERO_VEC2,
    mode: 'snap',
    priority: 0,
    meta: 'origin',
    isDerived: false,
    minDistance: DEFAULT_DISTANCE
  },
  {
    type: 'line',
    line: {
      point: ZERO_VEC2,
      direction: newVec2(1, 0)
    },
    priority: 0,
    meta: 'origin',
    isDerived: false,
    minDistance: DEFAULT_DISTANCE,
    lines: [{ point: ZERO_VEC2, direction: newVec2(1, 0) }]
  },
  {
    type: 'line',
    line: {
      point: ZERO_VEC2,
      direction: newVec2(0, 1)
    },
    priority: 0,
    meta: 'origin',
    isDerived: false,
    minDistance: DEFAULT_DISTANCE,
    lines: [{ point: ZERO_VEC2, direction: newVec2(0, 1) }]
  }
] as const

export class SnappingService<T> {
  private readonly candidates: InternalSnapCandidate<T>[] = []

  private readonly context: SnappingContext<T>

  referencePoint: Vec2 | null = null
  referenceMinDistance: Length = DEFAULT_DISTANCE

  constructor(context: SnappingContext<T>) {
    this.context = context
    for (const candidate of DEFAULT_CANDIDATES) {
      this.addSnapCandidateInternal(candidate as InternalSnapCandidate<T>)
    }
    for (const candidate of context.candidates) {
      this.addSnapCandidate(candidate)
    }
  }

  addSnapCandidate(candidate: SnapCandidate<T>): void {
    if (candidate.type === 'point' && candidate.mode === 'align') {
      const { type: _, mode: __, position, ...rest } = candidate
      this.addSnapCandidate({
        ...rest,
        type: 'line',
        line: {
          point: position,
          direction: newVec2(1, 0)
        }
      })
      this.addSnapCandidate({
        ...rest,
        type: 'line',
        line: {
          point: position,
          direction: newVec2(0, 1)
        }
      })
    } else {
      const internalCandidate = this.toInternal(candidate)
      this.addSnapCandidateInternal(internalCandidate)
      if (internalCandidate.type === 'line') {
        const otherLines = this.candidates.filter(
          (c): c is SnapLine<T> & InternalMeta => c.type === 'line' && !c.isDerived && c !== internalCandidate
        )
        for (const existing of otherLines) {
          this.addIntersectionSnapCandidates(internalCandidate, existing)
        }
        const otherSegments = this.candidates.filter(
          (c): c is SnapLineSegment<T> & InternalMeta => c.type === 'segment' && !c.isDerived
        )
        for (const existing of otherSegments) {
          this.addSegmentLineIntersectionSnapCandidates(internalCandidate, existing)
        }
      } else if (internalCandidate.type === 'segment') {
        const otherLines = this.candidates.filter(
          (c): c is SnapLine<T> & InternalMeta => c.type === 'line' && !c.isDerived
        )
        for (const existing of otherLines) {
          this.addSegmentLineIntersectionSnapCandidates(existing, internalCandidate)
        }
      }
    }
  }

  private toInternal(candidate: SnapCandidate<T>) {
    return {
      ...candidate,
      priority: candidate.priority ?? 0,
      isDerived: false,
      minDistance: this.getSnapThreshold(candidate),
      lines:
        candidate.type === 'line'
          ? ([candidate.line] as const)
          : candidate.type === 'segment'
            ? ([lineFromSegment(candidate.segment)] as const)
            : undefined
    }
  }

  findSnapResult(target: Vec2, distanceOverride?: Length): SnapResult<T> | null {
    const referenceDistSq = this.referenceMinDistance * this.referenceMinDistance
    let priority = Infinity
    const results = [] as SnapResult<T>[]
    for (const candidate of this.candidates) {
      if (candidate.priority !== priority) {
        if (results.length > 0) {
          return this.getBestSnapResult(results)
        } else {
          priority = candidate.priority
        }
      }
      const { distance, point } = this.calculateCandidate(target, candidate)
      if (distance <= (distanceOverride ?? candidate.minDistance)) {
        if (!this.referencePoint || distSqrVec2(point, this.referencePoint) >= referenceDistSq) {
          const snapType = 'mode' in candidate ? candidate.mode : candidate.type === 'segment' ? 'snap' : 'align'
          results.push({
            position: point,
            distance,
            lines: candidate.lines,
            meta: candidate.meta,
            type: snapType
          })
        }
      }
    }
    return this.getBestSnapResult(results)
  }

  private getBestSnapResult(results: SnapResult<T>[]): SnapResult<T> | null {
    results.sort((a, b) => a.distance - b.distance)
    return results[0] ?? null
  }

  private calculateCandidate(target: Vec2, candidate: SnapCandidate<T>): { distance: Length; point: Vec2 } {
    switch (candidate.type) {
      case 'point':
        return { distance: distVec2(target, candidate.position), point: candidate.position }
      case 'line':
        return {
          distance: distanceToInfiniteLine(target, candidate.line),
          point: projectPointOntoLine(target, candidate.line)
        }
      case 'segment': {
        const lineVector = subVec2(candidate.segment.end, candidate.segment.start)
        const pointVector = subVec2(target, candidate.segment.start)

        const lineLengthSquared = lenSqrVec2(lineVector)
        if (lineLengthSquared === 0) {
          return { distance: distVec2(target, candidate.segment.start), point: candidate.segment.start }
        }

        const t = Math.max(0, Math.min(1, dotVec2(pointVector, lineVector) / lineLengthSquared))
        const closest = scaleAddVec2(candidate.segment.start, lineVector, t)

        return { distance: distVec2(target, closest), point: closest }
      }
    }
  }

  private getSnapThreshold(candidate: SnapCandidate<T>): Length {
    if (candidate.minDistance != null) {
      return candidate.minDistance
    }
    switch (candidate.type) {
      case 'point':
        return this.context.defaultPointDistance ?? DEFAULT_DISTANCE
      case 'line':
      case 'segment':
        return this.context.defaultLineDistance ?? DEFAULT_DISTANCE
    }
  }

  private addSnapCandidateInternal(candidate: InternalSnapCandidate<T>): void {
    const index = this.candidates.findIndex(c => c.priority < candidate.priority)
    if (index !== -1) {
      this.candidates.splice(index, 0, candidate)
    } else {
      this.candidates.push(candidate)
    }
  }

  private addIntersectionSnapCandidates(line1: SnapLine<T> & InternalMeta, line2: SnapLine<T> & InternalMeta): void {
    const intersection = lineIntersection(line1.line, line2.line)
    if (intersection) {
      const meta =
        line1.priority > line2.priority
          ? line1.meta
          : line2.priority > line1.priority
            ? line2.meta
            : line1.meta === line2.meta
              ? line1.meta
              : undefined
      const minDistance = Math.min(line1.minDistance, line2.minDistance)
      const priority = Math.max(line1.priority, line2.priority) + PRIORITY_EPS
      this.addSnapCandidateInternal({
        type: 'point',
        position: intersection,
        mode: 'snap',
        priority,
        isDerived: true,
        minDistance,
        meta,
        lines: [line1.line, line2.line]
      })
    }
  }

  private addSegmentLineIntersectionSnapCandidates(
    line: SnapLine<T> & InternalMeta,
    segment: SnapLineSegment<T> & InternalMeta
  ): void {
    const intersection = lineSegmentIntersect(line.line, segment.segment)
    if (intersection) {
      const meta =
        line.priority > segment.priority
          ? line.meta
          : segment.priority > line.priority
            ? segment.meta
            : line.meta === segment.meta
              ? line.meta
              : undefined
      const minDistance = Math.min(line.minDistance, segment.minDistance)
      const priority = Math.max(line.priority, segment.priority) + PRIORITY_EPS
      const segmentLine = lineFromSegment(segment.segment)
      this.addSnapCandidateInternal({
        type: 'point',
        position: intersection,
        mode: 'snap',
        priority,
        isDerived: true,
        minDistance,
        meta,
        lines: [line.line, segmentLine]
      })
    }
  }
}
