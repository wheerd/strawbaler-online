# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Strawbaler Online project.

## Workflows

### 🔧 CI (`ci.yml`)

**Triggers:** Push to main/develop, Pull Requests

**Jobs:**

- **Test & Build**: Runs tests and builds on Node.js 18.x and 20.x
- **Lint**: Checks code style and formatting (allows failures for now)
- **Quality Check**: Bundle size analysis and code quality checks

### 🚀 Deploy Preview (`deploy-preview.yml`)

**Triggers:** Pull Requests to main branch

**Purpose:** Creates preview builds for pull requests and comments with build status.

### 🔒 Security (`security.yml`)

**Triggers:** Weekly schedule, Push to main, Pull Requests

**Jobs:**

- **Security Audit**: Runs `pnpm audit` for vulnerability scanning
- **CodeQL Analysis**: GitHub's semantic code analysis for security issues

### 📦 Release (`release.yml`)

**Triggers:** Git tags starting with 'v' (e.g., v1.0.0)

**Purpose:** Creates GitHub releases with production build artifacts.

### 🔄 Update Dependencies (`update-dependencies.yml`)

**Triggers:** Weekly schedule (Sundays), Manual trigger

**Purpose:** Automatically updates dependencies and creates PRs for review.

## Usage

### Running Locally

```bash
# Install dependencies
pnpm install

# Run tests
pnpm run test

# Run linter
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Build project
pnpm run build
```

### Creating a Release

1. Create and push a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. The release workflow will automatically create a GitHub release with build artifacts.

### Manual Dependency Update

Go to the Actions tab and manually trigger the "Update Dependencies" workflow.

## Status Badges

Add these to your main README.md:

```markdown
[![CI](https://github.com/YOUR_USERNAME/strawbaler-online/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/strawbaler-online/actions/workflows/ci.yml)
[![Security](https://github.com/YOUR_USERNAME/strawbaler-online/workflows/Security%20&%20Dependencies/badge.svg)](https://github.com/YOUR_USERNAME/strawbaler-online/actions/workflows/security.yml)
```
