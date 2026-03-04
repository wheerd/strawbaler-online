import type { Namespace } from 'i18next'
import { type UseTranslationResponse, useTranslation } from 'react-i18next'

import type { Material } from './material'

/**
 * Hook to get the display name for a material.
 * If the material has a nameKey, it will be translated.
 * Otherwise, the material's name field is used directly.
 */
export function useMaterialName(material: Material | null | undefined): string {
  const { t } = useTranslation('config')
  return getMaterialName(material, t)
}

export function getMaterialName<T extends Namespace>(
  material: Material | null | undefined,
  t: UseTranslationResponse<T, undefined>['t']
): string {
  if (!material) return ''

  const nameKey = material.nameKey
  if (nameKey != null) {
    return t($ => $.materials.defaults[nameKey], { ns: 'config' })
  }

  return material.name
}
