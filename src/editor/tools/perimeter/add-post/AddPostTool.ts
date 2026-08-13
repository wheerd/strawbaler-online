import type { IntermediateWallWithGeometry, PerimeterWallWithGeometry, WallPostType } from '@/building/model'
import {
  type EntityType,
  type PerimeterCornerId,
  type WallId,
  type SelectableId,
  isIntermediateWallId,
  isPerimeterWallId
} from '@/building/model/ids'
import { getModelActions } from '@/building/store'
import { findEditorEntityAt } from '@/editor/canvas/services/editorHitTesting'
import { getSelectionActions } from '@/editor/canvas/state/selectionStore'
import { getViewModeActions } from '@/editor/canvas/state/viewModeStore'
import { BaseTool } from '@/editor/tools/system/BaseTool'
import type { CursorStyle, EditorEvent, ToolImplementation } from '@/editor/tools/system/types'
import { roughWood, woodwool } from '@/materials/defaults'
import { type MaterialId } from '@/materials/types'
import { type Length, type Vec2, newVec2, projectVec2 } from '@/shared/geometry'

import { AddPostToolInspector } from './AddPostToolInspector'
import { AddPostToolOverlay } from './AddPostToolOverlay'

interface WallHit {
  wallId: WallId
  wall: PerimeterWallWithGeometry | IntermediateWallWithGeometry
}

interface AddPostToolState {
  // Tool configuration
  type: WallPostType
  width: Length // Default: 60mm
  thickness: Length // Default: 360mm
  replacesPosts: boolean
  material: MaterialId // Default: wood
  infillMaterial: MaterialId // Default: woodwool

  // Interactive state
  hoveredWall?: WallHit
  offset?: Length
  previewPosition?: Vec2
  canPlace: boolean
  snapDirection?: 'left' | 'right' // Direction the post was snapped from user's preferred position
}

// Default post configuration
const DEFAULT_POST_CONFIG = {
  type: 'center' as WallPostType,
  width: 60, // 6cm
  thickness: 360, // 36cm
  replacesPosts: true,
  material: roughWood.id,
  infillMaterial: woodwool.id
}

export class AddPostTool extends BaseTool implements ToolImplementation {
  readonly id = 'perimeter.add-post'
  readonly overlayComponent = AddPostToolOverlay
  readonly inspectorComponent = AddPostToolInspector

  public state: AddPostToolState = {
    type: DEFAULT_POST_CONFIG.type,
    width: DEFAULT_POST_CONFIG.width,
    thickness: DEFAULT_POST_CONFIG.thickness,
    replacesPosts: DEFAULT_POST_CONFIG.replacesPosts,
    material: DEFAULT_POST_CONFIG.material,
    infillMaterial: DEFAULT_POST_CONFIG.infillMaterial,
    canPlace: false
  }

  /**
   * Extract wall information from hit test result
   */
  private extractWallFromHitResult(
    hitResult: { entityId: SelectableId; entityType: EntityType; parentIds: SelectableId[] } | null
  ): WallHit | null {
    if (!hitResult) return null

    const { getPerimeterWallById, getIntermediateWallById, getPerimeterCornerById } = getModelActions()

    let wall: PerimeterWallWithGeometry | IntermediateWallWithGeometry | null = null
    let wallId: WallId | null = null

    // Check if we hit a wall directly
    if (hitResult.entityType === 'perimeter-wall' || hitResult.entityType === 'intermediate-wall') {
      wallId = hitResult.entityId as WallId
      wall = isIntermediateWallId(wallId) ? getIntermediateWallById(wallId) : getPerimeterWallById(wallId)
    }

    // Check if we hit an opening or post
    if (hitResult.entityType === 'opening' || hitResult.entityType === 'wall-post') {
      const [, wId] = hitResult.parentIds

      if (isPerimeterWallId(wId) || isIntermediateWallId(wId)) {
        wallId = wId
        wall = isIntermediateWallId(wallId) ? getIntermediateWallById(wallId) : getPerimeterWallById(wallId)
      }
    }

    // Check if we hit a corner - extract the constructing wall
    if (hitResult.entityType === 'perimeter-corner') {
      const cornerId = hitResult.entityId as PerimeterCornerId
      const corner = getPerimeterCornerById(cornerId)
      wallId = corner.constructedByWall === 'previous' ? corner.previousWallId : corner.nextWallId
      wall = getPerimeterWallById(wallId)
    }

    if (!wall || !wallId) {
      return null
    }

    return {
      wallId,
      wall
    }
  }

  /**
   * Calculate center offset from pointer position projected onto wall
   */
  private calculateCenterOffsetFromPointerPosition(
    pointerPos: Vec2,
    wall: PerimeterWallWithGeometry | IntermediateWallWithGeometry
  ): Length {
    const start = 'centerLine' in wall ? wall.centerLine.start : wall.insideLine.start
    const centerOffset = projectVec2(start, pointerPos, wall.direction)
    return Math.round(centerOffset / 10) * 10 // Round center offset to 10mm increments
  }

