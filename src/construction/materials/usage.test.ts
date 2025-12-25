import { describe, expect, it } from 'vitest'

import { createRingBeamAssemblyId, createWallAssemblyId } from '@/building/model/ids'
import type { RingBeamAssemblyConfig, WallAssemblyConfig } from '@/construction/config/types'

import { createMaterialId, roughWood, strawbale, woodwool } from './material'
import { getMaterialUsage } from './usage'

const defaultStrawMaterialId = strawbale.id

describe('Material Usage Detection', () => {
  describe('getMaterialUsage', () => {
    it('detects material not in use', () => {
      const usage = getMaterialUsage(roughWood.id, [], [], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(false)
      expect(usage.usedByConfigs).toEqual([])
    })

    it('detects default straw material usage', () => {
      const usage = getMaterialUsage(defaultStrawMaterialId, [], [], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Default Straw Material'])
    })

    it('detects ring beam material usage', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: roughWood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const usage = getMaterialUsage(roughWood.id, [ringBeamAssembly], [], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Ring Beam: Test Ring Beam (beam)'])
    })

    it('detects wall assembly post materials', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 900,
        desiredPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'double',
          width: 60,
          thickness: 120,
          material: roughWood.id,
          infillMaterial: strawbale.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(roughWood.id, [], [wallAssembly], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Wall: Test Infill (posts)'])
    })

    it('detects strawhenge module usage', () => {
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Strawhenge',
        type: 'strawhenge',
        module: {
          minWidth: 920,
          maxWidth: 920,
          type: 'single',
          frameThickness: 60,
          frameMaterial: roughWood.id,
          strawMaterial: strawbale.id
        },
        infill: {
          maxPostSpacing: 900,
          desiredPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: roughWood.id
          }
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(roughWood.id, [], [wallAssembly], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toEqual(['Wall: Test Strawhenge (module frame, infill posts)'])
    })

    it('detects spacer and infill materials in double modules', () => {
      const spacerMaterialId = createMaterialId()
      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Double Module Wall',
        type: 'strawhenge',
        module: {
          minWidth: 920,
          maxWidth: 920,
          type: 'double',
          frameThickness: 60,
          frameWidth: 120,
          frameMaterial: roughWood.id,
          strawMaterial: strawbale.id,
          spacerSize: 120,
          spacerCount: 3,
          spacerMaterial: spacerMaterialId,
          infillMaterial: woodwool.id
        },
        infill: {
          maxPostSpacing: 900,
          desiredPostSpacing: 800,
          minStrawSpace: 70,
          posts: {
            type: 'full',
            width: 60,
            material: roughWood.id
          }
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const spacerUsage = getMaterialUsage(spacerMaterialId, [], [wallAssembly], [], defaultStrawMaterialId)
      expect(spacerUsage.isUsed).toBe(true)
      expect(spacerUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module spacers)'])

      const infillUsage = getMaterialUsage(woodwool.id, [], [wallAssembly], [], defaultStrawMaterialId)
      expect(infillUsage.isUsed).toBe(true)
      expect(infillUsage.usedByConfigs).toEqual(['Wall: Double Module Wall (module infill)'])
    })

    it('detects materials used across multiple configs', () => {
      const ringBeamAssembly: RingBeamAssemblyConfig = {
        id: createRingBeamAssemblyId(),
        name: 'Test Ring Beam',
        type: 'full',
        material: roughWood.id,
        height: 60,
        width: 360,
        offsetFromEdge: 30
      }

      const wallAssembly: WallAssemblyConfig = {
        id: createWallAssemblyId(),
        name: 'Test Infill',
        type: 'infill',
        maxPostSpacing: 900,
        desiredPostSpacing: 800,
        minStrawSpace: 70,
        posts: {
          type: 'full',
          width: 60,
          material: roughWood.id
        },
        layers: {
          insideThickness: 30,
          insideLayers: [],
          outsideThickness: 50,
          outsideLayers: []
        }
      }

      const usage = getMaterialUsage(roughWood.id, [ringBeamAssembly], [wallAssembly], [], defaultStrawMaterialId)

      expect(usage.isUsed).toBe(true)
      expect(usage.usedByConfigs).toHaveLength(2)
      expect(usage.usedByConfigs).toContain('Ring Beam: Test Ring Beam (beam)')
      expect(usage.usedByConfigs).toContain('Wall: Test Infill (posts)')
    })
  })
})
