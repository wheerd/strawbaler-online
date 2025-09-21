import { useCallback, useMemo } from 'react'
import { Box, Flex, Text, Select, TextField, Heading, Button, Grid, Card, Callout } from '@radix-ui/themes'
import { useModelActions, usePerimeterById } from '@/model/store'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { formatLength } from '@/utils/formatLength'
import type { PerimeterWallId, PerimeterId, PerimeterConstructionMethodId } from '@/types/ids'
import { usePerimeterConstructionMethods, usePerimeterConstructionMethodById } from '@/config/store'
import { WallConstructionPlanModal } from '@/components/FloorPlanEditor/WallConstructionPlan'
import { constructInfillWall, type InfillConstructionConfig } from '@/construction'

interface PerimeterWallInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
}

export function PerimeterWallInspector({ perimeterId, wallId }: PerimeterWallInspectorProps): React.JSX.Element {
  const allPerimeterMethods = usePerimeterConstructionMethods()
  const {
    getStoreyById,
    updatePerimeterWallThickness: updateOuterWallThickness,
    updatePerimeterWallConstructionMethod: updateOuterWallConstructionMethod
  } = useModelActions()

  const outerWall = usePerimeterById(perimeterId)

  // Use useMemo to find wall within the wall object
  const wall = useMemo(() => {
    return outerWall?.walls.find(s => s.id === wallId)
  }, [outerWall, wallId])

  // Debounced thickness input handler
  const thicknessInput = useDebouncedNumericInput(
    wall?.thickness || 0,
    useCallback(
      (value: number) => {
        updateOuterWallThickness(perimeterId, wallId, createLength(value))
      },
      [updateOuterWallThickness, perimeterId, wallId]
    ),
    {
      debounceMs: 300,
      min: 50,
      max: 1500,
      step: 10
    }
  )

  // If wall not found, show error
  if (!wall || !outerWall) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Wall Not Found</Text>
            <br />
            Wall with ID {wallId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  const storey = getStoreyById(outerWall.storeyId)

  // Get construction method for this wall
  const constructionMethod = wall?.constructionMethodId
    ? usePerimeterConstructionMethodById(wall.constructionMethodId)
    : null

  const constructionPlan = useMemo(() => {
    if (!outerWall || !wall || !storey || !constructionMethod) return null

    // For now, only support infill construction until other types are implemented
    if (constructionMethod.config.type === 'infill') {
      return constructInfillWall(wall, outerWall, storey.height, constructionMethod.config as InfillConstructionConfig)
    }

    // TODO: Add support for other construction types
    return null
  }, [wall, outerWall, storey, constructionMethod])

  return (
    <Box p="2">
      <Flex direction="column" gap="4">
        {/* Basic Properties */}
        <Flex direction="column" gap="3">
          {/* Construction Method */}
          <Flex align="center" justify="between" gap="3">
            <Text size="1" weight="medium" color="gray">
              Construction Method
            </Text>
            <Select.Root
              value={wall.constructionMethodId || ''}
              onValueChange={(value: PerimeterConstructionMethodId) => {
                updateOuterWallConstructionMethod(perimeterId, wallId, value)
              }}
              size="1"
            >
              <Select.Trigger placeholder="Select method" style={{ flex: 1, minWidth: 0 }} />
              <Select.Content>
                {allPerimeterMethods.map(method => (
                  <Select.Item key={method.id} value={method.id}>
                    {method.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {/* Thickness Input */}
          <Flex align="center" justify="between" gap="3">
            <Text size="1" weight="medium" color="gray">
              Thickness
            </Text>
            <Box style={{ position: 'relative', flex: 1, maxWidth: '96px' }}>
              <TextField.Root
                type="number"
                value={thicknessInput.value.toString()}
                onChange={e => thicknessInput.handleChange(e.target.value)}
                onBlur={thicknessInput.handleBlur}
                onKeyDown={thicknessInput.handleKeyDown}
                min="50"
                max="1500"
                step="10"
                size="1"
                style={{ textAlign: 'right', paddingRight: '24px' }}
              />
              <Text
                size="1"
                color="gray"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}
              >
                mm
              </Text>
            </Box>
          </Flex>
        </Flex>

        {/* Measurements */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Measurements
          </Heading>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="center">
              <Text size="1" color="gray">
                Inside Length:
              </Text>
              <Text size="1" weight="medium">
                {formatLength(wall.insideLength)}
              </Text>
            </Flex>
            <Flex justify="between" align="center">
              <Text size="1" color="gray">
                Outside Length:
              </Text>
              <Text size="1" weight="medium">
                {formatLength(wall.outsideLength)}
              </Text>
            </Flex>
          </Flex>
        </Box>

        {/* Openings */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Openings
          </Heading>
          <Grid columns="3" gap="2">
            <Card size="1" variant="surface">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'door').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Doors
              </Text>
            </Card>
            <Card size="1" variant="surface">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'window').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Windows
              </Text>
            </Card>
            <Card size="1" variant="surface">
              <Text align="center" size="2" weight="bold">
                {wall.openings.filter(o => o.type === 'passage').length}
              </Text>
              <Text align="center" size="1" color="gray">
                Passages
              </Text>
            </Card>
          </Grid>
        </Box>

        {/* Construction Plan */}
        <Box pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
          {constructionPlan && (
            <WallConstructionPlanModal plan={constructionPlan}>
              <Button size="2" style={{ width: '100%' }}>
                View Construction Plan
              </Button>
            </WallConstructionPlanModal>
          )}
        </Box>
      </Flex>
    </Box>
  )
}
