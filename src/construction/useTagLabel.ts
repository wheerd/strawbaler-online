import { useTranslation } from 'react-i18next'

import type { Tag } from './tags'
import { isCustomTag } from './tags'

/**
 * Hook to get the display label for a tag.
 * - Predefined tags: uses translation from Resources
 * - Custom tags: uses the custom label property
 */
export function useTagLabel(tag: Tag | null | undefined): string {
  const { t } = useTranslation('construction')

  if (!tag) return ''

  // Custom tags have their own label
  if (isCustomTag(tag)) {
    return tag.label
  }

  // Predefined tags use translation keys
  return t($ => $.tags[tag.id])
}
