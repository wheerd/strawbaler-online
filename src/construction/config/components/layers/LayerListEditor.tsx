import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon
} from '@radix-ui/react-icons'
import {
  Badge,
  Card,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  IconButton,
  Select,
  Text
} from '@radix-ui/themes'
import React, { useMemo } from 'react'

import type { LayerConfig, LayerType, StripeDirection } from '@/construction/layers/types'
import type { MaterialId } from '@/construction/materials/material'
import { MaterialSelectWithEdit } from '@/construction/materials/components/MaterialSelectWithEdit'
import { LengthField } from '@/shared/components/LengthField'

const DEFAULT_MATERIAL = '' as MaterialId

const stripeDirectionLabels: Record<StripeDirection, string> = {
  perpendicular: 'Perpendicular',
  colinear: 'Colinear',
  diagonal: 'Diagonal'
}

function getDefaultLayer(type: LayerType, thickness: number): LayerConfig {
  if (type === 'monolithic') {
    return {
      type: 'monolithic',
      thickness,
      material: DEFAULT_MATERIAL
    }
  }

  return {
    type: 'striped',
    thickness,
    direction: 'perpendicular',
    stripeWidth: 50,
    stripeMaterial: DEFAULT_MATERIAL,
    gapWidth: 50,
    gapMaterial: undefined
  }
}

interface LayerListEditorProps {
  title: string
  layers: LayerConfig[]
  onAddLayer: (layer: LayerConfig) => void
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
  onRemoveLayer: (index: number) => void
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  addLabel?: string
  emptyHint?: string
  defaultThickness?: number
}

