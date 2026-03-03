import React, { lazy, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type ConstructionModelId } from '@/construction/store'
import { ConstructionPartsList } from '@/parts/ui/ConstructionPartsList'
import { ConstructionVirtualPartsList } from '@/parts/ui/ConstructionVirtualPartsList'
import { Tabs } from '@/shared/ui/components/tabs'

const ConstructionModelRegenerateButton = lazy(() => import('@/construction/ui/ConstructionModelRegenerateButton'))

export function PartsListPage(): React.JSX.Element {
  const { t } = useTranslation('construction')
  const [activeTab, setActiveTab] = useState<'materials' | 'modules'>('materials')

  const modelId = undefined as ConstructionModelId | undefined

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <Tabs.Root
        value={activeTab}
        onValueChange={value => {
          setActiveTab(value as 'materials' | 'modules')
        }}
        className="flex h-full w-full flex-col"
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <Tabs.List>
            <Tabs.Trigger value="materials">{t($ => $.partsListModal.tabs.materials)}</Tabs.Trigger>
            <Tabs.Trigger value="modules">{t($ => $.partsListModal.tabs.modules)}</Tabs.Trigger>
          </Tabs.List>

          <React.Suspense fallback={null}>
            <ConstructionModelRegenerateButton />
          </React.Suspense>
        </div>

        <Tabs.Content value="materials" className="flex min-h-0 w-full flex-1 flex-col overflow-auto p-4">
          <ConstructionPartsList modelId={modelId} />
        </Tabs.Content>

        <Tabs.Content value="modules" className="flex min-h-0 flex-1 flex-col overflow-auto p-4">
          <ConstructionVirtualPartsList modelId={modelId} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
