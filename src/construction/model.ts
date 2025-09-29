import { type Bounds3D, type Plane3D, type Polygon2D, mergeBounds } from '@/shared/geometry'

import { type ConstructionGroup, type GroupOrElement, createConstructionElementId } from './elements'
import { type Transform, transform, transformBounds } from './geometry'
import type { Measurement } from './measurements'
import type { ConstructionIssue } from './results'
import type { Tag } from './tags'

export interface ConstructionModel {
  elements: GroupOrElement[]
  measurements: Measurement[]
  areas: HighlightedArea[]
  errors: ConstructionIssue[]
  warnings: ConstructionIssue[]
  bounds: Bounds3D
}

export type HighlightedAreaType = 'inner-perimeter' | 'outer-perimeter' | 'corner' | 'window' | 'door' | 'passage'

export type HighlightedArea = HighlightedCuboid | HighlightedPolygon

/** Highlighted area for visual feedback (corners, critical zones, etc.) */
export interface HighlightedCuboid {
  type: 'cuboid'
  areaType: HighlightedAreaType
  label?: string
  transform: Transform
  bounds: Bounds3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}

export interface HighlightedPolygon {
  type: 'polygon'
  areaType: HighlightedAreaType
  label?: string
  polygon: Polygon2D
  plane: Plane3D
  tags?: Tag[]
  renderPosition: 'bottom' | 'top'
}

export function mergeModels(...models: ConstructionModel[]): ConstructionModel {
  return {
    elements: models.flatMap(m => m.elements),
    measurements: models.flatMap(m => m.measurements),
    areas: models.flatMap(m => m.areas),
    errors: models.flatMap(m => m.errors),
    warnings: models.flatMap(m => m.warnings),
    bounds: mergeBounds(...models.map(m => m.bounds))
  }
}

export function transformModel(model: ConstructionModel, t: Transform): ConstructionModel {
  return {
    elements: [
      {
        id: createConstructionElementId(),
        bounds: model.bounds,
        children: model.elements,
        transform: t
      } as ConstructionGroup
    ],
    measurements: model.measurements.map(m => ({
      ...m,
      startPoint: transform(m.startPoint, t),
      endPoint: transform(m.endPoint, t)
    })),
    areas: model.areas.map(a => transformArea(a, t)),
    errors: model.errors.map(e => ({ ...e, bounds: e.bounds ? transformBounds(e.bounds, t) : undefined })),
    warnings: model.warnings.map(w => ({ ...w, bounds: w.bounds ? transformBounds(w.bounds, t) : undefined })),
    bounds: transformBounds(model.bounds, t)
  }
}

function transformArea(a: HighlightedArea, t: Transform): HighlightedArea {
  if (a.type === 'cuboid') {
    return { ...a, transform: t }
  }
  return a
}
