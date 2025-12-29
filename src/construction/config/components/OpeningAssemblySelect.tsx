import { Select, Text } from '@radix-ui/themes'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { OpeningAssemblyId } from '@/building/model/ids'
import { useDefaultOpeningAssemblyId, useOpeningAssemblies } from '@/construction/config/store'

export interface OpeningAssemblySelectProps {
  value: OpeningAssemblyId | null | undefined
  onValueChange: (assemblyId: OpeningAssemblyId | undefined) => void
  placeholder?: string
  size?: '1' | '2' | '3'
  disabled?: boolean
  allowDefault?: boolean
  showDefaultIndicator?: boolean
}

export function OpeningAssemblySelect({
  value,
  onValueChange,
  placeholder = 'Select opening assembly...',
  size = '2',
  disabled = false,
  allowDefault = false,
  showDefaultIndicator = false
}: OpeningAssemblySelectProps): React.JSX.Element {
  const openingAssemblies = useOpeningAssemblies()
  const { t } = useTranslation('config')
  const defaultAssemblyId = useDefaultOpeningAssemblyId()

  const getDisplayName = (assembly: { name: string; nameKey?: string }): string => {
    return assembly.nameKey ? t(assembly.nameKey) : assembly.name
  }

  const assemblies = Object.values(openingAssemblies)

  return (
    <Select.Root
      value={value ?? (allowDefault ? '__default__' : '')}
      onValueChange={val => {
        if (val === '__default__') {
          onValueChange(undefined)
        } else {
          onValueChange(val as OpeningAssemblyId)
        }
      }}
      disabled={disabled}
      size={size}
    >
      <Select.Trigger placeholder={placeholder} />
      <Select.Content>
        {allowDefault && (
          <Select.Item value="__default__">
            <Text color="gray">Use global default</Text>
          </Select.Item>
        )}
        {assemblies.length === 0 ? (
          <Select.Item value="__none__" disabled>
            <Text color="gray">No opening assemblies available</Text>
          </Select.Item>
        ) : (
          assemblies.map(assembly => {
            const isDefault = showDefaultIndicator && assembly.id === defaultAssemblyId
            return (
              <Select.Item key={assembly.id} value={assembly.id}>
                <Text>
                  {getDisplayName(assembly)}
                  {isDefault && <Text color="gray"> (default)</Text>}
                </Text>
              </Select.Item>
            )
          })
        )}
      </Select.Content>
    </Select.Root>
  )
}
