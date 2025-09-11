import type { PerimeterWall } from '@/model'
import type { Length, Vec3 } from '@/types/geometry'
import { constructPost, type PostConfig } from './posts'
import type {
  BaseConstructionConfig,
  ConstructionElement,
  ConstructionIssue,
  PerimeterWallConstructionMethod,
  WallConstructionPlan,
  WithIssues
} from './base'
import type { ResolveMaterialFunction } from './material'
import { constructStraw } from './straw'

export interface InfillConstructionConfig extends BaseConstructionConfig {
  maxPostSpacing: Length // Default: 800mm
  minStrawSpace: Length // Default: 70mm
  posts: PostConfig // Default: full
}

export function infillWallArea(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  startsWithStand: boolean = false,
  endsWithStand: boolean = false,
  startAtEnd: boolean = false
): WithIssues<ConstructionElement[]> {
  const { minStrawSpace } = config
  const { width: postWidth } = config.posts
  let error: string | null = null
  let warning: string | null = null
  const errors: ConstructionIssue[] = []
  const warnings: ConstructionIssue[] = []
  if (size[2] < minStrawSpace) {
    warning = 'Not enough vertical space to fill with straw'
  }

  if (startsWithStand || endsWithStand) {
    if (size[0] < postWidth) {
      error = 'Not enough space for a post'
    } else if (size[0] === postWidth) {
      return constructPost(position[0] as Length, size[1] as Length, size[2] as Length, config.posts, resolveMaterial)
    } else if (startsWithStand && endsWithStand && size[0] < 2 * postWidth) {
      error = 'Space for more than one post, but not enough for two'
    }
  }

  const parts: ConstructionElement[] = []

  let left = position[0]
  let width = size[0]

  if (startsWithStand) {
    const {
      it: startPost,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost(position[0] as Length, size[1] as Length, size[2] as Length, config.posts, resolveMaterial)
    parts.push(...startPost)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
    left += postWidth
    width -= postWidth
  }

  if (endsWithStand) {
    const {
      it: endPost,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost(
      (position[0] + size[0] - postWidth) as Length,
      size[1] as Length,
      size[2] as Length,
      config.posts,
      resolveMaterial
    )
    parts.push(...endPost)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
    width -= postWidth
  }

  const inbetweenPosition: Vec3 = [left, position[1], position[2]]
  const inbetweenSize: Vec3 = [width, size[1], size[2]]

  constructInfillRecursive(
    inbetweenPosition,
    inbetweenSize,
    config,
    resolveMaterial,
    parts,
    warnings,
    errors,
    !startAtEnd
  )

  if (warning) {
    warnings.push({ description: warning, elements: parts.map(p => p.id) })
  }

  if (error) {
    errors.push({ description: error, elements: parts.map(p => p.id) })
  }

  return { it: parts, errors, warnings }
}

function constructInfillRecursive(
  position: Vec3,
  size: Vec3,
  config: InfillConstructionConfig,
  resolveMaterial: ResolveMaterialFunction,
  elements: ConstructionElement[],
  warnings: ConstructionIssue[],
  errors: ConstructionIssue[],
  atStart: boolean
): void {
  const baleWidth = getBaleWidth(size[0] as Length, config)

  const strawPosition: Vec3 = [atStart ? position[0] : position[0] + size[0] - baleWidth, position[1], position[2]]
  const strawSize: Vec3 = [baleWidth, size[1], size[2]]

  const {
    it: strawElements,
    errors: strawErrors,
    warnings: strawWarnings
  } = constructStraw(strawPosition, strawSize, config.straw)
  elements.push(...strawElements)
  errors.push(...strawErrors)
  warnings.push(...strawWarnings)

  if (baleWidth < config.minStrawSpace) {
    warnings.push({ description: 'Not enough space for infilling straw', elements: strawElements.map(s => s.id) })
  }

  let postOffset: Length
  if (baleWidth + config.posts.width <= size[0]) {
    postOffset = atStart
      ? ((strawPosition[0] + strawSize[0]) as Length)
      : ((strawPosition[0] - config.posts.width) as Length)
    const {
      it: post,
      errors: postErrors,
      warnings: postWarnings
    } = constructPost(postOffset, size[1] as Length, size[2] as Length, config.posts, resolveMaterial)
    elements.push(...post)
    errors.push(...postErrors)
    warnings.push(...postWarnings)
  } else {
    return
  }

  const remainingPosition = [atStart ? postOffset + config.posts.width : position[0], position[1], position[2]]
  const remainingSize = [size[0] - strawSize[0] - config.posts.width, size[1], size[2]]

  constructInfillRecursive(
    remainingPosition,
    remainingSize,
    config,
    resolveMaterial,
    elements,
    warnings,
    errors,
    !atStart
  )
}

function getBaleWidth(availableWidth: Length, config: InfillConstructionConfig): Length {
  const segmentSize = config.maxPostSpacing + config.posts.width
  if (availableWidth < config.maxPostSpacing) {
    return availableWidth
  } else if (availableWidth < segmentSize + config.minStrawSpace && availableWidth > segmentSize) {
    return (availableWidth - config.minStrawSpace - config.posts.width) as Length
  } else if (availableWidth < segmentSize) {
    return (availableWidth - config.posts.width) as Length
  } else {
    return config.maxPostSpacing
  }
}

export const constructInfillWall: PerimeterWallConstructionMethod<InfillConstructionConfig> = (
  _wall: PerimeterWall,
  _floorHeight: Length,
  _config: InfillConstructionConfig
): WallConstructionPlan => {
  throw new Error('TODO: Implementation')
}
