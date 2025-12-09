import { CopyIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import * as Label from '@radix-ui/react-label'
import {
  AlertDialog,
  Badge,
  Button,
  Callout,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Separator,
  Text,
  TextField
} from '@radix-ui/themes'
import React, { useCallback, useMemo, useState } from 'react'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { usePerimeters, useStoreysOrderedByLevel } from '@/building/store'
import {
  useConfigActions,
  useDefaultOpeningAssemblyId,
  useOpeningAssemblies,
  useWallAssemblies
} from '@/construction/config/store'
import { getOpeningAssemblyUsage } from '@/construction/config/usage'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import type { MaterialId } from '@/construction/materials/material'
import type { OpeningAssemblyType, OpeningConfig } from '@/construction/openings/types'
import { LengthField } from '@/shared/components/LengthField/LengthField'

import { OpeningAssemblySelect } from './OpeningAssemblySelect'

export interface OpeningAssemblyContentProps {
  initialSelectionId?: string
}

export function OpeningAssemblyContent({ initialSelectionId }: OpeningAssemblyContentProps): React.JSX.Element {
  const openingAssemblies = useOpeningAssemblies()
  const wallAssemblies = useWallAssemblies()
  const perimeters = usePerimeters()
  const storeys = useStoreysOrderedByLevel()
  const {
    addOpeningAssembly,
    updateOpeningAssemblyName,
    updateOpeningAssemblyConfig,
    removeOpeningAssembly,
    duplicateOpeningAssembly,
    setDefaultOpeningAssembly
  } = useConfigActions()

  const defaultId = useDefaultOpeningAssemblyId()

  const allAssemblies = useMemo(() => Object.values(openingAssemblies), [openingAssemblies])
  const wallAssemblyArray = useMemo(() => Object.values(wallAssemblies), [wallAssemblies])

  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(() => {
    if (initialSelectionId && allAssemblies.some(m => m.id === initialSelectionId)) {
      return initialSelectionId
    }
    return allAssemblies.length > 0 ? allAssemblies[0].id : null
  })

  const selectedAssembly = allAssemblies.find(m => m.id === selectedAssemblyId) ?? null

  const usage = useMemo(
    () =>
      selectedAssembly
        ? getOpeningAssemblyUsage(
            selectedAssembly.id as OpeningAssemblyId,
            perimeters,
            Object.values(storeys),
            wallAssemblyArray,
            defaultId!
          )
        : { isUsed: false, usedAsGlobalDefault: false, usedByWallAssemblies: [], usedByOpenings: [] },
    [selectedAssembly, perimeters, storeys, wallAssemblyArray, defaultId]
  )

  const handleAddNew = useCallback(
    (type: OpeningAssemblyType) => {
      const defaultMaterial = '' as MaterialId

      let config: OpeningConfig
      if (type === 'simple') {
        config = {
          type: 'simple',
          padding: 15,
          headerThickness: 60,
          headerMaterial: defaultMaterial,
          sillThickness: 60,
          sillMaterial: defaultMaterial
        }
      } else {
        config = {
          type: 'empty',
          padding: 15
        }
      }

      const newAssembly = addOpeningAssembly(`New ${type} opening`, config)
      setSelectedAssemblyId(newAssembly.id)
    },
    [addOpeningAssembly]
  )

  const handleDuplicate = useCallback(() => {
    if (!selectedAssembly) return

    const duplicated = duplicateOpeningAssembly(selectedAssembly.id, `${selectedAssembly.name} (Copy)`)
    setSelectedAssemblyId(duplicated.id)
  }, [selectedAssembly, duplicateOpeningAssembly])

  const handleDelete = useCallback(() => {
    if (!selectedAssembly || usage.isUsed) return

    const currentIndex = allAssemblies.findIndex(m => m.id === selectedAssemblyId)
    removeOpeningAssembly(selectedAssembly.id)

    if (allAssemblies.length > 1) {
      const nextAssembly = allAssemblies[currentIndex + 1] ?? allAssemblies[currentIndex - 1]
      setSelectedAssemblyId(nextAssembly?.id ?? null)
    } else {
      setSelectedAssemblyId(null)
    }
  }, [selectedAssembly, selectedAssemblyId, allAssemblies, removeOpeningAssembly, usage.isUsed])

  const handleUpdateName = useCallback(
    (name: string) => {
      if (!selectedAssembly) return
      updateOpeningAssemblyName(selectedAssembly.id, name)
    },
    [selectedAssembly, updateOpeningAssemblyName]
  )

  const handleUpdateConfig = useCallback(
    (updates: Partial<OpeningConfig>) => {
      if (!selectedAssembly) return
      updateOpeningAssemblyConfig(selectedAssembly.id as OpeningAssemblyId, updates)
    },
    [selectedAssembly, updateOpeningAssemblyConfig]
  )

  if (!selectedAssembly) {
    return (
      <Flex direction="column" gap="4" width="100%">
        <Flex gap="2" align="end">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => handleAddNew('simple')}>Standard Opening</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('empty')}>Empty Opening</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>

        <Callout.Root color="gray">
          <Callout.Text>No opening assemblies. Create one to get started.</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  const config = selectedAssembly

  return (
    <Flex direction="column" gap="4" width="100%">
      {/* Selector + Actions */}
      <Flex direction="column" gap="2">
        <Flex gap="2" align="end">
          <Flex direction="column" gap="1" flexGrow="1">
            <OpeningAssemblySelect
              value={(selectedAssemblyId as OpeningAssemblyId) || undefined}
              onValueChange={value => setSelectedAssemblyId(value || null)}
              showDefaultIndicator
              size="2"
            />
          </Flex>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton title="Add New">
                <PlusIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onClick={() => handleAddNew('simple')}>Standard Opening</DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => handleAddNew('empty')}>Empty Opening</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <IconButton onClick={handleDuplicate} variant="soft" title="Duplicate">
            <CopyIcon />
          </IconButton>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <IconButton color="red" variant="soft" disabled={usage.isUsed} title="Delete">
                <TrashIcon />
              </IconButton>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Opening Assembly</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete &quot;{selectedAssembly.name}&quot;?
              </AlertDialog.Description>
              <Flex gap="3" mt="4" justify="end">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button variant="solid" color="red" onClick={handleDelete}>
                    Delete
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Flex>

      {/* Form */}
      {selectedAssembly && (
        <Flex
          direction="column"
          gap="3"
          p="3"
          style={{ border: '1px solid var(--gray-6)', borderRadius: 'var(--radius-2)' }}
        >
          <Grid columns="1fr 1fr" gap="2" gapX="3" align="center">
            <Grid columns="auto 1fr" gapX="2" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Name
                </Text>
              </Label.Root>
              <TextField.Root
                value={selectedAssembly.name}
                onChange={e => handleUpdateName(e.target.value)}
                placeholder="Opening assembly name"
                size="2"
              />
            </Grid>

            <Flex gap="2" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Type
                </Text>
              </Label.Root>
              <Text size="2" color="gray">
                {config.type === 'simple' ? 'Standard Opening' : 'Empty Opening'}
              </Text>
            </Flex>
          </Grid>

          <Separator size="4" />

          {/* Configuration Fields */}
          {config.type === 'simple' ? (
            <>
              <Heading size="2">Standard Opening</Heading>
              <Grid columns="auto 1fr auto 1fr" gap="2" gapX="3" align="center">
                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Padding
                  </Text>
                </Label.Root>
                <LengthField value={config.padding} onChange={padding => handleUpdateConfig({ padding })} unit="mm" />

                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Header Thickness
                  </Text>
                </Label.Root>
                <LengthField
                  value={config.headerThickness}
                  onChange={headerThickness => handleUpdateConfig({ headerThickness })}
                  unit="mm"
                />

                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Header Material
                  </Text>
                </Label.Root>
                <MaterialSelectWithEdit
                  value={config.headerMaterial}
                  onValueChange={headerMaterial => {
                    if (!headerMaterial) return
                    handleUpdateConfig({ headerMaterial })
                  }}
                  size="2"
                />

                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Sill Thickness
                  </Text>
                </Label.Root>
                <LengthField
                  value={config.sillThickness}
                  onChange={sillThickness => handleUpdateConfig({ sillThickness })}
                  unit="mm"
                />

                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Sill Material
                  </Text>
                </Label.Root>
                <MaterialSelectWithEdit
                  value={config.sillMaterial}
                  onValueChange={sillMaterial => {
                    if (!sillMaterial) return
                    handleUpdateConfig({ sillMaterial })
                  }}
                  size="2"
                />
              </Grid>
            </>
          ) : (
            <>
              <Heading size="2">Empty Opening</Heading>
              <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
                <Label.Root>
                  <Text size="2" weight="medium" color="gray">
                    Padding
                  </Text>
                </Label.Root>
                <LengthField value={config.padding} onChange={padding => handleUpdateConfig({ padding })} unit="mm" />
              </Grid>
            </>
          )}

          <Separator size="4" />

          <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
            <Label.Root>
              <Text size="2" weight="medium" color="gray">
                Default Opening Assembly
              </Text>
            </Label.Root>
            <OpeningAssemblySelect
              value={defaultId}
              onValueChange={assemblyId => {
                if (assemblyId) setDefaultOpeningAssembly(assemblyId)
              }}
              placeholder="Select default..."
              size="2"
            />
          </Grid>

          {usage.isUsed && (
            <Grid columns="auto 1fr" gap="2" gapX="3" align="center">
              <Label.Root>
                <Text size="2" weight="medium" color="gray">
                  Used By:
                </Text>
              </Label.Root>
              <Flex gap="1" wrap="wrap">
                {usage.usedAsGlobalDefault && (
                  <Badge size="2" variant="soft">
                    Global Default
                  </Badge>
                )}
                {usage.usedByWallAssemblies.map((use, index) => (
                  <Badge key={index} size="2" variant="soft">
                    {use}
                  </Badge>
                ))}
                {usage.usedByOpenings.map((use, index) => (
                  <Badge key={`opening-${index}`} size="2" variant="soft">
                    {use}
                  </Badge>
                ))}
              </Flex>
            </Grid>
          )}
        </Flex>
      )}
    </Flex>
  )
}
