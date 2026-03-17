import { useMemo } from 'react'

import type { AssemblyPhysicsStructure } from '@/construction/assemblies/physics'
import { resolveRoofAssembly } from '@/construction/assemblies/roofs'
import type { RoofConfig } from '@/construction/assemblies/roofs/types'
import { resolveWallAssembly } from '@/construction/assemblies/walls'
import type { WallConfig } from '@/construction/assemblies/walls/types'

export function useWallAssemblyPhysics(config: WallConfig | null): AssemblyPhysicsStructure | null {
  return useMemo(() => {
    if (!config) return null
    const assembly = resolveWallAssembly(config)
    return assembly.getPhysicsStructure()
  }, [config])
}

export function useRoofAssemblyPhysics(config: RoofConfig | null): AssemblyPhysicsStructure | null {
  return useMemo(() => {
    if (!config) return null
    const assembly = resolveRoofAssembly(config)
    return assembly.getPhysicsStructure()
  }, [config])
}

export function getWallAssemblyPhysics(config: WallConfig): AssemblyPhysicsStructure {
  const assembly = resolveWallAssembly(config)
  return assembly.getPhysicsStructure()
}

export function getRoofAssemblyPhysics(config: RoofConfig): AssemblyPhysicsStructure {
  const assembly = resolveRoofAssembly(config)
  return assembly.getPhysicsStructure()
}
