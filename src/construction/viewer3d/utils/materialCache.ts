import * as THREE from 'three'

type IdleCallback = (deadline?: { didTimeout: boolean; timeRemaining(): number }) => void

interface MeshMaterialOptions {
  color: string
  opacity: number
  depthWrite: boolean
}

interface LineMaterialOptions {
  color: string
  opacity: number
  linewidth: number
}

const meshMaterialCache = new Map<string, THREE.MeshStandardMaterial>()
const lineMaterialCache = new Map<string, THREE.LineBasicMaterial>()
let activeMaterialConsumers = 0
let scheduledClearHandle: number | null = null
let scheduledClearType: 'idle' | 'timeout' | null = null

function meshMaterialKey({ color, opacity, depthWrite }: MeshMaterialOptions): string {
  return `${color}|${opacity}|${depthWrite ? 1 : 0}`
}

function lineMaterialKey({ color, opacity, linewidth }: LineMaterialOptions): string {
  return `${color}|${opacity}|${linewidth}`
}

function createMeshMaterial(options: MeshMaterialOptions): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: options.color,
    opacity: options.opacity,
    transparent: true,
    depthWrite: options.depthWrite
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

export function getMeshMaterial(color: string, opacity: number): THREE.MeshStandardMaterial {
  const depthWrite = opacity === 1
  const key = meshMaterialKey({ color, opacity, depthWrite })
  const cached = meshMaterialCache.get(key)
  if (cached) return cached

  const material = createMeshMaterial({ color, opacity, depthWrite })
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
