import { createConstructionElement } from '@/construction/model/elements'
import type { RawMeasurement } from '@/construction/model/measurements'
import { type ConstructionResult, yieldElement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import type { Tag } from '@/construction/model/tags'
import type { MaterialId } from '@/materials/types'
import type { InitialPartInfo } from '@/parts/types'
import {
  type Area,
  type Length,
  type Line2D,
  type Plane3D,
  type Polygon2D,
  type PolygonWithHoles2D,
  type Transform,
  type Vec2,
  calculatePolygonWithHolesArea,
  composeTransform,
  dotVec2,
  fromTrans,
  intersectPolygon,
  lineIntersection,
  newVec2,
  normVec2,
  perpendicular,
  point2DTo3D,
  projectVec2,
  scaleAddVec2,
  subVec2,
  vec2To3
} from '@/shared/geometry'

const EXTENT_EPSILON = 1e-2

export class PolygonWithBoundingRect {
  readonly polygon: PolygonWithHoles2D
  readonly dir: Vec2
  readonly perpDir: Vec2
  readonly dirExtent: Length
  readonly perpExtent: Length
  readonly minPoint: Vec2

  constructor(
    polygon: PolygonWithHoles2D,
    dir: Vec2,
    dirExtent: Length,
    perpDir: Vec2,
    perExtent: Length,
    minPoint: Vec2
  ) {
    this.polygon = polygon
    this.dir = dir
    this.perpDir = perpDir
    this.dirExtent = dirExtent
    this.perpExtent = perExtent
    this.minPoint = minPoint
  }

  public static fromPolygon(polygon: PolygonWithHoles2D, direction: Vec2): PolygonWithBoundingRect {
    const dir = normVec2(direction)
    const perpDir = perpendicular(dir)

    const perpDots = polygon.outer.points.map(p => dotVec2(p, perpDir))
    const perpMinPoint = polygon.outer.points[perpDots.indexOf(Math.min(...perpDots))]
    const perpExtent = Math.max(...perpDots) - Math.min(...perpDots)

    const dirDots = polygon.outer.points.map(p => dotVec2(p, dir))
    const dirMinPoint = polygon.outer.points[dirDots.indexOf(Math.min(...dirDots))]
    const dirExtent = Math.max(...dirDots) - Math.min(...dirDots)

    const dirLine: Line2D = { point: perpMinPoint, direction: dir }
    const perpLine: Line2D = { point: dirMinPoint, direction: perpDir }

    const intersection = lineIntersection(dirLine, perpLine)

    if (!intersection) {
      throw new Error('Could not determine intersection due to parallel lines.')
    }

    return new PolygonWithBoundingRect(polygon, dir, dirExtent, perpDir, perpExtent, intersection)
  }

  public *tiled(dirStep: Length, perpStep: Length): Generator<PolygonWithBoundingRect> {
    for (let offsetDir = 0; offsetDir < this.dirExtent; offsetDir += dirStep) {
      const clippedLengthDir = Math.min(dirStep, this.dirExtent - offsetDir)
      const base = scaleAddVec2(this.minPoint, this.dir, offsetDir)
      for (let offsetPerp = 0; offsetPerp < this.perpExtent; offsetPerp += perpStep) {
        const clippedLengthPerp = Math.min(perpStep, this.perpExtent - offsetPerp)
        const p1 = scaleAddVec2(base, this.perpDir, offsetPerp)
        const p2 = scaleAddVec2(p1, this.perpDir, clippedLengthPerp)
        const p3 = scaleAddVec2(p2, this.dir, clippedLengthDir)
        const p4 = scaleAddVec2(p1, this.dir, clippedLengthDir)

        const rectPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
        for (const clippedRect of intersectPolygon(this.polygon, { outer: rectPolygon, holes: [] })) {
          yield PolygonWithBoundingRect.fromPolygon(clippedRect, this.dir)
        }
      }
    }
  }

  private *fixedOffsets(
    start: number,
    end: number,
    spacing: number,
    minSpacing: number,
    thickness: number
  ): Generator<number> {
    if (end - start < spacing) {
      yield end
      return
    }
    const offsetEnd = end - thickness - minSpacing
    let offset = start + spacing
    for (; offset < offsetEnd; offset += spacing + thickness) {
      yield offset
    }
    if (offset < end) {
      yield offsetEnd
    }
    yield end
  }

  private *equalOffsets(start: number, end: number, maxSpacing: number, thickness: number): Generator<number> {
    const span = end - start - maxSpacing
    if (span <= 0) {
      yield end
      return
    }
    const offsetCount = Math.ceil(span / (maxSpacing + thickness))
    const adjustedSpacing = (end - start - offsetCount * thickness) / (offsetCount + 1)
    const offsetStart = start + adjustedSpacing
    for (let i = 0; i < offsetCount; i++) {
      yield offsetStart + i * (adjustedSpacing + thickness)
    }
    yield end
  }

  public perpProjectionOffsets(points: Vec2[], eps = 1e-6) {
    const rawOffsets = points.map(p => projectVec2(this.minPoint, p, this.perpDir))
    const sorted = rawOffsets.filter(o => o >= 0 && o <= this.perpExtent).sort((a, b) => a - b)
    const results: number[] = []
    let lastOffset = -1
    for (const offset of sorted) {
      if (offset - lastOffset > eps) {
        results.push(offset)
        lastOffset = offset
      }
    }
    return results
  }

  public *stripes({
    thickness,
    spacing,
    equalSpacing = false,
    minSpacing = 0,
    stripeAtMin = true,
    stripeAtMax = true,
    minimumArea = 0,
    requiredStripeMidpoints,
    gapCallback
  }: StripesConfig): Generator<PolygonWithBoundingRect> {
    let midpoints = this.perpProjectionOffsets(requiredStripeMidpoints ?? [])
    const halfThickness = thickness / 2
    if (stripeAtMin) {
      const start = thickness + halfThickness
      midpoints = [halfThickness, ...midpoints.filter(p => p > start)]
    }
    if (stripeAtMax) {
      const end = this.perpExtent - thickness - halfThickness
      midpoints = [...midpoints.filter(p => p < end), this.perpExtent - halfThickness]
    }

    for (let i = 0; i <= midpoints.length; i++) {
      const start = i === 0 ? 0 : midpoints[i - 1] + halfThickness
      let end = i === midpoints.length ? this.perpExtent : midpoints[i] - halfThickness

      if (end - start < 1) {
        if (i > 0) continue
        else {
          end = start
        }
      }

      const offsets = equalSpacing
        ? this.equalOffsets(start, end, spacing, thickness)
        : this.fixedOffsets(start, end, spacing, minSpacing, thickness)

      let lastEnd = start
      for (const offset of offsets) {
        const p1 = scaleAddVec2(this.minPoint, this.perpDir, offset)
        const p2 = scaleAddVec2(p1, this.perpDir, thickness)
        const p3 = scaleAddVec2(p2, this.dir, this.dirExtent)
        const p4 = scaleAddVec2(p1, this.dir, this.dirExtent)

        const stripePolygon: Polygon2D = { points: [p1, p2, p3, p4] }

        for (const clippedStripe of intersectPolygon(this.polygon, { outer: stripePolygon, holes: [] })) {
          if (calculatePolygonWithHolesArea(clippedStripe) > minimumArea) {
            yield PolygonWithBoundingRect.fromPolygon(clippedStripe, this.dir)

            if (gapCallback && lastEnd < offset) {
              const pGap1 = scaleAddVec2(this.minPoint, this.perpDir, lastEnd)
              const pGap2 = scaleAddVec2(pGap1, this.dir, this.dirExtent)
              const gapPolygon: Polygon2D = { points: [p1, pGap1, pGap2, p4] }
              for (const clippedGap of intersectPolygon(this.polygon, { outer: gapPolygon, holes: [] })) {
                gapCallback(
                  new PolygonWithBoundingRect(
                    clippedGap,
                    this.dir,
                    this.dirExtent,
                    this.perpDir,
                    offset - lastEnd,
                    pGap1
                  )
                )
              }
            }

            lastEnd = offset + thickness
          }
        }
      }

      if (gapCallback && lastEnd < end) {
        const p1 = scaleAddVec2(this.minPoint, this.perpDir, lastEnd)
        const p2 = scaleAddVec2(this.minPoint, this.perpDir, end)
        const p3 = scaleAddVec2(p2, this.dir, this.dirExtent)
        const p4 = scaleAddVec2(p1, this.dir, this.dirExtent)
        const gapPolygon: Polygon2D = { points: [p1, p2, p3, p4] }
        for (const clippedGap of intersectPolygon(this.polygon, { outer: gapPolygon, holes: [] })) {
          gapCallback(
            new PolygonWithBoundingRect(clippedGap, this.dir, this.dirExtent, this.perpDir, end - lastEnd, p1)
          )
        }
      }
    }
  }

  public *stripesAndGaps(config: Omit<StripesConfig, 'gapCallback'>): Generator<StripeOrGap> {
    const gaps: PolygonWithBoundingRect[] = []

    for (const stripe of this.stripes({ ...config, gapCallback: g => gaps.push(g) })) {
      yield { type: 'stripe', polygon: stripe }
    }

    for (const gap of gaps) {
      yield { type: 'gap', polygon: gap }
    }
  }

  public dirMeasurement(
    plane: Plane3D,
    thickness?: Length,
    tags?: Tag[],
    offset?: Length,
    useMin = true
  ): RawMeasurement | null {
    if (this.dirExtent <= 0) return null

    const maxInPerp = scaleAddVec2(this.minPoint, this.perpDir, this.perpExtent)
    const start2D = useMin ? this.minPoint : maxInPerp
    const end2D = scaleAddVec2(start2D, this.dir, this.dirExtent)
    const extent2D = useMin ? maxInPerp : this.minPoint

    const startPoint = point2DTo3D(start2D, plane, 0)
    const endPoint = point2DTo3D(end2D, plane, 0)
    const extend1 = point2DTo3D(extent2D, plane, 0)
    const extend2 = thickness != null ? point2DTo3D(start2D, plane, thickness) : undefined
    return {
      startPoint,
      endPoint,
      extend1,
      extend2,
      length: offset != null ? this.dirExtent : undefined,
      label: undefined,
      tags,
      offset
    }
  }

  public perpMeasurement(
    plane: Plane3D,
    thickness?: Length,
    tags?: Tag[],
    offset?: Length,
    useMin = true
  ): RawMeasurement | null {
    if (this.perpExtent <= 0) return null

    const maxInDir = scaleAddVec2(this.minPoint, this.dir, this.dirExtent)
    const start2D = useMin ? this.minPoint : maxInDir
    const end2D = scaleAddVec2(start2D, this.perpDir, this.perpExtent)
    const extent2D = useMin ? maxInDir : this.minPoint

    const startPoint = point2DTo3D(start2D, plane, 0)
    const endPoint = point2DTo3D(end2D, plane, 0)
    const extend1 = point2DTo3D(extent2D, plane, 0)
    const extend2 = thickness != null ? point2DTo3D(start2D, plane, thickness) : undefined
    return {
      startPoint,
      endPoint,
      extend1,
      extend2,
      length: offset != null ? this.perpExtent : undefined,
      label: undefined,
      tags,
      offset
    }
  }

  public *extrude(
    materialId: MaterialId,
    thickness: Length,
    plane: Plane3D,
    transform?: Transform,
    tags?: Tag[],
    partInfo?: InitialPartInfo
  ): Generator<ConstructionResult> {
    if (this.isEmpty) {
      return
    }
    const normalizePoint = (v: Vec2) => subVec2(v, this.minPoint)
    const normalizedPolygon: PolygonWithHoles2D = {
      outer: { points: this.polygon.outer.points.map(normalizePoint) },
      holes: this.polygon.holes.map(h => ({ points: h.points.map(normalizePoint) }))
    }
    const translation = fromTrans(vec2To3(this.minPoint))
    const normalizedTransform = transform ? composeTransform(transform, translation) : translation
    yield* yieldElement(
      createConstructionElement(
        materialId,
        createExtrudedPolygon(normalizedPolygon, plane, thickness),
        normalizedTransform,
        tags,
        partInfo
      )
    )
  }

  public expandedInDir(extent: Length): PolygonWithBoundingRect {
    const halfExtent = extent / 2
    const center = scaleAddVec2(this.minPoint, this.dir, this.dirExtent / 2)
    const offsetPoint = (p: Vec2) => {
      const deltaToCenter = subVec2(p, center)
      const sign = Math.sign(dotVec2(deltaToCenter, this.dir))
      return scaleAddVec2(p, this.dir, sign * halfExtent)
    }

    const polygon: PolygonWithHoles2D = {
      outer: { points: this.polygon.outer.points.map(offsetPoint) },
      holes: this.polygon.holes.map(h => ({
        points: h.points.map(offsetPoint)
      }))
    }
    return new PolygonWithBoundingRect(
      polygon,
      this.dir,
      this.dirExtent + extent,
      this.perpDir,
      this.perpExtent,
      offsetPoint(this.minPoint)
    )
  }

  *subArea(startOffset: Length, endOffset: Length): Generator<PolygonWithBoundingRect> {
    const extent = endOffset - startOffset
    const p1 = scaleAddVec2(this.minPoint, this.dir, startOffset)
    const p2 = scaleAddVec2(p1, this.perpDir, this.perpExtent)
    const p3 = scaleAddVec2(p2, this.dir, extent)
    const p4 = scaleAddVec2(p1, this.dir, extent)

    const rectPolygon: Polygon2D = { points: [p1, p2, p3, p4] }

    for (const part of intersectPolygon(this.polygon, { outer: rectPolygon, holes: [] })) {
      yield PolygonWithBoundingRect.fromPolygon(part, this.dir)
    }
  }

  get size2D() {
    return newVec2(this.dirExtent, this.perpExtent)
  }

  public size3D(plane: Plane3D, thickness: Length) {
    return point2DTo3D(this.size2D, plane, thickness)
  }

  get rectArea() {
    return this.dirExtent * this.perpExtent
  }

  get area() {
    return calculatePolygonWithHolesArea(this.polygon)
  }

  get center() {
    return scaleAddVec2(scaleAddVec2(this.minPoint, this.dir, this.dirExtent / 2), this.perpDir, this.perpExtent / 2)
  }

  get isEmpty() {
    return this.dirExtent <= EXTENT_EPSILON || this.perpExtent <= EXTENT_EPSILON || this.polygon.outer.points.length < 3
  }
}

export interface StripesConfig {
  thickness: Length
  spacing: Length
  equalSpacing?: boolean
  minSpacing?: Length
  stripeAtMin?: boolean
  stripeAtMax?: boolean
  minimumArea?: Area
  requiredStripeMidpoints?: Vec2[]
  gapCallback?: (gap: PolygonWithBoundingRect) => void
}

export interface StripeOrGap {
  type: 'gap' | 'stripe'
  polygon: PolygonWithBoundingRect
}
