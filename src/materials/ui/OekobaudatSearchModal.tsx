import { ExternalLink, Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchOekobaudatEnvironmentalData, searchOekobaudat } from '@/materials/oekobaudat/service'
import type { OekobaudatEnvironmentalData, OekobaudatSearchResult } from '@/materials/oekobaudat/types'
import { Button } from '@/shared/ui/components/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/components/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/components/table'
import { TextField } from '@/shared/ui/components/text-field'

interface OekobaudatSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialName: string
  onSelect: (data: OekobaudatEnvironmentalData) => void
}

export function OekobaudatSearchModal({ open, onOpenChange, materialName, onSelect }: OekobaudatSearchModalProps) {
  const { t, i18n } = useTranslation('config')
  const lang = i18n.language === 'de' ? 'de' : 'en'
  const [query, setQuery] = useState(materialName)
  const [results, setResults] = useState<OekobaudatSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importingUuid, setImportingUuid] = useState<string | null>(null)

  useEffect(() => {
    setQuery(materialName)
  }, [materialName])

  useEffect(() => {
    if (open && query) {
      void handleSearch()
    }
  }, [open])

  async function handleSearch() {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setResults([])

    try {
      const searchResults = await searchOekobaudat(query, lang)
      setResults(searchResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleImport(result: OekobaudatSearchResult) {
    setImportingUuid(result.uuid)
    try {
      const data = await fetchOekobaudatEnvironmentalData(result.uuid)
      onSelect(data)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImportingUuid(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSearch()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t($ => $.oekobaudat.title)}</DialogTitle>
          <DialogDescription>{t($ => $.oekobaudat.description)}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <TextField.Root
            value={query}
            onChange={e => {
              setQuery(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            placeholder={t($ => $.oekobaudat.searchPlaceholder)}
            className="flex-1"
          />
          <Button
            onClick={() => {
              void handleSearch()
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {error && <div className="text-destructive bg-destructive/10 rounded p-2 text-sm">{error}</div>}

        <div className="flex-1 overflow-auto">
          {!isLoading &&
            (results.length > 0 ? (
              <Table size="sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t($ => $.oekobaudat.name)}</TableHead>
                    <TableHead>{t($ => $.oekobaudat.category)}</TableHead>
                    <TableHead>{t($ => $.oekobaudat.type)}</TableHead>
                    <TableHead justify="end">{t($ => $.oekobaudat.actions)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(result => (
                    <TableRow key={result.uuid}>
                      <TableCell className="max-w-[200px] truncate" title={result.name}>
                        {result.name}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={result.category}>
                        {result.category}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            result.subType === 'generic dataset'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {result.subType === 'generic dataset'
                            ? t($ => $.oekobaudat.generic)
                            : t($ => $.oekobaudat.specific)}
                        </span>
                      </TableCell>
                      <TableCell justify="end">
                        <div className="flex justify-end gap-1">
                          <Button size="icon-sm" variant="ghost" asChild title={t($ => $.oekobaudat.viewDetails)}>
                            <a href={result.detailUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleImport(result)}
                            disabled={importingUuid === result.uuid}
                          >
                            {importingUuid === result.uuid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              t($ => $.oekobaudat.import)
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              !error && <div className="text-muted-foreground py-8 text-center">{t($ => $.oekobaudat.noResults)}</div>
            ))}

          {isLoading && (
            <div className="flex justify-center p-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
