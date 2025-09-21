import { useCallback, useMemo } from 'react'
import { Box, Flex, Text, Select, TextField, Button, Callout, Heading } from '@radix-ui/themes'
import { TrashIcon } from '@radix-ui/react-icons'
import { useModelActions, usePerimeterById } from '@/model/store'
import { createLength } from '@/types/geometry'
import { useDebouncedNumericInput } from '@/components/FloorPlanEditor/hooks/useDebouncedInput'
import { useSelectionStore } from '@/components/FloorPlanEditor/hooks/useSelectionStore'
import type { PerimeterWallId, PerimeterId, OpeningId } from '@/types/ids'
import type { OpeningType } from '@/types/model'

interface OpeningInspectorProps {
  perimeterId: PerimeterId
  wallId: PerimeterWallId
  openingId: OpeningId
}

// Opening type options - moved outside component to avoid recreation
const OPENING_TYPE_OPTIONS: { value: OpeningType; label: string }[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
  { value: 'passage', label: 'Passage' }
]

export function OpeningInspector({ perimeterId, wallId, openingId }: OpeningInspectorProps): React.JSX.Element {
  // Get model store functions - use specific selectors for stable references
  const select = useSelectionStore()
  const { updatePerimeterWallOpening: updateOpening, removePerimeterWallOpening: removeOpeningFromOuterWall } =
    useModelActions()

  // Get perimeter from store
  const perimeter = usePerimeterById(perimeterId)

  // Use useMemo to find wall and opening within the wall object
  const wall = useMemo(() => {
    return perimeter?.walls.find(w => w.id === wallId)
  }, [perimeter, wallId])

  const opening = useMemo(() => {
    return wall?.openings.find(o => o.id === openingId)
  }, [wall, openingId])

  // Debounced input handlers for numeric values
  const widthInput = useDebouncedNumericInput(
    opening?.width || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { width: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 5000,
      step: 10
    }
  )

  const heightInput = useDebouncedNumericInput(
    opening?.height || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { height: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 100,
      max: 4000,
      step: 10
    }
  )

  const offsetInput = useDebouncedNumericInput(
    opening?.offsetFromStart || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, { offsetFromStart: createLength(value) })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: (wall?.wallLength || 0) - (opening?.width || 0),
      step: 10
    }
  )

  const sillHeightInput = useDebouncedNumericInput(
    opening?.sillHeight || 0,
    useCallback(
      (value: number) => {
        updateOpening(perimeterId, wallId, openingId, {
          sillHeight: value === 0 ? undefined : createLength(value)
        })
      },
      [updateOpening, perimeterId, wallId, openingId]
    ),
    {
      debounceMs: 300,
      min: 0,
      max: 2000,
      step: 10
    }
  )

  // If opening not found, show error
  if (!opening || !wall || !perimeter || !perimeterId || !wallId) {
    return (
      <Box p="2">
        <Callout.Root color="red">
          <Callout.Text>
            <Text weight="bold">Opening Not Found</Text>
            <br />
            Opening with ID {openingId} could not be found.
          </Callout.Text>
        </Callout.Root>
      </Box>
    )
  }

  // Event handlers with stable references
  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newType = e.target.value as OpeningType
      // Selects can update immediately since they don't have focus issues
      updateOpening(perimeterId, wallId, openingId, { type: newType })
    },
    [updateOpening, perimeterId, wallId, openingId]
  )

  const handleRemoveOpening = useCallback(() => {
    if (confirm('Are you sure you want to remove this opening?')) {
      select.popSelection()
      removeOpeningFromOuterWall(perimeterId, wallId, openingId)
    }
  }, [removeOpeningFromOuterWall, perimeterId, wallId, openingId])

  const area = (opening.width * opening.height) / (1000 * 1000)

  return (
    <Box p="2">
      <Flex direction="column" gap="4">
        {/* Basic Properties */}
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between" gap="3">
            <Text size="1" weight="medium" color="gray">
              Type
            </Text>
            <Select.Root
              value={opening.type}
              onValueChange={(value: OpeningType) =>
                handleTypeChange({ target: { value } } as React.ChangeEvent<HTMLSelectElement>)
              }
              size="1"
            >
              <Select.Trigger style={{ flex: 1, minWidth: 0 }} />
              <Select.Content>
                {OPENING_TYPE_OPTIONS.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex align="center" justify="between" gap="3">
            <Text size="1" weight="medium" color="gray">
              Width
            </Text>
            <Box style={{ position: 'relative', flex: 1, maxWidth: '96px' }}>
              <TextField.Root
                type="number"
                value={widthInput.value.toString()}
                onChange={e => widthInput.handleChange(e.target.value)}
                onBlur={widthInput.handleBlur}
                onKeyDown={widthInput.handleKeyDown}
                min="100"
                max="5000"
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

          <Flex align="center" justify="between" gap="3">
            <Text size="1" weight="medium" color="gray">
              Height
            </Text>
            <Box style={{ position: 'relative', flex: 1, maxWidth: '96px' }}>
              <TextField.Root
                type="number"
                value={heightInput.value.toString()}
                onChange={e => heightInput.handleChange(e.target.value)}
                onBlur={heightInput.handleBlur}
                onKeyDown={heightInput.handleKeyDown}
                min="100"
                max="4000"
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

          <Flex direction="column" gap="1">
            <Flex align="center" justify="between" gap="3">
              <Text size="1" weight="medium" color="gray">
                Offset from Start
              </Text>
              <Box style={{ position: 'relative', flex: 1, maxWidth: '96px' }}>
                <TextField.Root
                  type="number"
                  value={offsetInput.value.toString()}
                  onChange={e => offsetInput.handleChange(e.target.value)}
                  onBlur={offsetInput.handleBlur}
                  onKeyDown={offsetInput.handleKeyDown}
                  min="0"
                  max={wall.wallLength - opening.width}
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
            <Text size="1" color="gray">
              Distance from the start of the wall wall
            </Text>
          </Flex>

          {opening.type === 'window' && (
            <Flex direction="column" gap="1">
              <Flex align="center" justify="between" gap="3">
                <Text size="1" weight="medium" color="gray">
                  Sill Height
                </Text>
                <Box style={{ position: 'relative', flex: 1, maxWidth: '96px' }}>
                  <TextField.Root
                    type="number"
                    value={sillHeightInput.value.toString()}
                    onChange={e => sillHeightInput.handleChange(e.target.value)}
                    onBlur={sillHeightInput.handleBlur}
                    onKeyDown={sillHeightInput.handleKeyDown}
                    min="0"
                    max="2000"
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
              <Text size="1" color="gray">
                Height of window sill above floor level
              </Text>
            </Flex>
          )}
        </Flex>

        {/* Measurements */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Measurements
          </Heading>
          <Flex justify="between" align="center">
            <Text size="1" color="gray">
              Area:
            </Text>
            <Text size="1" weight="medium">
              {area.toFixed(2)} m²
            </Text>
          </Flex>
        </Box>

        {/* Actions */}
        <Box pt="1" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Heading size="2" mb="2">
            Actions
          </Heading>
          <Button color="red" variant="solid" size="1" onClick={handleRemoveOpening} style={{ width: '100%' }}>
            <TrashIcon />
            Remove Opening
          </Button>
        </Box>
      </Flex>
    </Box>
  )
}
