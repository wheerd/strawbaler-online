import type { MaterialId, StrawbaleMaterial } from '@/materials/types'
import { MATERIAL_COLORS } from '@/shared/theme/colors'

export const strawbale: StrawbaleMaterial = {
  id: 'material_strawbale' as MaterialId,
  type: 'strawbale',
  color: MATERIAL_COLORS.strawbale,
  name: 'Strawbales',
  nameKey: 'strawbale',
  baleMinLength: 800,
  baleMaxLength: 900,
  baleHeight: 500,
  baleWidth: 360,
  tolerance: 2,
  topCutoffLimit: 50,
  flakeSize: 70,
  density: 110,
  thermalConductivity: 0.052,
  vaporDiffusionResistance: 1,
  specificHeatCapacity: 2000,
  primaryEnergy: 0.24,
  embodiedCarbon: -0.12
}
