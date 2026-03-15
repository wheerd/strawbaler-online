import type {
  OekobaudatEnvironmentalData,
  OekobaudatRawSearchResponse,
  OekobaudatRawSearchResult,
  OekobaudatSearchResult
} from './types'

export const OEKOBAUDAT_ENABLED = !!import.meta.env.VITE_OEKOBAUDAT_API_URL

const API_BASE = import.meta.env.VITE_OEKOBAUDAT_API_URL ?? ''
const DATA_STOCK = 'cd2bda71-760b-4fcc-8a0b-3877c10000a8'
const OEKOBAUDAT_WEB_BASE = 'https://oekobaudat.de/OEKOBAU.DAT'

export function getOekobaudatDetailUrl(uuid: string, lang = 'en'): string {
  return `${OEKOBAUDAT_WEB_BASE}/datasetdetail/process.xhtml?uuid=${uuid}&lang=${lang}`
}

export async function searchOekobaudat(query: string, lang = 'en'): Promise<OekobaudatSearchResult[]> {
  const url = `${API_BASE}/resource/datastocks/${DATA_STOCK}/processes?search=true&name=${encodeURIComponent(query)}&format=json&lang=${lang}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`)
  }

  const data = (await response.json()) as OekobaudatRawSearchResponse

  return data.data.map(result => transformSearchResult(result, lang))
}

function transformSearchResult(raw: OekobaudatRawSearchResult, lang: string): OekobaudatSearchResult {
  return {
    uuid: raw.uuid,
    name: raw.name,
    category: raw.classific,
    categoryPath: raw.classific,
    owner: raw.owner,
    subType: raw.subType as 'generic dataset' | 'specific dataset',
    detailUrl: getOekobaudatDetailUrl(raw.uuid, lang)
  }
}

export async function fetchOekobaudatEnvironmentalData(uuid: string): Promise<OekobaudatEnvironmentalData> {
  const url = `${API_BASE}/resource/datastocks/${DATA_STOCK}/processes/${uuid}?format=json`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.status}`)
  }

  const data = (await response.json()) as OekobaudatDetailResponse

  return extractEnvironmentalData(data)
}

interface LCIAResult {
  LCIMethodAndAssignments?: {
    LCIMethodAssignment: {
      reportedAs: string
      common: string
    }[]
  }
  meanAmount: number
  other?: {
    anies: {
      module: string
      value: string
    }[]
  }
}

interface Exchange {
  referenceToFlowDataSet?: {
    shortDescription: { value: string; lang: string }[]
  }
  other?: {
    anies: {
      module: string
      value: string
    }[]
  }
}

interface OekobaudatDetailResponse {
  processInformation?: {
    dataSetInformation?: {
      UUID: string
      name?: {
        baseName: { value: string; lang: string }[]
      }
    }
  }
  exchanges?: {
    exchange: Exchange[]
  }
  LCIAResults?: {
    LCIAResult: LCIAResult[]
  }
}

function extractEnvironmentalData(data: OekobaudatDetailResponse): OekobaudatEnvironmentalData {
  const result: OekobaudatEnvironmentalData = {}

  if (data.LCIAResults?.LCIAResult) {
    for (const lciaResult of data.LCIAResults.LCIAResult) {
      if (!lciaResult.LCIMethodAndAssignments) continue
      const methodAssignments = lciaResult.LCIMethodAndAssignments.LCIMethodAssignment
      const methodName =
        methodAssignments.find(a => a.common === 'http://www.ilcd-network.org/resources/ilcd')?.reportedAs ?? ''

      const a1a3ValueStr = lciaResult.other?.anies.find(a => a.module === 'A1-A3')?.value
      if (a1a3ValueStr === undefined) continue
      const a1a3Value = parseFloat(a1a3ValueStr)
      if (isNaN(a1a3Value)) continue
      if (methodName.toLowerCase().includes('gwp') || methodName.toLowerCase().includes('global warming')) {
        result.embodiedCarbon = a1a3Value
      } else if (methodName.toLowerCase().includes('acidification') || methodName.toLowerCase().includes('acid')) {
        result.acidificationPotential = a1a3Value
      }
    }
  }

  if (data.exchanges?.exchange) {
    for (const exchange of data.exchanges.exchange) {
      const flowName =
        exchange.referenceToFlowDataSet?.shortDescription.find(d => d.lang === 'en')?.value ??
        exchange.referenceToFlowDataSet?.shortDescription[0]?.value

      if (flowName?.toLowerCase().includes('penrt')) {
        const a1a3ValueStr = exchange.other?.anies.find(a => a.module === 'A1-A3')?.value
        if (a1a3ValueStr) {
          const a1a3Value = parseFloat(a1a3ValueStr)
          if (!isNaN(a1a3Value)) {
            result.primaryEnergy = a1a3Value
          }
        }
      }
    }
  }

  return result
}
