import { type BeamSegment, type SegmentGap } from './calculateBeamSegments'

/**
 * Maps coordinates between virtual (original) space and display (gaps removed) space.
 */
export class CoordinateMapper {
  private segments: BeamSegment[]
  private gaps: SegmentGap[]

  constructor(segments: BeamSegment[], gaps: SegmentGap[]) {
    this.segments = segments
    this.gaps = gaps
  }

  /**
   * Converts a virtual X coordinate to display X coordinate.
   * Returns null if the point is in a gap.
   */
  toDisplay(virtualX: number): number | null {
    const segment = this.getSegmentForVirtualX(virtualX)

    if (!segment) {
      return null // Point is in a gap
    }

    // Calculate offset within the segment
    const offsetInSegment = virtualX - segment.virtualStart
    return segment.displayStart + offsetInSegment
  }

  /**
   * Converts a display X coordinate to virtual X coordinate.
   */
  toVirtual(displayX: number): number {
    for (const segment of this.segments) {
      if (displayX >= segment.displayStart && displayX <= segment.displayEnd) {
        const offsetInSegment = displayX - segment.displayStart
        return segment.virtualStart + offsetInSegment
      }
    }

    // If not in any segment, return as-is (shouldn't happen in normal usage)
    return displayX
  }

  /**
   * Checks if a virtual X coordinate is in a gap.
   */
  isInGap(virtualX: number): boolean {
    return this.gaps.some(gap => virtualX > gap.virtualStart && virtualX < gap.virtualEnd)
  }

  /**
   * Gets the segment containing a given virtual X coordinate.
   */
  getSegmentForVirtualX(virtualX: number): BeamSegment | null {
    for (const segment of this.segments) {
      if (virtualX >= segment.virtualStart && virtualX <= segment.virtualEnd) {
        return segment
      }
    }
    return null
  }

  /**
   * Gets all segments.
   */
  getSegments(): BeamSegment[] {
    return this.segments
  }

  /**
   * Gets all gaps.
   */
  getGaps(): SegmentGap[] {
    return this.gaps
  }
}
