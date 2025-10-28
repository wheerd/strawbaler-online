import Clipper2Z, { type MainModule as ClipperModule, type PathD, type PathsD, type PointD } from 'clipper2-wasm'
import clipperWasmUrl from 'clipper2-wasm/dist/es/clipper2z.wasm?url'
import { vec2 } from 'gl-matrix'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type {} from '@/shared/geometry/basic'

let clipperModuleInstance: ClipperModule | null = null
let clipperModulePromise: Promise<ClipperModule> | null = null

export function loadClipperModule(): Promise<ClipperModule> {
  if (clipperModuleInstance) {
    return Promise.resolve(clipperModuleInstance)
  }

  let modulePromise: Promise<ClipperModule>

  if (!clipperModulePromise) {
    const isNode = typeof process !== 'undefined' && process?.release?.name === 'node'

    clipperModulePromise = (async () => {
      const locateFile = (file: string): string => {
        if (!file.endsWith('.wasm')) {
          return file
        }

        if (!isNode) {
          return clipperWasmUrl
        }

        const resolvedPath = resolveClipperWasmPath(clipperWasmUrl)
        return pathToFileURL(resolvedPath).toString()
      }

      let wasmBinary: Uint8Array | undefined
      if (isNode) {
        const resolvedPath = resolveClipperWasmPath(clipperWasmUrl)
        const { promises: fsPromises } = await import('node:fs')
        const file = await fsPromises.readFile(resolvedPath)
        wasmBinary = file instanceof Uint8Array ? file : new Uint8Array(file)
      }

      const instance = await Clipper2Z({
        locateFile,
        wasmBinary
      })

      clipperModuleInstance = instance
      return instance
    })()

    modulePromise = clipperModulePromise
  } else {
    modulePromise = clipperModulePromise
  }

  return modulePromise
}

export async function ensureClipperModule(): Promise<void> {
  await loadClipperModule()
}

export function getClipperModule(): ClipperModule {
  if (clipperModuleInstance) {
    return clipperModuleInstance
  }
  throw new Error(
    'Clipper geometry module has not been loaded yet. Call ensureClipperModule() before accessing geometry helpers.'
  )
}

export function createPointD(point: vec2): PointD {
  return new (getClipperModule().PointD)(point[0], point[1], 0)
}

export function createPathD(points: vec2[]): PathD {
  const module = getClipperModule()
  const path = new module.PathD()
  for (const point of points) {
    path.push_back(new module.PointD(point[0], point[1], 0))
  }
  return path
}

export function createPathsD(paths: PathD[]): PathsD {
  const module = getClipperModule()
  const pathsD = new module.PathsD()
  for (const path of paths) {
    pathsD.push_back(path)
  }
  return pathsD
}

export function pathDToPoints(path: PathD): vec2[] {
  const result: vec2[] = []
  const size = path.size()
  for (let i = 0; i < size; i++) {
    const point = path.get(i)
    result.push([point.x, point.y])
  }
  return result
}

function resolveClipperWasmPath(assetUrl: string): string {
  const proc = globalThis.process as NodeJS.Process | undefined
  const isNode = typeof proc === 'object' && proc?.release?.name === 'node'

  if (!isNode) {
    return assetUrl
  }

  if (assetUrl.startsWith('http://') || assetUrl.startsWith('https://')) {
    return assetUrl
  }

  if (assetUrl.startsWith('file://')) {
    return decodeURIComponent(new URL(assetUrl).pathname)
  }

  let resolvedPath: string
  if (assetUrl.startsWith('/')) {
    resolvedPath = path.resolve(assetUrl.slice(1))
  } else {
    try {
      const resolved = new URL(assetUrl, import.meta.url)
      if (resolved.protocol === 'file:') {
        return decodeURIComponent(resolved.pathname)
      }
      resolvedPath = decodeURIComponent(resolved.pathname)
    } catch {
      resolvedPath = path.resolve(process.cwd(), assetUrl)
    }
  }

  return resolvedPath
}
