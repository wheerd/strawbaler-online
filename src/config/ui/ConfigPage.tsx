import { Settings } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ConfigTab } from '@/config/ui/ConfigurationModalContext'
import { LayerSetsContent } from '@/config/ui/layers/LayerSetsContent'
import { MaterialsConfigContent } from '@/materials/ui/MaterialsConfigContent'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/components/tabs'

import { FloorAssemblyConfigContent } from './floor-assembly/FloorAssemblyConfigContent'
import { OpeningAssemblyContent } from './opening-assembly/OpeningAssemblyContent'
import { RingBeamAssemblyContent } from './ring-beam-assembly/RingBeamAssemblyContent'
import { RoofAssemblyConfigContent } from './roof-assembly/RoofAssemblyConfigContent'
import { WallAssemblyContent } from './wall-assembly/WallAssemblyContent'

export function ConfigPage(): React.JSX.Element {
  const { t } = useTranslation('config')
  const [activeTab, setActiveTab] = useState<ConfigTab>('materials')
  const [initialSelectionId, setInitialSelectionId] = useState<string | undefined>()

  const handleTabChange = (tab: string) => {
    setInitialSelectionId(undefined)
    setActiveTab(tab as ConfigTab)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <Settings className="h-5 w-5" />
        <h1 className="text-xl font-semibold">{t($ => $.modal.title)}</h1>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-4">
          <TabsList>
            <TabsTrigger value="materials">{t($ => $.modal.tabMaterials)}</TabsTrigger>
            <TabsTrigger value="layers">{t($ => $.modal.tabLayerSets)}</TabsTrigger>
            <TabsTrigger value="ringbeams">{t($ => $.modal.tabRingBeams)}</TabsTrigger>
            <TabsTrigger value="walls">{t($ => $.modal.tabWalls)}</TabsTrigger>
            <TabsTrigger value="openings">{t($ => $.modal.tabOpenings)}</TabsTrigger>
            <TabsTrigger value="floors">{t($ => $.modal.tabFloors)}</TabsTrigger>
            <TabsTrigger value="roofs">{t($ => $.modal.tabRoofs)}</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <TabsContent value="materials" className="m-0">
            <div className="flex w-full">
              <MaterialsConfigContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="layers" className="m-0">
            <div className="flex w-full">
              <LayerSetsContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="ringbeams" className="m-0">
            <div className="flex w-full">
              <RingBeamAssemblyContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="walls" className="m-0">
            <div className="w-full">
              <WallAssemblyContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="openings" className="m-0">
            <div className="flex w-full">
              <OpeningAssemblyContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="floors" className="m-0">
            <div className="flex w-full">
              <FloorAssemblyConfigContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>

          <TabsContent value="roofs" className="m-0">
            <div className="flex w-full">
              <RoofAssemblyConfigContent initialSelectionId={initialSelectionId} />
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
