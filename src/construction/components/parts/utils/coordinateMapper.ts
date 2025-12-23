import { type VirtualSegment } from './calculateBeamSegments'

export class CoordinateMapper {
  private segments: VirtualSegment[]
  private gapDisplayWidth: number

  constructor(segments: VirtualSegment[], gapDisplayWidth: number) {
    this.segments = segments
    this.gapDisplayWidth = gapDisplayWidth
  }

  toDisplay(virtualX: number): number | null {
    let displayOffset = 0

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]

      if (virtualX >= segment.start && virtualX <= segment.end) {
        // Point is within this segment
        const offsetInSegment = virtualX - segment.start
        return displayOffset + offsetInSegment
      }

      // Add this segment's width to offset
      displayOffset += segment.end - segment.start

      // Add gap width if there's a next segment and point might be after this
      if (i < this.segments.length - 1) {
        const nextSegment = this.segments[i + 1]
        if (virtualX < nextSegment.start) {
          // Point is in the gap between this segment and next
          return null
        }
        displayOffset += this.gapDisplayWidth
      }
    }

    // Point is beyond all segments
    return null
  }

  getSegmentDisplayStart(segmentIndex: number): number {
    let displayOffset = 0

    for (let i = 0; i < segmentIndex && i < this.segments.length; i++) {
      displayOffset += this.segments[i].end - this.segments[i].start
      if (i < this.segments.length - 1) {
        displayOffset += this.gapDisplayWidth
      }
    }

    return displayOffset
  }

  getSegmentDisplayEnd(segmentIndex: number): number {
    if (segmentIndex >= this.segments.length) {
      return this.getTotalDisplayWidth()
    }

    const segment = this.segments[segmentIndex]
    return this.getSegmentDisplayStart(segmentIndex) + (segment.end - segment.start)
  }

  getTotalDisplayWidth(): number {
    let width = 0

    for (let i = 0; i < this.segments.length; i++) {
      width += this.segments[i].end - this.segments[i].start

      if (i < this.segments.length - 1) {
        width += this.gapDisplayWidth
      }
    }

    return width
  }
}
