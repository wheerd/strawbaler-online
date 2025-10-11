import { TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import { Button, Callout, Card, DataList, Flex, Grid, Heading, IconButton, Separator, Text } from '@radix-ui/themes'
import { useCallback, useMemo } from 'react'

import type { PerimeterConstructionMethodId, PerimeterId, PerimeterWallId } from '@/building/model/ids'
import { useModelActions, usePerimeterById } from '@/building/store'
import { WallConstructionPlanModal } from '@/construction/components/WallConstructionPlan'
import { PerimeterMethodSelect } from '@/construction/config/components/PerimeterMethodSelect'
import { usePerimeterConstructionMethodById } from '@/construction/config/store'
import { popSelection } from '@/editor/hooks/useSelectionStore'
import { useViewportActions } from '@/editor/hooks/useViewportStore'
import { pushTool } from '@/editor/tools/system/store'
import { FitToViewIcon, SplitWallIcon } from '@/shared/components/Icons'
import { LengthField } from '@/shared/components/LengthField'
import { type Length, boundsFromPoints } from '@/shared/geometry'
import { formatLength } from '@/shared/utils/formatLength'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
  const {
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallConstructionMethod: updateOuterWallConstructionMethod,
    removePerimeterWall
  } = useModelActions()

  const outerWall = usePerimeterById(perimeterId)
  const viewportActions = useViewportActions()

  // Use useMemo to find wall within the wall object
  const wall = useMemo(() => {
    return outerWall?.walls.find(s => s.id === wallId)
  }, [outerWall, wallId])

  // If wall not found, show error
  if (!wall || !outerWall) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          <Text weight="bold">Wall Not Found</Text>
          <br />
          Wall with ID {wallId} could not be found.
        </Callout.Text>
      </Callout.Root>
    )
  }

  // Get construction method for this wall
  const constructionMethod = wall?.constructionMethodId
    ? usePerimeterConstructionMethodById(wall.constructionMethodId)
    : null

  const handleFitToView = useCallback(() => {
    if (!wall) return
    const points = [wall.insideLine.start, wall.insideLine.end, wall.outsideLine.start, wall.outsideLine.end]
    const bounds = boundsFromPoints(points)
    viewportActions.fitToView(bounds)
  }, [wall, viewportActions])

  const handleDelete = useCallback(() => {
    removePerimeterWall(perimeterId, wallId)
    popSelection()
  }, [removePerimeterWall, perimeterId, wallId])

  return (
    <Flex direction="column" gap="4">
      {/* Basic Properties */}
      <Flex direction="column" gap="3">
        {/* Construction Method */}
        <Flex align="center" justify="between" gap="3">
          <Label.Root htmlFor="contruction-method">
            <Text size="1" weight="medium" color="gray">
              Construction Method
            </Text>
          </Label.Root>
          <PerimeterMethodSelect
            value={wall.constructionMethodId}
            onValueChange={(value: PerimeterConstructionMethodId) => {
              updateOuterWallConstructionMethod(perimeterId, wallId, value)
            }}
            placeholder="Select construction method"
            size="1"
          />
        </Flex>

        {/* Thickness Input */}
        <Flex align="center" justify="between" gap="3">
          <Label.Root htmlFor="wall-thickness">
            <Text size="1" weight="medium" color="gray">
              Thickness
            </Text>
          </Label.Root>
          <LengthField
            id="perimeter-thickness"
            value={wall.thickness as Length}
            onCommit={value => updateOuterWallThickness(perimeterId, wallId, value)}
            min={50 as Length}
            max={1500 as Length}
            step={10 as Length}
            size="1"
            unit="cm"
            style={{ width: '5rem' }}
          />
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Measurements */}
      <Flex direction="column" gap="2">
        <Heading size="2">Measurements</Heading>
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label minWidth="88px">Inside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.insideLength)}</DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label minWidth="88px">Outside Length</DataList.Label>
            <DataList.Value>{formatLength(wall.outsideLength)}</DataList.Value>
          </DataList.Item>
          {constructionMethod ? (
            <>
              <DataList.Item>
                <DataList.Label minWidth="88px">Inside Layers Thickness</DataList.Label>
                <DataList.Value>{formatLength(constructionMethod.layers.insideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">Outside Layers Thickness</DataList.Label>
                <DataList.Value>{formatLength(constructionMethod.layers.outsideThickness)}</DataList.Value>
              </DataList.Item>
              <DataList.Item>
                <DataList.Label minWidth="88px">Construction Thickness</DataList.Label>
                <DataList.Value>
                  {formatLength(
                    (wall.thickness -
                      constructionMethod.layers.outsideThickness -
                      constructionMethod.layers.insideThickness) as Length
                  )}
                </DataList.Value>
              </DataList.Item>
            </>
          ) : (
            <></>
          )}
        </DataList.Root>
      </Flex>

      <Separator size="4" />

      {/* Openings */}
      <Flex direction="column" gap="2">
        <Heading size="2">Openings</Heading>
        <Grid columns="3" gap="2">
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'door').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Doors
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'window').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Windows
              </Text>
            </Flex>
          </Card>
          <Card size="1" variant="surface">
            <Flex direction="column" gap="0" m="-1">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'passage').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Passages
              </Text>
            </Flex>
          </Card>
        </Grid>
      </Flex>

      <Separator size="4" />

      {/* Actions */}
      <Flex direction="column" gap="2">
        <WallConstructionPlanModal perimeterId={perimeterId} wallId={wallId}>
          <Button size="2">View Construction Plan</Button>
        </WallConstructionPlanModal>

        <Flex gap="2" justify="end">
          <IconButton size="2" title="Split Wall" onClick={() => pushTool('perimeter.split-wall')}>
            <SplitWallIcon />
          </IconButton>
          <IconButton size="2" title="Fit to View" onClick={handleFitToView}>
            <FitToViewIcon />
          </IconButton>
          <IconButton size="2" color="red" title="Delete Wall" onClick={handleDelete}>
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>
    </Flex>
  )
}
