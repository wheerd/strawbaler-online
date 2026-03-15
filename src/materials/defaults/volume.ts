import type { MaterialId, VolumeMaterial } from '@/materials/types'

export const concrete: VolumeMaterial = {
  id: 'material_concrete' as MaterialId,
  name: 'Concrete',
  nameKey: 'concrete',
  type: 'volume',
  color: '#97989d',
  availableVolumes: [],
  density: 2400,
  thermalConductivity: 1.7,
  vaporDiffusionResistance: 80,
  specificHeatCapacity: 1000,
  primaryEnergy: 0.8,
  embodiedCarbon: 0.12
}

export const clayPlasterBase: VolumeMaterial = {
  id: 'material_clay_plaster_base' as MaterialId,
  name: 'Clay plaster (base)',
  nameKey: 'clayPlasterBase',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605],
  color: '#927d61',
  density: 1670,
  thermalConductivity: 0.8,
  vaporDiffusionResistance: 10,
  specificHeatCapacity: 1000,
  primaryEnergy: 0.6,
  embodiedCarbon: 0.05
}

export const clayPlasterFine: VolumeMaterial = {
  id: 'material_clay_plaster_fine' as MaterialId,
  name: 'Clay plaster (fine)',
  nameKey: 'clayPlasterFine',
  type: 'volume',
  availableVolumes: [598802395.21, 299401197.605],
  color: '#927d61',
  density: 1670,
  thermalConductivity: 0.8,
  vaporDiffusionResistance: 10,
  specificHeatCapacity: 1000,
  primaryEnergy: 0.6,
  embodiedCarbon: 0.05
}

export const limePlasterBase: VolumeMaterial = {
  id: 'material_lime_plaster_base' as MaterialId,
  name: 'Lime plaster (base)',
  nameKey: 'limePlasterBase',
  type: 'volume',
  availableVolumes: [19800000],
  color: '#e5dbd3',
  density: 1262,
  thermalConductivity: 0.8,
  vaporDiffusionResistance: 15,
  specificHeatCapacity: 1000,
  primaryEnergy: 1.2,
  embodiedCarbon: 0.18
}

export const limePlasterFine: VolumeMaterial = {
  id: 'material_lime_plaster_fine' as MaterialId,
  name: 'Lime plaster (fine)',
  nameKey: 'limePlasterFine',
  type: 'volume',
  availableVolumes: [19800000],
  color: '#e5dbd3',
  density: 1262,
  thermalConductivity: 0.8,
  vaporDiffusionResistance: 15,
  specificHeatCapacity: 1000,
  primaryEnergy: 1.2,
  embodiedCarbon: 0.18
}

export const cementScreed: VolumeMaterial = {
  id: 'material_cement_screed' as MaterialId,
  name: 'Cement screed',
  nameKey: 'cementScreed',
  type: 'volume',
  availableVolumes: [],
  color: '#767773',
  density: 2000,
  thermalConductivity: 1.4,
  vaporDiffusionResistance: 30,
  specificHeatCapacity: 1000,
  primaryEnergy: 1.1,
  embodiedCarbon: 0.12
}

export const impactSoundInsulation: VolumeMaterial = {
  id: 'material_impact_sound_insulation' as MaterialId,
  name: 'Impact sound insulation',
  nameKey: 'impactSoundInsulation',
  type: 'volume',
  availableVolumes: [],
  color: '#CCCC33',
  density: 40,
  thermalConductivity: 0.035,
  vaporDiffusionResistance: 5,
  specificHeatCapacity: 1450,
  primaryEnergy: 80,
  embodiedCarbon: 2.5
}
