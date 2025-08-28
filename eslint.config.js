import neostandard from 'neostandard'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  ...neostandard({
    ts: true
  }),
  eslintConfigPrettier, // This disables all formatting-related ESLint rules
  {
    rules: {
      // Keep non-formatting rules that don't conflict with Prettier
      // Remove stylistic rules that Prettier handles
    }
  }
]
