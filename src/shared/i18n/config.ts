import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import {
  formatArea,
  formatDimensions2D,
  formatLength,
  formatLengthInMeters,
  formatVolume,
  formatWeight
} from './formatters'
import resources from './locales'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr'],
    defaultNS: 'common',
    ns: [
      'common',
      'welcome',
      'toolbar',
      'inspector',
      'tool',
      'config',
      'overlay',
      'construction',
      'errors',
      'viewer',
      'privacy'
    ],

    interpolation: {
      escapeValue: false // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    // Enable debug mode in development, but disable in tests to reduce noise
    debug: import.meta.env.DEV && import.meta.env.MODE !== 'test',

    showSupportNotice: false
  })

// Register custom formatters for use in translations
// These can be used in translation strings like: {{value, length}} or {{value, area}}
i18n.services.formatter?.add('length', (value, lng, _options) => formatLength(value as number, lng ?? 'en'))

i18n.services.formatter?.add('lengthInMeters', (value, lng, _options) =>
  formatLengthInMeters(value as number, lng ?? 'en')
)

i18n.services.formatter?.add('area', (value, lng, _options) => formatArea(value as number, lng ?? 'en'))

i18n.services.formatter?.add('volume', (value, lng, _options) => formatVolume(value as number, lng ?? 'en'))

i18n.services.formatter?.add('weight', (value, lng, _options) => formatWeight(value as number, lng ?? 'en'))

i18n.services.formatter?.add('dimensions2D', (value, lng, _options) => {
  // For cross-sections like "50mm × 100mm"
  // Expects value to be array [width, height]
  const locale = lng ?? 'en'
  if (Array.isArray(value) && value.length === 2) {
    return formatDimensions2D([Number(value[0]), Number(value[1])], true, locale)
  }
  return String(value)
})

export default i18n
