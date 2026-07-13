export interface OutsideRow {
  label: string // Initial, Day 2, Closing…
  date: string
  time: string
  tempF: string
  rh: string
}

export interface AffectedRow {
  area: string
  date: string
  time: string
  tempF: string
  rh: string
  moisture: string
}

export interface NoAffectedRow {
  area: string
  date: string
  time: string
  tempF: string
  rh: string
  dryStandard: string
}

export interface Visit {
  outside: OutsideRow
  affected: AffectedRow[]
  noAffected: NoAffectedRow[]
  techSignature: string | null // dataURL PNG
  insuredSignature: string | null
}

export interface DrylogData {
  no: string
  insuredName: string
  insuredDirection: string
  claimType: string
  dateOfCommencement: string
  visits: Visit[]
}

export function emptyAffectedRow(): AffectedRow {
  return { area: '', date: '', time: '', tempF: '', rh: '', moisture: '' }
}

export function emptyNoAffectedRow(): NoAffectedRow {
  return { area: '', date: '', time: '', tempF: '', rh: '', dryStandard: '' }
}

export function emptyVisit(label: string): Visit {
  return {
    outside: { label, date: '', time: '', tempF: '', rh: '' },
    affected: [emptyAffectedRow()],
    noAffected: [emptyNoAffectedRow()],
    techSignature: null,
    insuredSignature: null,
  }
}
