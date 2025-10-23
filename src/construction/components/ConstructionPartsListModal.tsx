import { CrossCircledIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Skeleton, Spinner } from '@radix-ui/themes'
import React, { Suspense, use, useCallback, useEffect, useState } from 'react'

import { ConstructionPartsList } from '@/construction/components/ConstructionPartsList'
import type { ConstructionModel } from '@/construction/model'
import type { MaterialPartsList } from '@/construction/parts'
import { generateMaterialPartsList } from '@/construction/parts'
import { BaseModal } from '@/shared/components/BaseModal'

export interface ConstructionPartsListModalProps {
  title?: string
  constructionModelFactory: () => Promise<ConstructionModel | null>
  trigger: React.ReactNode
  refreshKey?: unknown
}

export function ConstructionPartsListModal({
  title = 'Parts List',
  constructionModelFactory,
  trigger,
  refreshKey
}: ConstructionPartsListModalProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [partsListPromise, setPartsListPromise] = useState<Promise<MaterialPartsList | null> | null>(null)

  const loadPartsList = useCallback(
    () =>
      constructionModelFactory().then(model => {
        if (!model) return null
        return generateMaterialPartsList(model)
      }),
    [constructionModelFactory]
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setPartsListPromise(null)
      return
    }
    if (!partsListPromise) {
      setPartsListPromise(loadPartsList())
    }
  }

  useEffect(() => {
    if (!isOpen) return
    if (refreshKey === undefined) return
    setPartsListPromise(loadPartsList())
  }, [refreshKey, isOpen, loadPartsList])

  return (
    <BaseModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={title}
      trigger={trigger}
      size="2"
      width="calc(100vw - 2 * var(--space-4))"
      maxWidth="calc(100vw - 2 * var(--space-4))"
      height="calc(100vh - 2 * var(--space-6))"
      maxHeight="calc(100vh - 2 * var(--space-6))"
      className="flex flex-col overflow-hidden"
      resetKeys={[refreshKey]}
    >
      <Box width="100%" height="100%" style={{ overflow: 'auto' }} p="3">
        {partsListPromise ? (
          <Suspense fallback={<PartsSkeleton />}>
            <PartsListContent partsListPromise={partsListPromise} />
          </Suspense>
        ) : (
          <PartsSkeleton />
        )}
      </Box>
    </BaseModal>
  )
}

function PartsListContent({ partsListPromise }: { partsListPromise: Promise<MaterialPartsList | null> }) {
  const partsList = use(partsListPromise)

  if (!partsList) {
    return (
      <Flex>
        <Callout.Root color="red" size="2">
          <Callout.Icon>
            <CrossCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to generate parts list</Callout.Text>
        </Callout.Root>
      </Flex>
    )
  }

  return <ConstructionPartsList partsList={partsList} />
}

function PartsSkeleton() {
  return (
    <Flex direction="column" gap="4">
      <CardSkeleton />
      <CardSkeleton />
      <Spinner size="2" style={{ alignSelf: 'center' }} />
    </Flex>
  )
}

function CardSkeleton() {
  return (
    <Skeleton
      style={{
        height: '160px',
        borderRadius: 'var(--radius-3)'
      }}
    />
  )
}
