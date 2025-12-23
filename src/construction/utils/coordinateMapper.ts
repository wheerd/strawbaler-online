import { type VirtualSegment } from './calculateBeamSegments'

/**
 * Maps coordinates between virtual (original) space and display (with visual gaps) space.
 * Handles the display positioning of segments with configurable gap widths.
 */
export class CoordinateMapper {
  private segments: VirtualSegment[]
  private gapDisplayWidth: number

  constructor(segments: VirtualSegment[], gapDisplayWidth: number) {
    this.segments = segments
    this.gapDisplayWidth = gapDisplayWidth
  }

  /**
   * Converts a virtual X coordinate to display X coordinate.
   * Returns null if the point is in a gap.
   */
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

  /**
   * Converts a display X coordinate to virtual X coordinate.
   */
  toVirtual(displayX: number): number {
    let displayOffset = 0

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i]
      const segmentWidth = segment.end - segment.start

      if (displayX >= displayOffset && displayX <= displayOffset + segmentWidth) {
        const offsetInSegment = displayX - displayOffset
        return segment.start + offsetInSegment
      }

      displayOffset += segmentWidth

      if (i < this.segments.length - 1) {
        displayOffset += this.gapDisplayWidth
      }
    }

    // If not in any segment, return as-is (shouldn't happen in normal usage)
    return displayX
  }

  /**
   * Checks if a virtual X coordinate is in a gap.
   */
  isInGap(virtualX: number): boolean {
    for (let i = 0; i < this.segments.length - 1; i++) {
      const currentEnd = this.segments[i].end
      const nextStart = this.segments[i + 1].start

      if (virtualX > currentEnd && virtualX < nextStart) {
        return true
      }
    }
    return false
  }

  /**
   * Gets the segment containing a given virtual X coordinate.
   */
  getSegmentForVirtualX(virtualX: number): VirtualSegment | null {
    for (const segment of this.segments) {
      if (virtualX >= segment.start && virtualX <= segment.end) {
        return segment
      }
    }
    return null
  }

  /**
   * Gets the display X coordinate for the start of a segment.
   */
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

  /**
   * Gets the display X coordinate for the end of a segment.
   */
  getSegmentDisplayEnd(segmentIndex: number): number {
    if (segmentIndex >= this.segments.length) {
      return this.getTotalDisplayWidth()
    }

    const segment = this.segments[segmentIndex]
    return this.getSegmentDisplayStart(segmentIndex) + (segment.end - segment.start)
  }

  /**
   * Gets the display X coordinate for the center of a gap.
   */
  getGapDisplayCenter(gapIndex: number): number {
    if (gapIndex >= this.getGapCount()) {
      return 0
    }

    const displayEnd = this.getSegmentDisplayEnd(gapIndex)
    return displayEnd + this.gapDisplayWidth / 2
  }

  /**
   * Gets the display X coordinate for the start of a gap (left edge).
   */
  getGapDisplayStart(gapIndex: number): number {
    if (gapIndex >= this.getGapCount()) {
      return 0
    }

    return this.getSegmentDisplayEnd(gapIndex)
  }

  /**
   * Gets the display X coordinate for the end of a gap (right edge).
   */
  getGapDisplayEnd(gapIndex: number): number {
    if (gapIndex >= this.getGapCount()) {
      return 0
    }

    return this.getSegmentDisplayEnd(gapIndex) + this.gapDisplayWidth
  }

  /**
   * Gets the virtual length of a gap (omitted distance).
   */
  getGapVirtualLength(gapIndex: number): number {
    if (gapIndex >= this.getGapCount()) {
      return 0
    }

    const currentSegment = this.segments[gapIndex]
    const nextSegment = this.segments[gapIndex + 1]

    return nextSegment.start - currentSegment.end
  }

  /**
   * Gets the total display width including all segments and gaps.
   */
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

  /**
   * Gets the number of segments.
   */
  getSegmentCount(): number {
    return this.segments.length
  }

  /**
   * Gets the number of gaps (always segments.length - 1).
   */
  getGapCount(): number {
    return Math.max(0, this.segments.length - 1)
  }

  /**
   * Gets all segments.
   */
  getSegments(): VirtualSegment[] {
    return this.segments
  }
}
