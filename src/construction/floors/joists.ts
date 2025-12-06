import { vec2, vec3 } from 'gl-matrix'

import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import {
  infiniteBeamPolygon,
  polygonFromLineIntersections,
  simplePolygonFrame,
  stripesPolygons
} from '@/construction/helpers'
import { type ConstructionModel } from '@/construction/model'
import { polygonPartInfo } from '@/construction/parts'
import { type ConstructionResult, aggregateResults } from '@/construction/results'
import { createExtrudedPolygon } from '@/construction/shapes'
import {
  Bounds2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  intersectPolygon,
  minimumAreaBoundingBox,
  offsetLine,
  offsetPolygon,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FloorConstructionContext, JoistFloorConfig } from './types'

const EPSILON = 1e-5

export class JoistFloorAssembly extends BaseFloorAssembly<JoistFloorConfig> {
  construct = (context: FloorConstructionContext, config: JoistFloorConfig): ConstructionModel => {
    const bbox = minimumAreaBoundingBox(context.outerPolygon)
    const joistDirection = bbox.smallestDirection

    const wallBeamPolygons: PolygonWithHoles2D[] = []
    const lineCount = context.innerLines.length
    for (let i = 0; i < lineCount; i++) {
      const insideLine = context.innerLines[i]
      if (1 - Math.abs(vec2.dot(insideLine.direction, joistDirection)) > EPSILON) continue
      const outsideLine = context.outerLines[i]
      const prevClip = context.outerLines[(i - 1 + lineCount) % lineCount]
      const nextClip = context.outerLines[(i + 1) % lineCount]

      const insideBeam = infiniteBeamPolygon(
        insideLine,
        prevClip,
        nextClip,
        config.wallBeamInsideOffset,
        config.wallBeamThickness - config.wallBeamInsideOffset
      )

      if (insideBeam) {
        const clippedBeam = subtractPolygons([insideBeam], context.openings)
        wallBeamPolygons.push(...clippedBeam)
      }

      const outsideBeam = infiniteBeamPolygon(outsideLine, prevClip, nextClip, config.wallBeamThickness, 0)

      if (outsideBeam) {
        const clippedBeam = subtractPolygons([outsideBeam], context.openings)
        wallBeamPolygons.push(...clippedBeam)
      }
    }

    const newSides = context.innerLines.map((l, i) =>
      1 - Math.abs(vec2.dot(l.direction, joistDirection)) < EPSILON
        ? offsetLine(l, config.wallBeamInsideOffset)
        : context.outerLines[i]
    )
    const newPolygon = polygonFromLineIntersections(newSides)

    const expandedHoles = context.openings.map(h => offsetPolygon(h, config.openingSideThickness))

    const innerClipPolygon: PolygonWithHoles2D = { outer: newPolygon, holes: expandedHoles }

    const joistPolygons = Array.from(
      stripesPolygons(
        innerClipPolygon,
        joistDirection,
        config.joistThickness,
        config.joistSpacing,
        config.joistSpacing,
        config.joistSpacing,
        3000
      )
    )

    const clippedHoles = expandedHoles
      .map(ensurePolygonIsClockwise)
      .flatMap(p => intersectPolygon({ outer: p, holes: [] }, { outer: newPolygon, holes: [] }))
      .map(p => p.outer)

    const infillPolygons = subtractPolygons(
      [context.outerPolygon],
      [context.innerPolygon, ...joistPolygons.map(p => p.outer), ...wallBeamPolygons.map(p => p.outer), ...clippedHoles]
    )

    const results = [
      ...wallBeamPolygons.map(
        p =>
          ({
            type: 'element',
            element: createConstructionElement(
              config.wallBeamMaterial,
              createExtrudedPolygon(p, 'xy', config.constructionHeight),
              undefined,
              undefined,
              polygonPartInfo('wall-beam', p.outer, 'xy', config.constructionHeight)
            )
          }) satisfies ConstructionResult
      ),
      ...joistPolygons.map(
        p =>
          ({
            type: 'element',
            element: createConstructionElement(
              config.joistMaterial,
              createExtrudedPolygon(p, 'xy', config.constructionHeight),
              undefined,
              undefined,
              polygonPartInfo('joist', p.outer, 'xy', config.constructionHeight)
            )
          }) satisfies ConstructionResult
      ),
      ...infillPolygons.map(
        p =>
          ({
            type: 'element',
            element: createConstructionElement(
              config.wallInfillMaterial,
              createExtrudedPolygon(p, 'xy', config.constructionHeight)
            )
          }) satisfies ConstructionResult
      ),
      ...context.openings.flatMap(h =>
        Array.from(
          simplePolygonFrame(
            h,
            config.openingSideThickness,
            config.constructionHeight,
            config.openingSideMaterial,
            newPolygon,
            'floor-opening-frame',
            undefined,
            false
          )
        )
      )
    ]

    const aggregatedResults = aggregateResults(results)

    const bounds = Bounds2D.fromPoints(context.outerPolygon.points).toBounds3D('xy', 0, config.constructionHeight)
    return {
      elements: [
        {
          id: createConstructionElementId(),
          bounds,
          transform: translate(vec3.fromValues(0, 0, -config.constructionHeight)),
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

  getTopOffset = (config: JoistFloorConfig) => config.subfloorThickness
  getBottomOffset = (_config: JoistFloorConfig) => 0
  getConstructionThickness = (config: JoistFloorConfig) => config.constructionHeight
}
