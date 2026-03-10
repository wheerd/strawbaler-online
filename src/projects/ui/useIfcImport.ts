import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useIsAuthenticated } from '@/app/user/store'
import { fitActiveStoreyToView } from '@/editor/canvas/helpers/fitActiveStoreyToView'
import { clearSelection } from '@/editor/canvas/state/selectionStore'
import { createProject } from '@/projects/services/CloudSyncManager'
import { FileInputCancelledError, createBinaryFileInput } from '@/shared/utils/createFileInput'

interface ImportChoiceState {
  open: boolean
  defaultProjectName: string
  handleConfirmChoice: (choice: 'current' | 'new', projectName?: string) => Promise<void>
}

export interface UseIfcImportResult {
  isImporting: boolean
  importChoiceState: ImportChoiceState | null
  handleIfcImport: () => Promise<void>
  cancelImport: () => void
}

export function useIfcImport(): UseIfcImportResult {
  const { t } = useTranslation('common')
  const isAuthenticated = useIsAuthenticated()
  const [isImporting, setIsImporting] = useState(false)
  const [importChoiceState, setImportChoiceState] = useState<ImportChoiceState | null>(null)

  const performIfcImport = useCallback(
    async (content: ArrayBuffer, choice: 'current' | 'new', projectName?: string) => {
      clearSelection()

      const { importIfcIntoModel } = await import('@/projects/import/ifc/importService')
      const result = await importIfcIntoModel(content)
      if (!result.success) {
        throw new Error(result.error ?? t($ => $.autoSave.errors.failedIFCImport))
      }

      if (choice === 'new') {
        await createProject({
          name: projectName ?? t($ => $.projectMenu.untitled),
          mode: 'copy'
        })
        toast.success(t($ => $.projectMenu.createSuccess))
      }

      fitActiveStoreyToView()
    },
    [t]
  )

  const handleIfcImport = useCallback(async () => {
    setIsImporting(true)

    try {
      await createBinaryFileInput(async (content: ArrayBuffer, file: File) => {
        const filename = file.name.replace(/\.[^.]+$/, '')

        if (isAuthenticated) {
          setImportChoiceState({
            open: true,
            defaultProjectName: filename,
            handleConfirmChoice: async (choice, newProjectName) => {
              setImportChoiceState(null)
              try {
                await performIfcImport(content, choice, newProjectName)
              } catch (error) {
                console.error('Error while importing', error)
                toast.error(t($ => $.autoSave.errors.failedIFCImport))
              } finally {
                setIsImporting(false)
              }
            }
          })
        } else {
          try {
            await performIfcImport(content, 'current')
          } catch (error) {
            console.error('Error while importing', error)
            toast.error(t($ => $.autoSave.errors.failedIFCImport))
          } finally {
            setIsImporting(false)
          }
        }
      }, '.ifc')
    } catch (error) {
      if (!(error instanceof FileInputCancelledError)) {
        console.error('Error while importing', error)
        toast.error(t($ => $.autoSave.errors.failedIFCImport))
      }
      setIsImporting(false)
    }
  }, [isAuthenticated, performIfcImport, t])

  const cancelImport = useCallback(() => {
    setImportChoiceState(null)
    setIsImporting(false)
  }, [])

  return {
    isImporting,
    importChoiceState,
    handleIfcImport,
    cancelImport
  }
}
