import neostandard from 'neostandard'
import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  tseslint.configs.strict,
  ...neostandard({
    ts: true
  }),
  eslintConfigPrettier, // This disables all formatting-related ESLint rules
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['^(?!\\.\\/)((?!.)[sS])*) ?$', '../.*']
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },
  {
    // Allow any types in test files for now
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts', '**/test/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  }
)
