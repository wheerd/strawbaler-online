// Re-export geometry utilities for backward compatibility
export {
  distance,
  midpoint,
  angle,
  normalizeAngle,
  pointOnLine,
  vectorFromAngle,
  addVector,
  snapToGrid,
  expandBounds,
  pointInBounds,
  boundsFromPoints,
  isPointNearLine,
  formatLength as formatDistance,
  formatArea,
  offsetToPosition,
  lineIntersection,
  lineFromPoints,
  lineFromPointAndAngle,
  distanceToInfiniteLine,
  type Line2D
} from '@/types/geometry'