  /**
   * Convert offset to actual position on the wall
   */
  private offsetToPosition(offset: Length, wall: PerimeterWallWithGeometry | IntermediateWallWithGeometry): Vec2 {
    const startPoint = 'centerLine' in wall ? wall.centerLine.start : wall.insideLine.start
    const direction = wall.direction

    return newVec2(startPoint[0] + direction[0] * offset, startPoint[1] + direction[1] * offset)
  }

  /**
   * Clear preview state
   */
  private clearPreview(): void {
    this.state.hoveredWall = undefined
    this.state.previewPosition = undefined
    this.state.offset = undefined
    this.state.canPlace = false
    this.state.snapDirection = undefined
    this.triggerRender()
  }

  /**
   * Update preview state
   */
  private updatePreview(
    offset: Length,
    wallHit: WallHit,
    canPlace = true,
    snapDirection?: 'left' | 'right'
  ): void {
    this.state.hoveredWall = wallHit
    this.state.offset = offset
    this.state.previewPosition = this.offsetToPosition(offset, wallHit.wall)
    this.state.canPlace = canPlace
    this.state.snapDirection = snapDirection
    this.triggerRender()
  }

  // Event Handlers

  handlePointerMove(event: EditorEvent): boolean {
    const pointerPos = event.worldCoordinates

    // 1. Detect wall under cursor
    const hitResult = findEditorEntityAt(event.originalEvent)
    const wallHit = this.extractWallFromHitResult(hitResult)

    if (!wallHit) {
      this.clearPreview()
      return true
    }

    // 2. Calculate preferred center position from pointer
    const preferredStartOffset = this.calculateCenterOffsetFromPointerPosition(pointerPos, wallHit.wall)

    // 3. Check if preferred position is valid and snap if needed
    const snappedOffset = getModelActions().findNearestValidWallPostPosition(
      wallHit.wallId,
      preferredStartOffset,
      this.state.width
    )

    const maxSnapDistance = Math.max(this.state.width, 200)
    if (snappedOffset !== null && Math.abs(snappedOffset - preferredStartOffset) <= maxSnapDistance) {
      // Determine snap direction
      const snapDirection: 'left' | 'right' | undefined =
        snappedOffset !== preferredStartOffset ? (snappedOffset > preferredStartOffset ? 'right' : 'left') : undefined
      this.updatePreview(snappedOffset, wallHit, true, snapDirection)
    } else {
      // Check if center is within valid bounds
      const halfWidth = this.state.width / 2
      if (preferredStartOffset < halfWidth || preferredStartOffset > wallHit.wall.wallLength - halfWidth) {
        this.clearPreview()
      } else {
        this.updatePreview(preferredStartOffset, wallHit, snappedOffset === preferredStartOffset)
      }
    }

    return true
  }

  handlePointerDown(_event: EditorEvent): boolean {
    if (!this.state.canPlace || !this.state.hoveredWall || this.state.offset === undefined) {
      return true
    }

    const { wallId } = this.state.hoveredWall

    try {
      const post = getModelActions().addWallPost(wallId, {
        postType: this.state.type,
        centerOffsetFromWallStart: this.state.offset,
        width: this.state.width,
        thickness: this.state.thickness,
        replacesPosts: this.state.replacesPosts,
        material: this.state.material,
        infillMaterial: this.state.infillMaterial
      })

      const { clearSelection, pushSelection } = getSelectionActions()

      // Select the newly created post
      clearSelection()
      pushSelection(post.perimeterId)
      pushSelection(post.wallId)
      pushSelection(post.id)

      // Clear preview after successful placement
      this.clearPreview()
    } catch (error) {
      console.error('Failed to add post:', error)
    }

    return true
  }

  // Lifecycle Methods

  onActivate(): void {
    getViewModeActions().ensureMode('walls')
    // Reset state when tool is activated
    this.clearPreview()
  }

  onDeactivate(): void {
    // Clear preview when tool is deactivated
    this.clearPreview()
  }

  // Public Methods for Inspector

  setPostType(type: WallPostType): void {
    this.state.type = type
    this.triggerRender()
  }

  setWidth(width: Length): void {
    this.state.width = width
    this.triggerRender()
  }

  setThickness(thickness: Length): void {
    this.state.thickness = thickness
    this.triggerRender()
  }

  setReplacesPosts(replacesPosts: boolean): void {
    this.state.replacesPosts = replacesPosts
    this.triggerRender()
  }

  setMaterial(material: MaterialId): void {
    this.state.material = material
    this.triggerRender()
  }

  setInfillMaterial(infillMaterial: MaterialId): void {
    this.state.infillMaterial = infillMaterial
    this.triggerRender()
  }

  public getCursor(): CursorStyle {
    return this.state.canPlace ? 'default' : 'not-allowed'
  }
}
