import type { vec2 } from 'gl-matrix'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { LineSegment2D, Polygon2D } from '../src/shared/geometry'
import { ensureClipperModule } from '../src/shared/geometry/clipperInstance'
import { type ExtractionDebugData, extractFromDxfWithDebug } from '../src/shared/services/floorplan_extract'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const ABSOLUTE_PROTOCOL = /^[a-zA-Z]+:\/\//

if (typeof globalThis.fetch === 'function') {
  const originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = async (input: any, init?: RequestInit) => {
    if (typeof input === 'string' && !ABSOLUTE_PROTOCOL.test(input)) {
      const diskPath = path.resolve(projectRoot, `.${input}`)
      const data = await fs.readFile(diskPath)
      return new Response(data)
    }
    if (input instanceof URL && input.protocol === 'file:') {
      const data = await fs.readFile(fileURLToPath(input))
      return new Response(data)
    }
    return originalFetch(input, init)
  }
}

async function readDxf(filePath: string): Promise<string | ArrayBuffer> {
  const buffer = await fs.readFile(filePath)
  const isBinary = buffer.includes(0x00)
  return isBinary
    ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    : buffer.toString('utf-8')
}

async function main(): Promise<void> {
  const [fileArg] = process.argv.slice(2)
  if (!fileArg) {
    console.error('Usage: pnpm extract:dxf <file.dxf>')
    process.exit(1)
  }

  const resolvedPath = path.resolve(process.cwd(), fileArg)

  try {
    await fs.access(resolvedPath)
  } catch {
    console.error(`File not found: ${resolvedPath}`)
    process.exit(1)
  }

  try {
    await ensureClipperModule()
    const content = await readDxf(resolvedPath)
    const { storeys, debug } = await extractFromDxfWithDebug(content, {})
    // console.log(JSON.stringify(storeys, null, 2))
    if (debug) {
      await writeDebugSvg(resolvedPath, debug)
    }
  } catch (error) {
    console.error('DXF extraction failed')
    console.error(error instanceof Error ? (error.stack ?? error.message) : error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Unexpected error while running DXF extractor')
  console.error(error instanceof Error ? (error.stack ?? error.message) : error)
  process.exit(1)
})

function formatNumber(value: number): string {
  return Number.parseFloat(value.toFixed(2)).toString()
}

function normalisePoint(
  point: vec2,
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): [number, number] {
  const x = point[0] - offsetX
  const y = height - (point[1] - offsetY)
  return [x, y]
}

function collectBounds(
  segments: LineSegment2D[],
  polygons: Polygon2D[]
): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} | null {
  const xs: number[] = []
  const ys: number[] = []

  for (const segment of segments) {
    xs.push(segment.start[0], segment.end[0])
    ys.push(segment.start[1], segment.end[1])
  }

  for (const polygon of polygons) {
    for (const point of polygon.points) {
      xs.push(point[0])
      ys.push(point[1])
    }
  }

  if (xs.length === 0 || ys.length === 0) {
    return null
  }

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

async function writeDebugSvg(dxfPath: string, debug: ExtractionDebugData): Promise<void> {
  console.error(debug.wallSegments.length)
  const wallSegments = debug.wallSegments ?? []
  const candidateBands = debug.ribbonCandidateBands ?? []
  const finalRibbon = debug.ribbonPolygons ?? []
  const hatchPolygons = debug.hatchPolygons ?? []

  const extraContours = []
  if (debug.exteriorPolygon) extraContours.push(debug.exteriorPolygon)
  if (debug.interiorPolygon) extraContours.push(debug.interiorPolygon)

  const allPolygonsForBounds = [...candidateBands, ...finalRibbon, ...hatchPolygons, ...extraContours]
  const bounds = collectBounds(wallSegments, allPolygonsForBounds)

  if (!bounds) {
    return
  }

  const margin = 200
  const width = Math.max(bounds.maxX - bounds.minX, 1) + margin * 2
  const height = Math.max(bounds.maxY - bounds.minY, 1) + margin * 2
  const offsetX = bounds.minX - margin
  const offsetY = bounds.minY - margin

  const serializePolygon = (polygon: Polygon2D): string =>
    polygon.points
      .map(point => {
        const [x, y] = normalisePoint(point, offsetX, offsetY, width, height)
        return `${formatNumber(x)},${formatNumber(y)}`
      })
      .join(' ')

  const wallsSvg = wallSegments
    .map(segment => {
      const [x1, y1] = normalisePoint(segment.start, offsetX, offsetY, width, height)
      const [x2, y2] = normalisePoint(segment.end, offsetX, offsetY, width, height)
      return `<line x1="${formatNumber(x1)}" y1="${formatNumber(y1)}" x2="${formatNumber(x2)}" y2="${formatNumber(y2)}" stroke="#4a5568" stroke-width="6" stroke-linecap="round" />`
    })
    .join('\n    ')

  const candidateSvg = candidateBands
    .map(
      polygon =>
        `<polygon points="${serializePolygon(polygon)}" fill="rgba(255,165,0,0.2)" stroke="#ff9800" stroke-width="8" stroke-linejoin="round" />`
    )
    .join('\n    ')

  const finalRibbonSvg = finalRibbon
    .map(
      polygon =>
        `<polygon points="${serializePolygon(polygon)}" fill="rgba(0,128,0,0.2)" stroke="#2f855a" stroke-width="8" stroke-linejoin="round" />`
    )
    .join('\n    ')

  const hatchSvg = hatchPolygons
    .map(
      polygon =>
        `<polygon points="${serializePolygon(polygon)}" fill="rgba(66,153,225,0.15)" stroke="#3182ce" stroke-width="4" stroke-dasharray="20 12" />`
    )
    .join('\n    ')

  const contourSvg = extraContours
    .map((polygon, index) => {
      const stroke = index === 0 ? '#1a365d' : '#6b46c1'
      const dash = index === 0 ? '' : ' stroke-dasharray="12 10"'
      return `<polygon points="${serializePolygon(polygon)}" fill="none" stroke="${stroke}" stroke-width="10"${dash} />`
    })
    .join('\n    ')

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${formatNumber(width)} ${formatNumber(height)}">
  <rect x="0" y="0" width="${formatNumber(width)}" height="${formatNumber(height)}" fill="#f7fafc" />
  <g id="hatches">
    ${hatchSvg}
  </g>
  <g id="candidates">
    ${candidateSvg}
  </g>
  <g id="walls">
    ${wallsSvg}
  </g>
</svg>
`

  const outputPath = path.join(path.dirname(dxfPath), `${path.basename(dxfPath, path.extname(dxfPath))}-debug.svg`)
  await fs.writeFile(outputPath, svgContent, 'utf-8')
  console.log(`Debug SVG exported to ${outputPath}`)
}
