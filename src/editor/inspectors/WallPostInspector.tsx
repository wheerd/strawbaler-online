import * as Label from '@radix-ui/react-label'
import { Info, Trash } from 'lucide-react'
import { useCallback } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { WallPostType } from '@/building/model'
import type { WallPostId } from '@/building/model/ids'
import { useModelActions, useWallById, useWallPostById } from '@/building/store'
import { useViewportActions } from '@/editor/canvas/state/viewportStore'
import { type MaterialId } from '@/materials/types'
import { MaterialSelectWithEdit } from '@/materials/ui/MaterialSelectWithEdit'
import { Bounds2D, offsetPolygon } from '@/shared/geometry'
import { LengthField } from '@/shared/ui/LengthField'
import { Button } from '@/shared/ui/components/button'
import { Callout, CalloutIcon, CalloutText } from '@/shared/ui/components/callout'
import { Kbd } from '@/shared/ui/components/kbd'
import { Separator } from '@/shared/ui/components/separator'
import { Switch } from '@/shared/ui/components/switch'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/components/toggle-group'
import { FitToViewIcon } from '@/shared/ui/icons'

export function WallPostInspector({ postId }: { postId: WallPostId }): React.JSX.Element | null {
  const { t } = useTranslation('inspector')
  const { updateWallPost: updatePost, removeWallPost: removePost } = useModelActions()

  const post = useWallPostById(postId)
  const wall = useWallById(post.wallId)

  const viewportActions = useViewportActions()

  const handleTypeChange = useCallback(
    (newType: WallPostType | '') => {
      if (newType) {
        updatePost(postId, { postType: newType })
      }
    },
    [updatePost, postId]
  )

  const handleReplacesPostsChange = useCallback(
    (replacesPosts: boolean) => {
      updatePost(postId, { replacesPosts: !replacesPosts })
    },
    [updatePost, postId]
  )

  const handleMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId) {
        updatePost(postId, { material: materialId })
      }
    },
    [updatePost, postId]
  )

  const handleInfillMaterialChange = useCallback(
    (materialId: MaterialId | null) => {
      if (materialId != null) {
        updatePost(postId, { infillMaterial: materialId })
      }
    },
    [updatePost, postId]
  )

  const handleRemovePost = useCallback(() => {
    if (confirm(t($ => $.wallPost.confirmDelete))) {
      removePost(postId)
    }
  }, [removePost, postId, t])

  const handleFitToView = useCallback(() => {
    const expandAmount = Math.max(post.width, wall.thickness) * 1.5
    const expandedPolygon = offsetPolygon(post.polygon, expandAmount)
    const bounds = Bounds2D.fromPoints(expandedPolygon.points)
    viewportActions.fitToView(bounds)
  }, [wall, post, viewportActions])

  return (
    <div className="flex flex-col gap-4">
      {/* Basic Properties */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t($ => $.wallPost.type)}</span>
          <ToggleGroup type="single" variant="outline" value={post.postType} onValueChange={handleTypeChange} size="sm">
            <ToggleGroupItem value="inside">{t($ => $.wallPost.typeInside)}</ToggleGroupItem>
            <ToggleGroupItem value="center">{t($ => $.wallPost.typeCenter)}</ToggleGroupItem>
            <ToggleGroupItem value="outside">{t($ => $.wallPost.typeOutside)}</ToggleGroupItem>
            <ToggleGroupItem value="double">{t($ => $.wallPost.typeDouble)}</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{t($ => $.wallPost.behavior)}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t($ => $.wallPost.actsAsPost)}</span>
            <Switch checked={!post.replacesPosts} size="sm" onCheckedChange={handleReplacesPostsChange} />
            <span className="text-sm">{t($ => $.wallPost.flankedByPosts)}</span>
          </div>
        </div>

        {/* Dimension inputs */}
        <div className="grid grow grid-cols-[auto_1fr_auto_1fr] grid-rows-1 items-center gap-2 gap-x-3">
          {/* Width Label */}
          <Label.Root htmlFor="post-width">
            <span className="text-sm font-medium">{t($ => $.wallPost.width)}</span>
          </Label.Root>

          {/* Width Input */}
          <LengthField
            value={post.width}
            onCommit={value => {
              updatePost(postId, { width: value })
            }}
            unit="cm"
            min={1}
            step={10}
            size="sm"
            className="w-20"
          />

          {/* Thickness Label */}
          <Label.Root htmlFor="post-thickness">
            <span className="text-sm font-medium">{t($ => $.wallPost.thickness)}</span>
          </Label.Root>

          {/* Thickness Input */}
          <LengthField
            value={post.thickness}
            onCommit={value => {
              updatePost(postId, { thickness: value })
            }}
            unit="cm"
            min={1}
            step={10}
            size="sm"
            className="w-20"
          />
        </div>
      </div>
      {/* Material Selection */}
      <div className="flex flex-col gap-2">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.wallPost.postMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit
          value={post.material}
          onValueChange={handleMaterialChange}
          size="sm"
          preferredTypes={['dimensional']}
        />
      </div>
      {/* Infill Material Selection */}
      <div className="flex flex-col gap-2">
        <Label.Root>
          <span className="text-sm font-medium">{t($ => $.wallPost.infillMaterial)}</span>
        </Label.Root>
        <MaterialSelectWithEdit value={post.infillMaterial} onValueChange={handleInfillMaterialChange} size="sm" />
      </div>
      <Separator />
      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button size="icon" title={t($ => $.wallPost.fitToView)} onClick={handleFitToView}>
          <FitToViewIcon />
        </Button>
        <Button size="icon" variant="destructive" title={t($ => $.wallPost.deletePost)} onClick={handleRemovePost}>
          <Trash />
        </Button>
      </div>
      <Callout color="blue">
        <CalloutIcon>
          <Info />
        </CalloutIcon>
        <CalloutText>
          <span className="text-sm">
            <Trans t={t} i18nKey={$ => $.wallPost.moveInstructions} components={{ kbd: <Kbd /> }}>
              To move the post, you can use the Move Tool{' '}
              <Kbd>
                <>{{ hotkey: 'M' }}</>
              </Kbd>{' '}
              or click any of the distance measurements shown in the editor to adjust them.
            </Trans>
          </span>
        </CalloutText>
      </Callout>
    </div>
  )
}
