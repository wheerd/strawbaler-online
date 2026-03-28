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
// Import translation files
import commonDE from './locales/de/common.json'
import configDE from './locales/de/config.json'
import constructionDE from './locales/de/construction.json'
import errorsDE from './locales/de/errors.json'
import inspectorDE from './locales/de/inspector.json'
import overlayDE from './locales/de/overlay.json'
import privacyDE from './locales/de/privacy.json'
import toolDE from './locales/de/tool.json'
import toolbarDE from './locales/de/toolbar.json'
import viewerDE from './locales/de/viewer.json'
import welcomeDE from './locales/de/welcome.json'
import commonEN from './locales/en/common.json'
import configEN from './locales/en/config.json'
import constructionEN from './locales/en/construction.json'
import errorsEN from './locales/en/errors.json'
import inspectorEN from './locales/en/inspector.json'
import overlayEN from './locales/en/overlay.json'
import privacyEN from './locales/en/privacy.json'
import toolEN from './locales/en/tool.json'
import toolbarEN from './locales/en/toolbar.json'
import viewerEN from './locales/en/viewer.json'
import welcomeEN from './locales/en/welcome.json'
import commonFR from './locales/fr/common.json'
import configFR from './locales/fr/config.json'
import constructionFR from './locales/fr/construction.json'
import errorsFR from './locales/fr/errors.json'
import inspectorFR from './locales/fr/inspector.json'
import overlayFR from './locales/fr/overlay.json'
import privacyFR from './locales/fr/privacy.json'
import toolFR from './locales/fr/tool.json'
import toolbarFR from './locales/fr/toolbar.json'
import viewerFR from './locales/fr/viewer.json'
import welcomeFR from './locales/fr/welcome.json'

const resources = {
  en: {
    common: commonEN,
    welcome: welcomeEN,
    toolbar: toolbarEN,
    inspector: inspectorEN,
    tool: toolEN,
    config: configEN,
    overlay: overlayEN,
    construction: constructionEN,
    errors: errorsEN,
    viewer: viewerEN,
    privacy: privacyEN
  },
  de: {
    common: commonDE,
    welcome: welcomeDE,
    toolbar: toolbarDE,
    inspector: inspectorDE,
    tool: toolDE,
    config: configDE,
    overlay: overlayDE,
    construction: constructionDE,
    errors: errorsDE,
    viewer: viewerDE,
    privacy: privacyDE
  },
  fr: {
    common: commonFR,
    welcome: welcomeFR,
    toolbar: toolbarFR,
    inspector: inspectorFR,
    tool: toolFR,
    config: configFR,
    overlay: overlayFR,
    construction: constructionFR,
    errors: errorsFR,
    viewer: viewerFR,
    privacy: privacyFR
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
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
