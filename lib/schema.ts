export type MemoryType =
  | 'origin'
  | 'family'
  | 'childhood'
  | 'education'
  | 'work'
  | 'present'
  | 'transition'
  | 'visit'

export interface Period {
  start: string // ISO date (YYYY-MM-DD)
  end?: string // ISO date; undefined = ongoing or instantaneous
}

export interface MemoryDocument {
  type: 'photo' | 'document' | 'letter' | 'receipt'
  content: string
  date: string // ISO
  sentiment?: number // -1..+1
  language?: 'zh' | 'en' | 'mixed'
}

export interface MemoryLocation {
  id: string
  name: string
  nameCn?: string
  period?: Period // supports ranges and half-year stays
  year?: number // optional anchor if you want a single year
  type: MemoryType

  // RAW DATA SIGNALS
  intensity: number // 0..1
  valence: number // -1..+1 (negative..positive)
  languageBalance: number // -1..+1 (zh..en)
  significance: number // 0..1
  duration?: number // years (approx)
  isVisit?: boolean // true if not a residence

  color: string // palette seed
  notes?: string
  memories?: MemoryDocument[]
}

export interface MemoryConnection {
  from: string
  to: string
  year?: number // optional; period midpoint inferred if missing
  weight?: number // 0..1
}

export interface JourneyData {
  locations: MemoryLocation[]
  connections: MemoryConnection[]
}
