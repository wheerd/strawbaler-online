import type { MaterialId, PrefabMaterial } from '@/materials/types'

const prefabPhysics = {
  density: 150,
  thermalConductivity: 0.0645,
  primaryEnergy: 236 / 150,
  embodiedCarbon: 42.75 / 150,
  acidificationPotential: 0.107 / 150
}

export const ecococonStandard: PrefabMaterial = {
  id: 'material_ecococon_standard' as MaterialId,
  type: 'prefab',
  color: '#BBBBBB',
  name: 'Ecococon Standard',
  nameKey: 'ecococon-standard',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850,
  isFlipped: false,
  ...prefabPhysics
}

export const ecococonBraced: PrefabMaterial = {
  id: 'material_ecococon_braced' as MaterialId,
  type: 'prefab',
  color: '#888888',
  name: 'Ecococon Braced',
  nameKey: 'ecococon-braced',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 500,
  maxWidth: 850,
  isFlipped: false,
  ...prefabPhysics
}

export const ecococonColumn: PrefabMaterial = {
  id: 'material_ecococon_column' as MaterialId,
  type: 'prefab',
  color: '#BBFFBB',
  name: 'Ecococon Column',
  nameKey: 'ecococon-column',
  minHeight: 400,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 424,
  maxWidth: 850,
  isFlipped: false,
  ...prefabPhysics
}

export const ecococonInclined: PrefabMaterial = {
  id: 'material_ecococon_inclined' as MaterialId,
  type: 'prefab',
  color: '#FFFFBB',
  name: 'Ecococon Inclined',
  nameKey: 'ecococon-inclined',
  minHeight: 200,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850,
  sloped: {
    minAngleDegrees: 1,
    maxAngleDegrees: 50
  },
  isFlipped: false,
  ...prefabPhysics
}

export const ecococonInclinedBraced: PrefabMaterial = {
  id: 'material_ecococon_inclined_braced' as MaterialId,
  type: 'prefab',
  color: '#FFFF88',
  name: 'Ecococon Inclined Braced',
  nameKey: 'ecococon-inclined-braced',
  minHeight: 200,
  maxHeight: 3000,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 850,
  sloped: {
    minAngleDegrees: 1,
    maxAngleDegrees: 50
  },
  isFlipped: false,
  ...prefabPhysics
}

export const ecococonLintel: PrefabMaterial = {
  id: 'material_ecococon_lintel' as MaterialId,
  type: 'prefab',
  color: '#BBFFFF',
  name: 'Ecococon Lintel',
  nameKey: 'ecococon-lintel',
  minHeight: 424,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 3000,
  isFlipped: true,
  ...prefabPhysics
}

export const ecococonSill: PrefabMaterial = {
  id: 'material_ecococon_sill' as MaterialId,
  type: 'prefab',
  color: '#BBBBFF',
  name: 'Ecococon Sill',
  nameKey: 'ecococon-sill',
  minHeight: 424,
  maxHeight: 850,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 600,
  maxWidth: 3000,
  isFlipped: true,
  ...prefabPhysics
}

export const ecococonBox: PrefabMaterial = {
  id: 'material_ecococon_box' as MaterialId,
  type: 'prefab',
  color: '#FF8888',
  name: 'Ecococon Box Element',
  nameKey: 'ecococon-box',
  minHeight: 100,
  maxHeight: 600,
  minThickness: 300,
  maxThickness: 400,
  minWidth: 400,
  maxWidth: 9000,
  isFlipped: true,
  ...prefabPhysics
}
