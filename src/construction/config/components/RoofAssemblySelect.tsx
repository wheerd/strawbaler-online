import { Flex, Select, Text } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { RoofAssemblyId } from '@/building/model/ids'
import { useRoofAssemblies } from '@/construction/config/store'

import { getRoofAssemblyTypeIcon } from './Icons'

export interface RoofAssemblySelectProps {
  value: RoofAssemblyId | null | undefined
  onValueChange: (assemblyId: RoofAssemblyId) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  showDefaultIndicator?: boolean
  defaultAssemblyId?: RoofAssemblyId
}

export function RoofAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select roof assembly...',
  size = '2',
  disabled = false,
  showDefaultIndicator = false,
  defaultAssemblyId
}: RoofAssemblySelectProps): React.JSX.Element {
  const roofAssemblies = useRoofAssemblies()
  const { t } = useTranslation('config')

  const getDisplayName = (assembly: { name: string; nameKey?: string }): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

  return (
    <Select.Root
      value={value ?? ''}
      onValueChange={val => onValueChange(val as RoofAssemblyId)}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {roofAssemblies.length === 0 ? (
          <Select.Item value="" disabled>
            <Text color="gray">No roof assemblies available</Text>
          </Select.Item>
        ) : (
          roofAssemblies.map(assembly => {
            const Icon = getRoofAssemblyTypeIcon(assembly.type)
            const isDefault = showDefaultIndicator && assembly.id === defaultAssemblyId
            return (
              <Select.Item key={assembly.id} value={assembly.id}>
                <Flex align="center" gap="2">
                  <Icon style={{ flexShrink: 0 }} />
                  <Text>
                    {getDisplayName(assembly)}
                    {isDefault && <Text color="gray"> (default)</Text>}
                  </Text>
                </Flex>
              </Select.Item>
            )
          })
        )}
      </Select.Content>
    </Select.Root>
  )
}
