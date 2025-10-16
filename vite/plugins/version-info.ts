import type { PluginOption } from 'vite'

import { formatVersion, getGitVersionInfo } from '../utils/git-version'

export function versionInfoPlugin(): PluginOption {
  return {
    name: 'version-info',
    config: () => {
      const gitInfo = getGitVersionInfo()
      const formattedVersion = formatVersion(gitInfo)
      const buildTime = new Date().toISOString()

      console.log(`Building version: ${formattedVersion}`)

      return {
        define: {
          __APP_VERSION__: JSON.stringify(formattedVersion),
          __APP_COMMIT__: JSON.stringify(gitInfo.commit),
          __APP_COMMIT_FULL__: JSON.stringify(gitInfo.commitsFull),
          __APP_BUILD_TIME__: JSON.stringify(buildTime),
          __APP_BRANCH__: JSON.stringify(gitInfo.branch),
          __GIT_TAG__: JSON.stringify(gitInfo.tag),
          __GIT_COMMITS_SINCE_TAG__: JSON.stringify(gitInfo.commitsSinceTag)
        }
      }
    }
  }
}
