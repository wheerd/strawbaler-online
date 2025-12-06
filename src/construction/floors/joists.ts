import { vec2, vec3 } from 'gl-matrix'

import { createConstructionElement, createConstructionElementId } from '@/construction/elements'
import { translate } from '@/construction/geometry'
import {
  infiniteBeamPolygon,
  partitionByAlignedEdges,
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
  type Polygon2D,
  type PolygonWithHoles2D,
  ensurePolygonIsClockwise,
  intersectPolygon,
  isPointStrictlyInPolygon,
  minimumAreaBoundingBox,
  offsetPolygon,
  perpendicular,
  subtractPolygons
} from '@/shared/geometry'

import { BaseFloorAssembly } from './base'
import type { FloorConstructionContext, JoistFloorConfig } from './types'

const EPSILON = 1e-5

/**
 * Detects whether wall beams exist on the left and right sides of a partition.
 * Checks if midpoints of wall beam polygon edges are strictly inside the partition.
 */
function detectBeamEdges(
  partition: Polygon2D,
  joistDirection: vec2,
  wallBeamPolygons: PolygonWithHoles2D[]
): { leftHasBeam: boolean; rightHasBeam: boolean } {
  if (partition.points.length === 0 || wallBeamPolygons.length === 0) {
    return { leftHasBeam: false, rightHasBeam: false }
  }

  const perpDir = perpendicular(joistDirection)

  // Find left and right boundaries of partition (min/max perpendicular projections)
  const projections = partition.points.map(p => vec2.dot(p, perpDir))
  const leftProjection = Math.min(...projections)
  const rightProjection = Math.max(...projections)
  const centerProjection = (leftProjection + rightProjection) / 2

  let leftHasBeam = false
  let rightHasBeam = false

  // Check all wall beam polygon edges
  for (const beamPoly of wallBeamPolygons) {
    for (let i = 0; i < beamPoly.outer.points.length; i++) {
      const edgeStart = beamPoly.outer.points[i]
      const edgeEnd = beamPoly.outer.points[(i + 1) % beamPoly.outer.points.length]

      // Calculate midpoint of the edge
      const midpoint = vec2.scale(vec2.create(), vec2.add(vec2.create(), edgeStart, edgeEnd), 0.5)

      // Check if midpoint is strictly inside the partition
      if (isPointStrictlyInPolygon(midpoint, partition)) {
        // Determine which side based on perpendicular projection
        const projection = vec2.dot(midpoint, perpDir)

        if (projection < centerProjection) {
          leftHasBeam = true
        } else {
          rightHasBeam = true
        }
      }
    }
  }

  return { leftHasBeam, rightHasBeam }
}

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
      1 - Math.abs(vec2.dot(l.direction, joistDirection)) < EPSILON ? l : context.outerLines[i]
    )
    const newPolygon = polygonFromLineIntersections(newSides)
    const partitions = Array.from(partitionByAlignedEdges(newPolygon, joistDirection))

    const expandedHoles = context.openings.map(h => offsetPolygon(h, config.openingSideThickness))

    const joistPolygons = partitions.flatMap(p => {
      const { leftHasBeam, rightHasBeam } = detectBeamEdges(p, joistDirection, wallBeamPolygons)

      return subtractPolygons([p], expandedHoles).flatMap(p =>
        Array.from(
          stripesPolygons(
            p,
            joistDirection,
            config.joistThickness,
            config.joistSpacing,
            leftHasBeam ? config.joistSpacing : 0,
            rightHasBeam ? config.joistSpacing : 0,
            3000
          )
        )
      )
    })

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
