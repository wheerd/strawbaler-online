export interface VersionInfo {
  version: string
  commit: string
  commitFull: string
  buildTime: string
  branch: string
  tag: string | null
  commitsSinceTag: number
}

export const VERSION_INFO: VersionInfo = {
  version: __APP_VERSION__,
  commit: __APP_COMMIT__,
  commitFull: __APP_COMMIT_FULL__,
  buildTime: __APP_BUILD_TIME__,
  branch: __APP_BRANCH__,
  tag: __GIT_TAG__,
  commitsSinceTag: __GIT_COMMITS_SINCE_TAG__
} as const

export function getVersionString(): string {
  return VERSION_INFO.version
}

export function getVersionDetails(): string {
  return [
    `Version: ${VERSION_INFO.version}`,
    `Commit: ${VERSION_INFO.commit} (${VERSION_INFO.commitFull})`,
    `Branch: ${VERSION_INFO.branch}`,
    `Built: ${new Date(VERSION_INFO.buildTime).toLocaleString()}`
  ].join('\n')
}
