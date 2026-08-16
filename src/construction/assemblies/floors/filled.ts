import { constructStrawPolygon } from '@/construction/assemblies/straw'
import { PolygonWithBoundingRect } from '@/construction/assemblies/utils/PolygonWithBoundingRect'
import {
  detectBeamEdges,
  partitionByAlignedEdges,
  polygonFromLineIntersections,
  simplePolygonFrame
} from '@/construction/assemblies/utils/helpers'
import type { PerimeterConstructionContext } from '@/construction/context/perimeter'
import { createConstructionElement, createConstructionElementId } from '@/construction/model/elements'
import type { ConstructionModel } from '@/construction/model/model'
import { aggregateResults, yieldMeasurement } from '@/construction/model/results'
import { createExtrudedPolygon } from '@/construction/model/shapes'
import {
  TAG_FILLED_FLOOR,
  TAG_FLOOR_CEILING_SHEATHING,
  TAG_FLOOR_FRAME,
  TAG_FLOOR_OPENING_FRAME,
  TAG_JOIST,
  TAG_JOIST_LENGTH,
  TAG_JOIST_SPACING,
  TAG_SUBFLOOR
} from '@/construction/model/tags'
import {
  Bounds2D,
  direction,
  dotAbsVec2,
  ensurePolygonIsClockwise,
  fromTrans,
  midpoint,
  minimumAreaBoundingBox,
  newVec3,
  offsetLine,
  offsetPolygon,
  polygonEdges,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FilledFloorConfig } from './types'

const EPSILON = 1e-5

export class FilledFloorAssembly extends BaseFloorAssembly<FilledFloorConfig> {
  protected tag = TAG_FILLED_FLOOR

  construct = (context: PerimeterConstructionContext): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamCheckPoints = [...polygonEdges(context.innerPolygon)]
      .filter(e => 1 - dotAbsVec2(direction(e.start, e.end), joistDirection) < EPSILON)
      .map(e => midpoint(e.start, e.end))

    const joistArea = polygonFromLineIntersections(
      context.innerLines.map((l, i) =>
        1 - dotAbsVec2(l.direction, joistDirection) < EPSILON
          ? offsetLine(l, -this.config.frameThickness)
          : offsetLine(context.outerLines[i], this.config.frameThickness)
      )
    )

    const frame = Array.from(
      simplePolygonFrame(
        context.outerPolygon,
        this.config.frameThickness,
        this.config.constructionHeight,
        this.config.frameMaterial,
        undefined,
        { type: 'floor-frame' },
        [TAG_FLOOR_FRAME],
        true
      )
    )

    const partitions = Array.from(partitionByAlignedEdges(joistArea, joistDirection))
    const expandedHoles = context.floorOpenings
      .map(h => offsetPolygon(h, this.config.openingFrameThickness))
      .map(ensurePolygonIsClockwise)

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

    const joists = joistPolygons.flatMap(p =>
      Array.from(
        p.extrude(this.config.joistMaterial, this.config.constructionHeight, 'xy', undefined, [TAG_JOIST], {
          type: 'joist',
          requiresSinglePiece: true
        })
      )
    )

    const infillArea = offsetPolygon(context.outerPolygon, -this.config.frameThickness)
    const infillPolygons = subtractPolygons(
      [infillArea],
      [...joistPolygons.map(p => p.polygon.outer), ...expandedHoles]
    ).map(p => PolygonWithBoundingRect.fromPolygon(p, joistDirection))
    const infill = infillPolygons.flatMap(p =>
      Array.from(constructStrawPolygon(p, 'xy', this.config.constructionHeight, this.config.strawMaterial))
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

    const openingFrames = context.floorOpenings.flatMap(h =>
      Array.from(
        simplePolygonFrame(
          h,
          this.config.openingFrameThickness,
          this.config.constructionHeight,
          this.config.openingFrameMaterial,
          joistArea,
          { type: 'floor-opening-frame' },
          [TAG_FLOOR_OPENING_FRAME],
          false
        )
      )
    )

    const totalThickness =
      this.config.ceilingSheathingThickness + this.config.constructionHeight + this.config.subfloorThickness
    const bounds2D = Bounds2D.fromPoints(context.outerPolygon.points)
    const floorPolygons = subtractPolygons([context.outerPolygon], context.floorOpenings)
    const subfloor = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, this.config.subfloorThickness),
      transform: fromTrans(newVec3(0, 0, -this.config.subfloorThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          this.config.subfloorMaterial,
          createExtrudedPolygon(p, 'xy', this.config.subfloorThickness),
          undefined,
          [TAG_SUBFLOOR],
          { type: 'subfloor' }
        )
      )
    }
    const ceilingSheathing = {
      id: createConstructionElementId(),
      bounds: bounds2D.toBounds3D('xy', 0, this.config.ceilingSheathingThickness),
      transform: fromTrans(newVec3(0, 0, -totalThickness)),
      children: floorPolygons.map(p =>
        createConstructionElement(
          this.config.ceilingSheathingMaterial,
          createExtrudedPolygon(p, 'xy', this.config.ceilingSheathingThickness),
          undefined,
          [TAG_FLOOR_CEILING_SHEATHING],
          { type: 'ceiling-sheathing' }
        )
      )
    }

    const floorResults = [...joists, ...frame, ...openingFrames, ...infill, ...measurements]
    const aggregatedResults = aggregateResults(floorResults)

    return {
      elements: [
        subfloor,
        {
          id: createConstructionElementId(),
          bounds: bounds2D.toBounds3D('xy', 0, this.config.constructionHeight),
          transform: fromTrans(newVec3(0, 0, -this.config.constructionHeight - this.config.subfloorThickness)),
          children: aggregatedResults.elements
        },
        ceilingSheathing
      ],
      areas: aggregatedResults.areas,
      bounds: bounds2D.toBounds3D('xy', 0, -totalThickness),
      errors: aggregatedResults.errors,
      measurements: aggregatedResults.measurements,
      warnings: aggregatedResults.warnings
    }
  }

  topOffset = 0
  bottomOffset = 0
  get constructionThickness() {
    return this.config.ceilingSheathingThickness + this.config.constructionHeight + this.config.subfloorThickness
  }
}
