import { useTranslation } from 'react-i18next'

import type { Tag } from '@/construction/model/tags'
import { isCustomTag } from '@/construction/model/tags'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

export function useTagLabel(tag: Tag | null | undefined): string {
  const { t } = useTranslation()

  if (!tag) return ''
  if (isCustomTag(tag)) {
    return useTranslatableString(tag.label)
  }

  return t($ => $.tags[tag.id], { ns: 'construction' })
}
