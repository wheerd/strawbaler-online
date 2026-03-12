import { PolygonWithBoundingRect } from '@/construction/assemblies/utils/PolygonWithBoundingRect'
import {
  detectBeamEdges,
  infiniteBeamPolygon,
  partitionByAlignedEdges,
  polygonFromLineIntersections,
  simplePolygonFrame
} from '@/construction/assemblies/utils/helpers'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { createConstructionElement, createConstructionElementId } from '@/construction/model/elements'
import { type ConstructionModel } from '@/construction/model/model'
import { type ConstructionResult, aggregateResults, yieldMeasurement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import {
  TAG_FLOOR_INFILL,
  TAG_FLOOR_OPENING_FRAME,
  TAG_FLOOR_WALL_BEAM,
  TAG_JOIST,
  TAG_JOIST_FLOOR,
  TAG_JOIST_LENGTH,
  TAG_JOIST_SPACING,
  TAG_STRAW_INFILL,
  TAG_SUBFLOOR
} from '@/construction/model/tags'
import { getMaterialById } from '@/materials/store'
import {
  Bounds2D,
  type PolygonWithHoles2D,
  type Vec2,
  direction,
  dotAbsVec2,
  dotVec2,
  ensurePolygonIsClockwise,
  fromTrans,
  intersectPolygon,
  midpoint,
  minimumAreaBoundingBox,
  newVec3,
  offsetLine,
  offsetPolygon,
  perpendicularCW,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { JoistFloorConfig } from './types'

const EPSILON = 1e-5

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (context: PerimeterConstructionContext): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamCheckPoints: Vec2[] = []
    const wallBeamPolygons: PolygonWithHoles2D[] = []
    const lineCount = context.innerLines.length
    for (let i = 0; i < lineCount; i++) {
      const insideLine = context.innerLines[i]
      if (1 - dotAbsVec2(insideLine.direction, joistDirection) > EPSILON) continue
      const outsideLine = context.outerLines[i]
      const prevClip = context.outerLines[(i - 1 + lineCount) % lineCount]
      const nextClip = context.outerLines[(i + 1) % lineCount]

      const insideBeam = infiniteBeamPolygon(
        insideLine,
        prevClip,
        nextClip,
        this.config.wallBeamInsideOffset,
        this.config.wallBeamThickness - this.config.wallBeamInsideOffset
      )

      if (insideBeam) {
        const clippedBeam = subtractPolygons([insideBeam], context.floorOpenings)
        wallBeamPolygons.push(...clippedBeam)
        const leftDir = perpendicularCW(insideLine.direction)
        const leftPoints = insideBeam.points.filter(p => dotVec2(direction(insideLine.point, p), leftDir) > 0)
        wallBeamCheckPoints.push(midpoint(leftPoints[0], leftPoints[1]))
      }

      const outsideBeam = infiniteBeamPolygon(outsideLine, prevClip, nextClip, this.config.wallBeamThickness, 0)

      if (outsideBeam) {
        const clippedBeam = subtractPolygons([outsideBeam], context.floorOpenings)
        wallBeamPolygons.push(...clippedBeam)
      }
    }

    const joistArea = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - dotAbsVec2(l.direction, joistDirection) < EPSILON ? l : context.outerLines[i]
      )
    )
    const holeClip = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - dotAbsVec2(l.direction, joistDirection) < EPSILON
          ? offsetLine(l, this.config.wallBeamInsideOffset)
          : context.outerLines[i]
      )
    )
    const partitions = Array.from(partitionByAlignedEdges(joistArea, joistDirection))

    const expandedHoles = context.floorOpenings.map(h => offsetPolygon(h, this.config.openingSideThickness))

    const joistAndGapPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamCheckPoints)

      return subtractPolygons([p], expandedHoles).flatMap(clippedP => {
        const rect = PolygonWithBoundingRect.fromPolygon(clippedP, joistDirection)
        return Array.from(
          rect.stripesAndGaps({
            thickness: this.config.joistThickness,
            spacing: this.config.joistSpacing,
            stripeAtMin: !leftHasBeam,
            stripeAtMax: !rightHasBeam,
            minimumArea: 3000
          })
        )
      })
    })

    const joistPolygons: PolygonWithBoundingRect[] = []
    const gapPolygons: PolygonWithBoundingRect[] = []

    for (const item of joistAndGapPolygons) {
      if (item.type === 'stripe') {
        joistPolygons.push(item.polygon)
      } else {
        gapPolygons.push(item.polygon)
      }
    }

    const clippedHoles = expandedHoles
      .map(ensurePolygonIsClockwise)
      .flatMap(p => intersectPolygon({ outer: p, holes: [] }, { outer: joistArea, holes: [] }))
      .map(p => p.outer)

    const infillPolygons = subtractPolygons(
      [context.outerPolygon],
      [
        context.innerPolygon,
        ...joistPolygons.map(p => p.polygon.outer),
        ...wallBeamPolygons.map(p => p.outer),
        ...clippedHoles
      ]
    )

    const wallBeams = wallBeamPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            this.config.wallBeamMaterial,
            createExtrudedPolygon(p, 'xy', this.config.constructionHeight),
            undefined,
            [TAG_FLOOR_WALL_BEAM],
            { type: 'wall-beam' }
          )
        }) satisfies ConstructionResult
    )
    const joists = joistPolygons.flatMap(p =>
      Array.from(
        p.extrude(this.config.joistMaterial, this.config.constructionHeight, 'xy', undefined, [TAG_JOIST], {
          type: 'joist',
          requiresSinglePiece: true
        })
      )
    )
    const infillMaterial = getMaterialById(this.config.wallInfillMaterial)
    const wallInfill = infillPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            this.config.wallInfillMaterial,
            createExtrudedPolygon(p, 'xy', this.config.constructionHeight),
            undefined,
            [TAG_FLOOR_INFILL, infillMaterial?.type === 'strawbale' ? TAG_STRAW_INFILL : null].filter(t => t != null)
          )
        }) satisfies ConstructionResult
    )
    const openingFrames = context.floorOpenings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          this.config.openingSideThickness,
          this.config.constructionHeight,
          this.config.openingSideMaterial,
          holeClip,
          { type: 'floor-opening-frame' },
          [TAG_FLOOR_OPENING_FRAME],
          false
        )
      )
    )

    const joistLengthMeasurements = joistPolygons
      .map(p => p.dirMeasurement('xy', this.config.constructionHeight, [TAG_JOIST_LENGTH]))
      .filter(m => m != null)
      .map(yieldMeasurement)

    const joistSpacingMeasurements = gapPolygons
      .map(p => p.perpMeasurement('xy', this.config.constructionHeight, [TAG_JOIST_SPACING]))
      .filter(m => m != null)
      .map(yieldMeasurement)

    const measurements = [...joistLengthMeasurements, ...joistSpacingMeasurements]

    const subfloorPolygons = subtractPolygons([context.innerPolygon], context.floorOpenings)
    const subfloor = subfloorPolygons.map(
      p =>
        ({
          type: 'element',
          element: createConstructionElement(
            this.config.subfloorMaterial,
            createExtrudedPolygon(p, 'xy', this.config.subfloorThickness),
            fromTrans(newVec3(0, 0, this.config.constructionHeight)),
            [TAG_SUBFLOOR],
            { type: 'subfloor' }
          )
        }) satisfies ConstructionResult
    )

    const results = [...wallBeams, ...joists, ...wallInfill, ...openingFrames, ...subfloor, ...measurements]
    const aggregatedResults = aggregateResults(results)

    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, this.config.constructionHeight)
    return {
      elements: [
        {
          id: createConstructionElementId(),
          bounds,
          transform: fromTrans(newVec3(0, 0, -this.config.constructionHeight)),
          children: aggregatedResults.elements
        }
      ],
      areas: aggregatedResults.areas,
      bounds,
      errors: aggregatedResults.errors,
      measurements: aggregatedResults.measurements,
      warnings: aggregatedResults.warnings
    }
  }

  get topOffset() {
    return this.config.subfloorThickness
  }

  bottomOffset = 0
  get constructionThickness() {
    return this.config.constructionHeight
  }

  protected tag = TAG_JOIST_FLOOR
}
