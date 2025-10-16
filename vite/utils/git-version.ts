import { execSync } from 'child_process'

export interface GitVersionInfo {
  version: string
  tag: string | null
  commit: string
  commitsFull: string
  commitsSinceTag: number
  branch: string
}

export function getGitVersionInfo(): GitVersionInfo {
  try {
    const describe = execSync('git describe --tags --always', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    const hasTag = describe.includes('-')

    let tag: string | null = null
    let commitsSinceTag = 0
    let commit: string

    if (hasTag) {
      const parts = describe.split('-')
      tag = parts[0]
      commitsSinceTag = parseInt(parts[1], 10)
      commit = parts[2].replace('g', '')
    } else {
      commit = describe
    }

    const commitFull = execSync('git rev-parse HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    return {
      version: describe,
      tag,
      commit,
      commitsFull: commitFull,
      commitsSinceTag,
      branch
    }
  } catch (error) {
    return {
      version: 'unknown',
      tag: null,
      commit: 'unknown',
      commitsFull: 'unknown',
      commitsSinceTag: 0,
      branch: 'unknown'
    }
  }
}

export function formatVersion(info: GitVersionInfo): string {
  if (info.tag && info.commitsSinceTag > 0) {
    return `${info.tag}+${info.commitsSinceTag}.${info.commit}`
  }
  if (info.tag) {
    return info.tag
  }
  return info.commit
}
