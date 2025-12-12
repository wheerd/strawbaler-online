import { FilledFloorAssembly } from './filled'
import { JoistFloorAssembly } from './joists'
import { MonolithicFloorAssembly } from './monolithic'
import type { FloorAssembly, FloorAssemblyType } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FLOOR_ASSEMBLIES: Record<FloorAssemblyType, FloorAssembly<any>> = {
  monolithic: new MonolithicFloorAssembly(),
  joist: new JoistFloorAssembly(),
  filled: new FilledFloorAssembly()
}

export * from './types'
export * from './monolithic'
export * from './joists'
export * from './filled'
export * from './layers'
