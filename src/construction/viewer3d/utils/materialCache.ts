import * as THREE from 'three'

import { DepthPeelingMaterial } from '@/construction/viewer3d/shaders/DepthPeelingMaterial'

type IdleCallback = (deadline?: { didTimeout: boolean; timeRemaining(): number }) => void

export type RenderMode = 'opaque' | 'transparent' | 'depth-peeling'

interface MeshMaterialOptions {
  color: string
  opacity: number
  depthWrite: boolean
  renderMode?: RenderMode
}

interface LineMaterialOptions {
  color: string
  opacity: number
  linewidth: number
}

const meshMaterialCache = new Map<string, THREE.MeshStandardMaterial>()
const depthPeelingMaterialCache = new Map<string, DepthPeelingMaterial>()
const lineMaterialCache = new Map<string, THREE.LineBasicMaterial>()
let activeMaterialConsumers = 0
let scheduledClearHandle: number | null = null
let scheduledClearType: 'idle' | 'timeout' | null = null

function meshMaterialKey({ color, opacity, depthWrite, renderMode }: MeshMaterialOptions): string {
  return `${color}|${opacity}|${depthWrite ? 1 : 0}|${renderMode ?? 'opaque'}`
}

function lineMaterialKey({ color, opacity, linewidth }: LineMaterialOptions): string {
  return `${color}|${opacity}|${linewidth}`
}

function createMeshMaterial(options: MeshMaterialOptions): THREE.MeshStandardMaterial {
  const isTransparent = options.opacity < 1.0
  return new THREE.MeshStandardMaterial({
    color: options.color,
    opacity: options.opacity,
    transparent: isTransparent,
    depthWrite: options.depthWrite && !isTransparent,
    side: THREE.DoubleSide
  })
}

function createLineMaterial(options: LineMaterialOptions): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: options.color,
    opacity: options.opacity,
    transparent: true,
    linewidth: options.linewidth
  })
}

export function getMeshMaterial(
  color: string,
  opacity: number,
  renderMode: RenderMode = 'opaque'
): THREE.MeshStandardMaterial {
  const depthWrite = opacity === 1

  // Simplified - use standard materials for all (depth peeling disabled for now)
  const key = meshMaterialKey({ color, opacity, depthWrite, renderMode })
  const cached = meshMaterialCache.get(key)
  if (cached) return cached

  const material = createMeshMaterial({ color, opacity, depthWrite, renderMode })
  meshMaterialCache.set(key, material)
  return material
}

export function getLineMaterial(color: string, opacity: number, linewidth = 1): THREE.LineBasicMaterial {
  const key = lineMaterialKey({ color, opacity, linewidth })
  const cached = lineMaterialCache.get(key)
  if (cached) return cached

  const material = createLineMaterial({ color, opacity, linewidth })
  lineMaterialCache.set(key, material)
  return material
}

function clearMaterialCache(): void {
  meshMaterialCache.forEach(material => {
    material.dispose()
  })
  meshMaterialCache.clear()

  depthPeelingMaterialCache.forEach(material => {
    material.dispose()
  })
  depthPeelingMaterialCache.clear()

  lineMaterialCache.forEach(material => {
    material.dispose()
  })
  lineMaterialCache.clear()
}

export function acquireMaterialCache(): void {
  cancelScheduledMaterialCacheClear()
  activeMaterialConsumers += 1
}

export function releaseMaterialCache(): void {
  if (activeMaterialConsumers === 0) {
    return
  }

  activeMaterialConsumers -= 1
  if (activeMaterialConsumers === 0) {
    scheduleMaterialCacheClear()
  }
}

function scheduleMaterialCacheClear(): void {
  if (scheduledClearHandle !== null) {
    return
  }

  const run: IdleCallback = () => {
    scheduledClearHandle = null
    scheduledClearType = null
    clearMaterialCache()
  }

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    scheduledClearType = 'idle'
    scheduledClearHandle = window.requestIdleCallback(run)
    return
  }

  if (typeof globalThis !== 'undefined') {
    const maybeRequestIdle = (globalThis as { requestIdleCallback?: (cb: IdleCallback) => number }).requestIdleCallback
    if (typeof maybeRequestIdle === 'function') {
      scheduledClearType = 'idle'
      scheduledClearHandle = maybeRequestIdle(run)
      return
    }
  }

  scheduledClearType = 'timeout'
  scheduledClearHandle = Number(setTimeout(run, 0))
}

function cancelScheduledMaterialCacheClear(): void {
  if (scheduledClearHandle === null) {
    return
  }

  if (scheduledClearType === 'idle') {
    if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(scheduledClearHandle)
    } else if (typeof globalThis !== 'undefined') {
      const maybeCancel = (globalThis as { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback
      if (typeof maybeCancel === 'function') {
        maybeCancel(scheduledClearHandle)
      }
    }
  } else if (scheduledClearType === 'timeout') {
    clearTimeout(scheduledClearHandle)
  }

  scheduledClearHandle = null
  scheduledClearType = null
}
