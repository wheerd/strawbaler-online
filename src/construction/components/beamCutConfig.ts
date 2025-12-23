/**
 * Centralized configuration for beam cut diagram visualization
 */
export const BEAM_CUT_CONFIG = {
  /** Segmentation parameters for analyzing beam features */
  segmentation: {
    /** Buffer distance (mm) around features to include in segments */
    bufferDistance: 50,
    /** Minimum gap size (mm) to trigger a visual break */
    minGapSize: 500
  },

  /** Display parameters for rendering */
  display: {
    /** Visual width (px) allocated for gap indicators */
    gapWidth: 60
  },

  /** Zigzag break indicator styling */
  zigzag: {
    /** Horizontal amplitude (px) of zigzag pattern */
    width: 15,
    /** Number of peaks in the zigzag */
    peaks: 4,
    /** Extension (px) beyond beam bounds to make break visible */
    extend: 10
  }
} as const
