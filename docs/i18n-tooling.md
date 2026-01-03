# i18n Tooling Guide

This document describes the internationalization (i18n) tooling and developer workflows for Strawbaler.

## Table of Contents

- [Overview](#overview)
- [npm Scripts Reference](#npm-scripts-reference)
- [Developer Workflows](#developer-workflows)
- [Tools & Configuration](#tools--configuration)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

## Overview

Strawbaler uses a **JSON-based translation system** with TypeScript type generation for full type safety. The system is built on:

- **[i18next](https://www.i18next.com/)** - Core i18n framework
- **[react-i18next](https://react.i18next.com/)** - React bindings
- **[i18next-cli](https://github.com/i18next/i18next-cli)** - Extract translation keys from source code
- **[i18next-resources-for-ts](https://github.com/LFDM/i18next-resources-for-ts)** - Generate TypeScript types from JSON locale files

### Key Features

✅ **Type-safe translations** - Full TypeScript support with autocomplete  
✅ **Automatic key extraction** - Scan source code to find translation keys  
✅ **Locale-aware formatting** - Numbers, dates, and measurements respect user locale  
✅ **Dead key removal** - Automatically remove unused translation keys  
✅ **Pattern preservation** - Keep dynamic keys that can't be detected statically

## npm Scripts Reference

### Main Workflow Scripts

#### `pnpm i18n:update`

**Recommended workflow command** - Extracts translation keys from source code and regenerates TypeScript types.

```bash
pnpm i18n:update
```

**When to use:**

- After adding new translation keys in your code (using `t('key')`)
- After removing translation key usage
- Before committing i18n changes

**What it does:**

1. Runs `i18n:extract` - Scans source code for `t()` calls
2. Runs `i18n:interface` - Generates TypeScript types from updated JSON files

---

#### `pnpm i18n:extract`

Extracts translation keys from source code and updates locale JSON files.

```bash
pnpm i18n:extract
```

**What it does:**

- Scans all `.ts` and `.tsx` files in `src/` (excluding tests and type files)
- Finds calls to `t()`, `*.t()`, and `i18next.t()`
- Adds new keys to locale JSON files (with English as source language)
- Removes unused keys (unless matched by `preservePatterns`)
- Preserves keys matching patterns in `i18next.config.ts`

**Configuration:** `i18next.config.ts`

---

### Type Generation Scripts

#### `pnpm i18n:interface`

Generates TypeScript interface definition from locale files.

```bash
pnpm i18n:interface
```

**Output:** `src/@types/resources.d.ts` (1500+ lines of auto-generated types)

**When to use:**

- After manually editing locale JSON files
- After adding new locales
- After running `i18n:extract`

**What it generates:**

```typescript
interface Resources {
  common: {
    actions: {
      cancel: 'Cancel'
    }
    // ... full type tree
  }
}
```

---

#### `pnpm i18n:toc`

Generates table of contents (index) for resources.

```bash
pnpm i18n:toc
```

**Output:** `src/@types/resources.ts`

**Usage:** Less commonly used - mainly for debugging or alternative import patterns.

---

#### `pnpm i18n:merge`

Merges all locale files into a single JSON file.

```bash
pnpm i18n:merge
```

**Output:** `src/@types/resources.json`

**Usage:** Debugging, translation tools, or documentation generation.

---

## Developer Workflows

### Adding a New Translation Key

**1. Use the translation key in your component:**

```tsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('common') // namespace

  return <button>{t('actions.save')}</button>
}
```

**2. Run the extraction and type generation:**

```bash
pnpm i18n:update
```

**3. Add translations to all locale files:**

Edit the generated keys in:

- `src/shared/i18n/locales/en/common.json`
- `src/shared/i18n/locales/de/common.json`

```json
{
  "actions": {
    "save": "Save" // English
  }
}
```

```json
{
  "actions": {
    "save": "Speichern" // German
  }
}
```

**4. Types are auto-updated** - TypeScript will now autocomplete `t('actions.save')`

---

### Using Formatters in Translations

Strawbaler provides custom formatters for measurements and numbers:

**Available formatters:**

- `length` - Smart unit selection (mm, cm, m)
- `lengthInMeters` - Always display in meters with 3 decimals
- `area` - Area in m²
- `volume` - Volume in m³
- `weight` - Weight in kg or tonnes
- `dimensions2D` - Cross-section dimensions (e.g., "50mm × 100mm")

**Example usage in locale files:**

```json
{
  "measurements": {
    "wallHeight": "Wall height: {{height, length}}",
    "area": "Area: {{area, area}}",
    "crossSection": "Cross section: {{dimensions, dimensions2D}}"
  }
}
```

**In code:**

```tsx
const { t } = useTranslation('common')

// Pass values with formatter name
t('measurements.wallHeight', { height: 2500 }) // "Wall height: 2.5m"
t('measurements.area', { area: 1500000 }) // "Area: 1.50m²"
t('measurements.crossSection', {
  dimensions: [50, 100]
}) // "Cross section: 0.050m × 0.100m"
```

---

### Adding a New Namespace

Namespaces organize translations by feature area (e.g., `common`, `toolbar`, `inspector`).

**1. Create locale files:**

```bash
# Create for all supported languages
touch src/shared/i18n/locales/en/myfeature.json
touch src/shared/i18n/locales/de/myfeature.json
```

**2. Add content:**

```json
{
  "title": "My Feature",
  "description": "Feature description"
}
```

**3. Import in `config.ts`:**

```typescript
import myfeatureDE from './locales/de/myfeature.json'
import myfeatureEN from './locales/en/myfeature.json'

const resources = {
  en: {
    // ... existing
    myfeature: myfeatureEN
  },
  de: {
    // ... existing
    myfeature: myfeatureDE
  }
}
```

**4. Add to namespace list:**

```typescript
i18n.init({
  // ...
  ns: ['common', 'welcome' /* ... */, , 'myfeature']
  // ...
})
```

**5. Regenerate types:**

```bash
pnpm i18n:interface
```

**6. Use in code:**

```tsx
const { t } = useTranslation('myfeature')
t('title') // "My Feature"
```

---

### Adding a New Language

**1. Create locale directory:**

```bash
mkdir -p src/shared/i18n/locales/fr
```

**2. Copy English files as templates:**

```bash
cp src/shared/i18n/locales/en/*.json src/shared/i18n/locales/fr/
```

**3. Translate the content in all `fr/*.json` files**

**4. Import in `config.ts`:**

```typescript
import commonFR from './locales/fr/common.json'
import welcomeFR from './locales/fr/welcome.json'

// ... import all namespaces

const resources = {
  en: {
    /* ... */
  },
  de: {
    /* ... */
  },
  fr: {
    common: commonFR,
    welcome: welcomeFR
    // ... all namespaces
  }
}
```

**5. Update `i18next.config.ts`:**

```typescript
export default defineConfig({
  locales: ['en', 'de', 'fr'] // Add new locale
  // ...
})
```

**6. Add to language switcher:**

Edit `src/shared/components/LanguageSwitcher.tsx`:

```typescript
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' } // Add this
]
```

**7. Regenerate types:**

```bash
pnpm i18n:interface
```

---

## Tools & Configuration

### i18next.config.ts

Main configuration for key extraction and locale management.

```typescript
import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'de'],
  extract: {
    input: 'src/**/*.{ts,tsx}',
    ignore: '**/*.{d,test}.{ts,tsx}',
    output: 'src/shared/i18n/locales/{{language}}/{{namespace}}.json',
    functions: ['t', '*.t', 'i18next.t'],
    preservePatterns: [
      'errors:construction.*',
      'tool:addOpening.presets.*'
      // ... patterns for dynamic keys
    ],
    removeUnusedKeys: true
  }
})
```

**Key settings:**

- **`locales`** - Supported languages
- **`input`** - Source files to scan
- **`ignore`** - Files to skip
- **`output`** - Where to write JSON files
- **`functions`** - Function names to scan for
- **`preservePatterns`** - Regex patterns for dynamic keys to preserve
- **`removeUnusedKeys`** - Auto-remove unused keys

**Preserve patterns** are crucial for dynamic keys:

```typescript
// This key is dynamically constructed
const key = `errors:construction.${errorType}`
t(key)

// Preserve pattern prevents removal:
preservePatterns: ['errors:construction.*']
```

---

### src/@types/i18next.d.ts

TypeScript module augmentation for i18next type safety:

```typescript
import 'i18next'

import Resources from './resources'

declare module 'i18next' {
  interface CustomTypeOptions {
    enableSelector: true
    defaultNS: 'common'
    resources: Resources
  }
}
```

This enables:

- ✅ Autocomplete for translation keys
- ✅ Type errors for invalid keys
- ✅ Type-safe namespace selection

---

### src/shared/i18n/config.ts

Runtime i18next configuration:

```typescript
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

i18n
  .use(LanguageDetector)      // Auto-detect user language
  .use(initReactI18next)       // React bindings
  .init({
    resources,                  // Locale JSON files
    fallbackLng: 'en',         // Default language
    defaultNS: 'common',       // Default namespace
    ns: [...],                 // All namespaces
    interpolation: {
      escapeValue: false       // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

// Register custom formatters
i18n.services.formatter?.add('length', ...)
i18n.services.formatter?.add('area', ...)
// ...
```

---

## File Structure

```
src/shared/i18n/
├── config.ts                  # i18next runtime configuration
├── formatters.ts              # Locale-aware number formatting
├── formatters.test.ts         # Formatter tests
├── useFormatters.ts           # React hook for formatters
├── numberParsing.ts           # Locale-aware number parsing
├── numberParsing.test.ts      # Parsing tests
└── locales/
    ├── en/                    # English translations
    │   ├── common.json
    │   ├── welcome.json
    │   ├── toolbar.json
    │   ├── inspector.json
    │   ├── tool.json
    │   ├── config.json
    │   ├── overlay.json
    │   ├── construction.json
    │   ├── errors.json
    │   └── viewer.json
    └── de/                    # German translations
        ├── common.json
        ├── welcome.json
        └── ... (same structure)

src/@types/
├── i18next.d.ts              # TypeScript module augmentation
├── resources.d.ts            # Generated: TypeScript interface (1500+ lines)
├── resources.ts              # Generated: Table of contents
└── resources.json            # Generated: Merged resources

i18next.config.ts             # i18next-cli configuration (root)
```

---

## Troubleshooting

### "Property 'X' does not exist" error after adding key

**Problem:** TypeScript doesn't recognize new translation key.

**Solution:**

```bash
pnpm i18n:update
```

The types in `src/@types/resources.d.ts` need to be regenerated.

---

### Key is being removed even though it's used

**Problem:** i18next-cli removes a dynamically constructed key.

**Example:**

```typescript
const errorType = 'geometryProcessing'
t(`errors:construction.error.${errorType}`)
```

**Solution:** Add preserve pattern in `i18next.config.ts`:

```typescript
preservePatterns: ['errors:construction.error.*']
```

Then run:

```bash
pnpm i18n:extract
```

---

### Formatter not working in translation

**Problem:** Custom formatter like `{{value, length}}` shows raw number.

**Possible causes:**

1. **Formatter not registered** - Check `src/shared/i18n/config.ts` has:

   ```typescript
   i18n.services.formatter?.add('length', ...)
   ```

2. **Typo in format name** - Must match exactly:

   ```json
   {"key": "{{value, length}}"} // ✅ Correct
   {"key": "{{value, lenght}}"} // ❌ Typo
   ```

3. **Wrong value type** - Formatter expects number, you passed string

---

### Locale not switching

**Problem:** Language switcher doesn't change the displayed language.

**Checks:**

1. **Locale files exist** - Verify `src/shared/i18n/locales/de/*.json`
2. **Imported in config.ts** - Check resources object includes locale
3. **Namespace registered** - Check `ns` array in `i18n.init()`
4. **Browser cache** - Clear localStorage: `localStorage.clear()`

---

### Type errors after pulling latest code

**Problem:** TypeScript errors about missing translation keys after `git pull`.

**Solution:**

```bash
pnpm i18n:interface
```

Someone else may have added keys - regenerate types locally.

---

### JSON formatting warnings from Prettier

**Problem:** `pnpm format:check` shows warnings for locale JSON files.

**This is expected** - Locale JSON files are auto-generated and may not match Prettier formatting.

**Options:**

1. **Ignore** - These warnings don't break builds
2. **Format manually** (not recommended):
   ```bash
   pnpm format
   ```
   Note: Next extraction will overwrite formatting.

---

## Best Practices

### ✅ DO

- **Use namespaces to organize translations** - Group related keys together
- **Run `pnpm i18n:update` before committing** - Ensure types are up to date
- **Use formatters for measurements** - Consistent, locale-aware formatting
- **Add preserve patterns for dynamic keys** - Prevent accidental removal
- **Keep translations in sync across locales** - Add missing keys to all languages

### ❌ DON'T

- **Don't manually edit `resources.d.ts`** - It's auto-generated
- **Don't use string concatenation for translation keys** - Makes extraction fail
- **Don't commit without running i18n:update** - Causes type errors for others
- **Don't hardcode measurements or numbers** - Use formatters
- **Don't create deep nesting** - Keep translation key paths reasonable (max 3-4 levels)

---

## Additional Resources

- **Main i18n Documentation:** `docs/i18n.md`
- **i18next Documentation:** https://www.i18next.com/
- **react-i18next Documentation:** https://react.i18next.com/
- **Formatter Implementation:** `src/shared/i18n/formatters.ts`
- **Number Parsing:** `src/shared/i18n/numberParsing.ts`

---

**Last Updated:** January 2026  
**i18next Version:** 25.7.3  
**react-i18next Version:** 16.5.0
