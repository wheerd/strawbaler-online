import { Pencil1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import React from 'react'

import { useConfigurationModal } from '@/construction/config/context/ConfigurationModalContext'

import { MaterialSelect, type MaterialSelectProps } from './MaterialSelect'

export function MaterialSelectWithEdit(props: MaterialSelectProps): React.JSX.Element {
  const { openConfiguration } = useConfigurationModal()

  return (
    <Flex gap="1" align="center">
      <Flex direction="column" gap="1" flexGrow="1" mr="1">
        <MaterialSelect {...props} />
      </Flex>
      <IconButton
        title="Configure Materials"
        variant="ghost"
        size={props.size}
        onClick={() => openConfiguration('materials', props.value ?? undefined)}
      >
        <Pencil1Icon />
      </IconButton>
    </Flex>
  )
}
