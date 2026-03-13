import { CloudIcon, Download, ListIcon, PencilIcon, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useOfflineStatus } from '@/app/pwa/useOfflineStatus'
import { useIsAuthenticated } from '@/app/user/store'
import type { ConstructionModel } from '@/construction/model/model'
import { fitActiveStoreyToView } from '@/editor/canvas/helpers/fitActiveStoreyToView'
import { getAllFloorPlans } from '@/editor/canvas/plan-overlay/store/store'
import { clearSelection } from '@/editor/canvas/state/selectionStore'
import { createProject } from '@/projects/services/CloudSyncManager'
import { usePersistenceStore } from '@/projects/services/persistenceStore'
import { useProjectName } from '@/projects/store'
import { Button } from '@/shared/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/shared/ui/components/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/components/tooltip'
import { SaveIcon } from '@/shared/ui/icons'
import { cn } from '@/shared/ui/utils'
import { FileInputCancelledError, createFileInput } from '@/shared/utils/createFileInput'
import { downloadFile } from '@/shared/utils/downloadFile'

import { EditProjectDialog } from './EditProjectDialog'
import { ExportJsonDialog } from './ExportJsonDialog'
import { ImportChoiceDialog } from './ImportChoiceDialog'
import { ProjectsModal } from './ProjectsModal'
import { useIfcImport } from './useIfcImport'

