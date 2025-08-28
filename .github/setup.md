# GitHub Repository Setup

This guide helps you set up your GitHub repository to take full advantage of the CI/CD workflows.

## Initial Setup

1. **Create GitHub Repository**

   ```bash
   # If you haven't already, create a new repository on GitHub
   # Then connect your local repository:
   git remote add origin https://github.com/YOUR_USERNAME/strawbaler-online.git
   git branch -M main
   git push -u origin main
   ```

2. **Update README Badges**
   Replace `YOUR_USERNAME` in the README.md badges with your actual GitHub username.

3. **Enable GitHub Actions**
   GitHub Actions should be enabled by default, but verify in your repository settings.

## Workflow Permissions

For the workflows to function correctly, ensure these permissions are set:

### Repository Settings > Actions > General

- **Actions permissions**: Allow all actions and reusable workflows
- **Workflow permissions**: Read and write permissions
- **Allow GitHub Actions to create and approve pull requests**: ✅ Enabled

### Required for Dependency Updates

The dependency update workflow will create pull requests automatically. Make sure:

- Branch protection rules allow the workflow to create PRs
- Auto-merge can be enabled if desired

## Security Features

### CodeQL Analysis

The security workflow includes CodeQL analysis, which:

- Analyzes code for security vulnerabilities
- Runs automatically on pushes and PRs
- Results appear in the Security tab

### Dependency Scanning

- Weekly security audits via `pnpm audit`
- Automated dependency updates via pull requests
- Vulnerability alerts in the Security tab

## Release Workflow

To create a release:

1. **Tag a release**:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub will automatically**:
   - Run full test suite
   - Build production bundle
   - Create GitHub release with artifacts
   - Generate release notes

## Customization

### Modify Workflows

All workflows are in `.github/workflows/` and can be customized:

- **ci.yml**: Main CI pipeline
- **deploy-preview.yml**: PR preview builds
- **security.yml**: Security scanning
- **release.yml**: Release automation
- **update-dependencies.yml**: Dependency management

### Branch Protection

Consider adding branch protection rules for `main`:

1. Go to Settings > Branches
2. Add rule for `main` branch
3. Enable:
   - Require status checks to pass before merging
   - Require branches to be up to date before merging
   - Include CI workflow checks

### Secrets

No secrets are currently required, but you may want to add:

- `CODECOV_TOKEN` for code coverage reporting
- Deployment tokens for hosting services

## Monitoring

### GitHub Actions Tab

Monitor workflow runs in the Actions tab of your repository.

### Security Tab

Check for:

- Dependabot alerts
- CodeQL findings
- Security advisories

### Insights

Use repository insights to track:

- Commit activity
- Code frequency
- Dependency graph

## Troubleshooting

### Common Issues

1. **Workflow fails with permissions error**
   - Check workflow permissions in repository settings
   - Ensure GITHUB_TOKEN has sufficient permissions

2. **Lint failures**
   - Run `pnpm run lint:fix` locally
   - Commit the fixes and push

3. **Test failures**
   - Check test output in workflow logs
   - Run tests locally: `pnpm test`

4. **Build failures**
   - Check Node.js version compatibility
   - Verify all dependencies are properly installed

### Getting Help

- Check workflow logs in the Actions tab
- Review this setup guide
- Open an issue in the repository