export function LayerListEditor({
  title,
  layers,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onMoveLayer,
  addLabel = 'Add Layer',
  emptyHint = 'No layers yet',
  defaultThickness = 30
}: LayerListEditorProps): React.JSX.Element {
  const hasLayers = layers.length > 0
  const newLayerThickness = useMemo(() => Math.max(defaultThickness, 30), [defaultThickness])

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between">
        <Heading size="3">{title}</Heading>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton title={addLabel} size="2">
              <PlusIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              onSelect={() => onAddLayer(getDefaultLayer('monolithic', newLayerThickness))}
            >
              Monolithic Layer
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => onAddLayer(getDefaultLayer('striped', newLayerThickness))}
            >
              Striped Layer
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>

      {!hasLayers && (
        <Card variant="surface">
          <Flex align="center" justify="center" minHeight="4rem">
            <Text color="gray">{emptyHint}</Text>
          </Flex>
        </Card>
      )}

      {hasLayers && (
        <Flex direction="column" gap="3">
          {layers.map((layer, index) => (
            <LayerCard
              key={index}
              index={index}
              layer={layer}
              isFirst={index === 0}
              isLast={index === layers.length - 1}
              onMoveLayer={onMoveLayer}
              onUpdateLayer={onUpdateLayer}
              onRemoveLayer={onRemoveLayer}
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}

interface LayerCardProps {
  index: number
  layer: LayerConfig
  isFirst: boolean
  isLast: boolean
  onMoveLayer: (fromIndex: number, toIndex: number) => void
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
  onRemoveLayer: (index: number) => void
}

function LayerCard({
  index,
  layer,
  isFirst,
  isLast,
  onMoveLayer,
  onUpdateLayer,
  onRemoveLayer
}: LayerCardProps): React.JSX.Element {
  const layerLabel = useMemo(() => (layer.type === 'monolithic' ? 'Monolithic' : 'Striped'), [layer.type])

  return (
    <Card variant="surface">
      <Flex direction="column" gap="3">
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Badge variant="solid" color={layer.type === 'monolithic' ? 'indigo' : 'orange'}>
              {layerLabel}
            </Badge>
            <Text size="2" color="gray">
              Layer {index + 1}
            </Text>
          </Flex>

          <Flex gap="1">
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index - 1)}
              disabled={isFirst}
              title="Move up"
            >
              <ChevronUpIcon />
            </IconButton>
            <IconButton
              size="1"
              variant="soft"
              onClick={() => onMoveLayer(index, index + 1)}
              disabled={isLast}
              title="Move down"
            >
              <ChevronDownIcon />
            </IconButton>
            <IconButton
              size="1"
              variant="soft"
              color="red"
              onClick={() => onRemoveLayer(index)}
              title="Remove layer"
            >
              <TrashIcon />
            </IconButton>
          </Flex>
        </Flex>

        <Grid columns="repeat(6, minmax(0, 1fr))" gap="2">
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">
              Type
            </Text>
            <Select.Root
              value={layer.type}
              onValueChange={value => {
                const nextType = value as LayerType
                if (nextType === layer.type) return
                onUpdateLayer(index, getDefaultLayer(nextType, layer.thickness))
              }}
              size="2"
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="monolithic">Monolithic</Select.Item>
                <Select.Item value="striped">Striped</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" color="gray">
              Thickness
            </Text>
            <LengthField
              value={layer.thickness}
              onChange={value => onUpdateLayer(index, { thickness: value })}
              unit="mm"
              size="2"
            />
          </Flex>

          {layer.type === 'monolithic' && (
            <MonolithicLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />
          )}

          {layer.type === 'striped' && (
            <StripedLayerFields index={index} layer={layer} onUpdateLayer={onUpdateLayer} />
          )}
        </Grid>
      </Flex>
    </Card>
  )
}

function MonolithicLayerFields({
  index,
  layer,
  onUpdateLayer
}: {
  index: number
  layer: Extract<LayerConfig, { type: 'monolithic' }>
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
}): React.JSX.Element {
  return (
    <Flex direction="column" gap="1" gridColumn="span 4">
      <Text size="2" weight="medium" color="gray">
        Material
      </Text>
      <MaterialSelectWithEdit
        value={layer.material}
        onValueChange={material => {
          if (!material) return
          onUpdateLayer(index, { material })
        }}
        placeholder="Select material..."
        size="2"
      />
    </Flex>
  )
}

function StripedLayerFields({
  index,
  layer,
  onUpdateLayer
}: {
  index: number
  layer: Extract<LayerConfig, { type: 'striped' }>
  onUpdateLayer: (index: number, updates: Partial<LayerConfig>) => void
}): React.JSX.Element {
  return (
    <>
      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">
          Direction
        </Text>
        <Select.Root
          value={layer.direction}
          onValueChange={value => onUpdateLayer(index, { direction: value as StripeDirection })}
          size="2"
        >
          <Select.Trigger />
          <Select.Content>
            {Object.entries(stripeDirectionLabels).map(([value, label]) => (
              <Select.Item key={value} value={value}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">
          Stripe Width
        </Text>
        <LengthField
          value={layer.stripeWidth}
          onChange={value => onUpdateLayer(index, { stripeWidth: value })}
          unit="mm"
          size="2"
        />
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">
          Stripe Material
        </Text>
        <MaterialSelectWithEdit
          value={layer.stripeMaterial}
          onValueChange={material => {
            if (!material) return
            onUpdateLayer(index, { stripeMaterial: material })
          }}
          placeholder="Select material..."
          size="2"
        />
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">
          Gap Width
        </Text>
        <LengthField
          value={layer.gapWidth}
          onChange={value => onUpdateLayer(index, { gapWidth: value })}
          unit="mm"
          size="2"
        />
      </Flex>

      <Flex direction="column" gap="1">
        <Text size="2" weight="medium" color="gray">
          Gap Material
        </Text>
        <MaterialSelectWithEdit
          value={layer.gapMaterial}
          allowEmpty
          emptyLabel="None"
          onValueChange={material => onUpdateLayer(index, { gapMaterial: material ?? undefined })}
          placeholder="Select material..."
          size="2"
        />
      </Flex>
    </>
  )
}
