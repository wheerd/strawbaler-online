# Code Formatting and Linting

This project uses a combination of **neostandard** (ESLint) and **Prettier** for code formatting and linting.

## Setup

- **ESLint**: Uses `neostandard` for TypeScript linting with logical/semantic rules
- **Prettier**: Handles code formatting and style consistency
- **Integration**: `eslint-config-prettier` disables conflicting ESLint style rules

## Available Scripts

```bash
# Linting
pnpm lint          # Check for lint errors
pnpm lint:fix      # Fix lint errors automatically

# Formatting  
pnpm format        # Format all files with Prettier
pnpm format:check  # Check if files are properly formatted

# Combined
pnpm lint:format   # Format files then fix lint errors
pnpm check         # Check linting only (current workflow)
pnpm check:format  # Check formatting and lint (strict mode)
pnpm ci            # CI check: lint + test
pnpm ci:format     # CI check: format + lint + test (strict mode)
```

## Workflow

### Current Approach (Gradual Migration)
1. **During development**: Use `pnpm lint:fix` to fix lint errors
2. **Before committing**: Run `pnpm check` to ensure code is properly linted  
3. **In CI**: Use `pnpm ci` for linting and testing

### Future Approach (With Formatting)
1. **During development**: Use `pnpm lint:format` to format and fix issues
2. **Before committing**: Run `pnpm check:format` to ensure proper formatting and linting
3. **In CI**: Use `pnpm ci:format` for comprehensive checks

### Migrating to Prettier
To gradually adopt Prettier formatting:
```bash
# Format specific files/directories as you work on them
npx prettier --write "src/path/to/files/**/*.ts"

# Or format everything at once when ready
pnpm format
```

## Configuration

- **ESLint**: `eslint.config.js` - Uses neostandard + prettier integration
- **Prettier**: `.prettierrc.json` - Configured to match neostandard preferences
- **Ignore files**: `.prettierignore` - Files to skip formatting

## Key Settings

Prettier is configured to align with neostandard:
- No semicolons
- Single quotes
- 2-space indentation  
- 120 character line length
- No trailing commas
- Unix line endings