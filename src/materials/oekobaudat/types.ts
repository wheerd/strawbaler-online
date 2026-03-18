export interface OekobaudatSearchResult {
  uuid: string
  name: string
  category: string
  categoryPath: string
  owner: string
  subType: 'generic dataset' | 'specific dataset'
  detailUrl: string
}

export interface OekobaudatEnvironmentalData {
  primaryEnergy?: number
  embodiedCarbon?: number
  acidificationPotential?: number
}

export interface OekobaudatRawSearchResult {
  uuid: string
  name: string
  languages: string[]
  classific: string
  classificId: string
  owner: string
  subType: string
}

export interface OekobaudatRawSearchResponse {
  startIndex: number
  pageSize: number
  totalCount: number
  data: OekobaudatRawSearchResult[]
}