export function ProjectMenu(): React.JSX.Element {
  const { t } = useTranslation('common')
  const isAuthenticated = useIsAuthenticated()
  const projectName = useProjectName()
  const { isOnline } = useOfflineStatus()

  const isSaving = usePersistenceStore(s => s.isSaving)
  const lastSaved = usePersistenceStore(s => s.lastSaved)
  const saveError = usePersistenceStore(s => s.saveError)
  const isCloudSyncing = usePersistenceStore(s => s.isCloudSyncing)
  const lastCloudSync = usePersistenceStore(s => s.lastCloudSync)
  const cloudSyncError = usePersistenceStore(s => s.cloudSyncError)

  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [jsonImportChoiceState, setJsonImportChoiceState] = useState<JsonImportChoiceState | null>(null)

  const {
    isImporting: isIfcImporting,
    importChoiceState: ifcImportChoiceState,
    handleIfcImport,
    cancelImport: cancelIfcImport
  } = useIfcImport()

  const activeIsSaving = isAuthenticated ? isCloudSyncing : isSaving
  const activeLastSaved = isAuthenticated ? lastCloudSync : lastSaved
  const activeError = isAuthenticated ? cloudSyncError : saveError

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const performExport = async (options: { includeFloorPlans: boolean }) => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { ProjectImportExportService } = await import('@/projects/services/ProjectImportExportService')

      const result = await ProjectImportExportService.exportToString(options)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
      const filename = `strawbuild-project-${timestamp}.json`
      downloadFile(result, filename)
    } catch (error) {
      console.error('Export failed', error)
      setExportError(t($ => $.autoSave.errors.failedExport))
    } finally {
      setIsExporting(false)
    }
  }

  const handleIfcExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { exportCurrentModelToIfc } = await import('@/projects/export/ifc')
      await exportCurrentModelToIfc()
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedIFCExport))
    } finally {
      setIsExporting(false)
    }
  }

  const handleIfcGeometryExport = async () => {
    setIsExporting(true)
    setExportError(null)

    try {
      const { exportConstructionGeometryToIfc } = await import('@/construction/export/ifc')
      const { getConstructionModel } = await import('@/construction/store')
      let model: ConstructionModel
      try {
        model = getConstructionModel()
      } catch {
        setExportError(t($ => $.autoSave.errors.failedGenerateModel))
        return
      }
      await exportConstructionGeometryToIfc(model)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t($ => $.autoSave.errors.failedIFCExport))
    } finally {
      setIsExporting(false)
    }
  }

  const performJsonImport = async (content: string, choice: 'current' | 'new', projectName?: string) => {
    clearSelection()

    const { ProjectImportExportService } = await import('@/projects/services/ProjectImportExportService')
    ProjectImportExportService.importFromString(content)

    if (choice === 'new') {
      await createProject({
        name: projectName ?? t($ => $.projectMenu.untitled),
        mode: 'copy'
      })
      toast.success(t($ => $.projectMenu.createSuccess))
    }

    fitActiveStoreyToView()
  }

  const handleJsonImport = async () => {
    setIsImporting(true)
    setImportError(null)

    try {
      const fileResult = await createFileInput()

      if (isAuthenticated) {
        setJsonImportChoiceState({
          open: true,
          defaultProjectName: fileResult.filename,
          handleConfirmChoice: async (choice, newProjectName) => {
            setJsonImportChoiceState(null)
            try {
              await performJsonImport(fileResult.content, choice, newProjectName)
            } catch (error) {
              console.error('Error while importing', error)
              toast.error(t($ => $.autoSave.errors.failedImport))
            } finally {
              setIsImporting(false)
            }
          }
        })
      } else {
        await performJsonImport(fileResult.content, 'current')
        setIsImporting(false)
      }
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        console.error('Error while importing', error)
        setImportError(t($ => $.autoSave.errors.failedImport))
        console.error(error)
      }
      setIsImporting(false)
    }
  }

  const getStatusInfo = (): SyncStatus => {
    if (exportError || importError) {
      return {
        text: exportError ?? importError ?? t($ => $.autoSave.exportFailed),
        active: false,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (isExporting || isImporting || isIfcImporting) {
      return {
        text: isExporting ? t($ => $.autoSave.exporting) : t($ => $.autoSave.importing),
        active: true,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    if (activeError) {
      return {
        text: isAuthenticated ? t($ => $.projectMenu.syncFailed) : t($ => $.projectMenu.saveFailed),
        active: true,
        colorClass: 'text-red-600 dark:text-red-400'
      }
    }

    if (activeIsSaving) {
      return {
        text: isAuthenticated ? t($ => $.projectMenu.syncing) : t($ => $.projectMenu.saving),
        active: true,
        colorClass: 'text-blue-600 dark:text-blue-400'
      }
    }

    if (activeLastSaved) {
      const now = new Date()
      const diffMs = now.getTime() - activeLastSaved.getTime()
      const diffMinutes = Math.floor(diffMs / 60000)

      let timeText: string
      if (diffMinutes < 1) {
        timeText = t($ => $.autoSave.justNow)
      } else if (diffMinutes < 60) {
        timeText = t($ => $.autoSave.minutesAgo, { minutes: diffMinutes })
      } else {
        const diffHours = Math.floor(diffMinutes / 60)
        timeText = t($ => $.autoSave.hoursAgo, { hours: diffHours })
      }

      return {
        text: isAuthenticated
          ? `${t($ => $.projectMenu.synced)} ${timeText}`
          : `${t($ => $.projectMenu.saved)} ${timeText}`,
        active: false,
        colorClass: 'text-green-600 dark:text-green-400'
      }
    }

    return {
      text: t($ => $.autoSave.notSaved),
      active: false,
      colorClass: 'text-muted-foreground'
    }
  }

  const statusInfo = getStatusInfo()

  const openProjectsModal = () => {
    setShowProjectsModal(true)
  }

  const StatusIcon = isAuthenticated ? CloudIcon : SaveIcon

  const anyImporting = isImporting || isIfcImporting

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="default"
                variant="ghost"
                className={cn('bg-secondary/50 h-auto w-50 justify-between gap-2 px-2 py-2', statusInfo.colorClass)}
                aria-label={t($ => $.projectMenu.buttonTitle)}
              >
                <span className="text-foreground text-l truncate font-medium">{projectName}</span>
                <div className="flex items-center gap-0.5">
                  <StatusIcon className={cn('size-6!', statusInfo.active && 'animate-pulse')} aria-hidden />
                </div>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{statusInfo.text}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" sideOffset={4}>
          <DropdownMenuItem
            onClick={() => {
              setShowEditDialog(true)
            }}
            className="cursor-pointer"
          >
            <PencilIcon />
            {t($ => $.projectMenu.editProject)}
          </DropdownMenuItem>

          {isAuthenticated && (
            <DropdownMenuItem onClick={openProjectsModal} disabled={!isOnline} className="cursor-pointer">
              <ListIcon /> {t($ => $.projectMenu.manageProjects)}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>{t($ => $.autoSave.importExportIfc)}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  void handleIfcExport()
                }}
                disabled={isExporting || anyImporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {t($ => $.autoSave.exportBuildingModel)}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  void handleIfcGeometryExport()
                }}
                disabled={isExporting || anyImporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {t($ => $.autoSave.exportConstructionModel)}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  void handleIfcImport()
                }}
                disabled={isExporting || anyImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t($ => $.autoSave.import)}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={handleExport} disabled={isExporting || anyImporting}>
            <Download className="mr-2 h-4 w-4" />
            {t($ => $.autoSave.saveToFile)}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              void handleJsonImport()
            }}
            disabled={isExporting || anyImporting}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t($ => $.autoSave.loadFromFile)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditProjectDialog open={showEditDialog} onOpenChange={setShowEditDialog} />

      {isAuthenticated && <ProjectsModal open={showProjectsModal} onOpenChange={setShowProjectsModal} />}

      {jsonImportChoiceState && (
        <ImportChoiceDialog
          open={jsonImportChoiceState.open}
          onOpenChange={open => {
            if (!open) {
              setJsonImportChoiceState(null)
              setIsImporting(false)
            }
          }}
          defaultProjectName={jsonImportChoiceState.defaultProjectName}
          onChoice={(choice, projectName) => void jsonImportChoiceState.handleConfirmChoice(choice, projectName)}
        />
      )}

      {ifcImportChoiceState && (
        <ImportChoiceDialog
          open={ifcImportChoiceState.open}
          onOpenChange={open => {
            if (!open) {
              cancelIfcImport()
            }
          }}
          defaultProjectName={ifcImportChoiceState.defaultProjectName}
          onChoice={(choice, projectName) => void ifcImportChoiceState.handleConfirmChoice(choice, projectName)}
        />
      )}

      <ExportJsonDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        onExport={options => {
          performExport(options).catch((error: unknown) => {
            console.error('Export failed', error)
          })
        }}
        hasFloorPlans={getAllFloorPlans().length > 0}
      />
    </>
  )
}

interface SyncStatus {
  text: string
  active: boolean
  colorClass: string
}

interface JsonImportChoiceState {
  open: boolean
  defaultProjectName: string
  handleConfirmChoice: (choice: 'current' | 'new', projectName?: string) => Promise<void>
}
