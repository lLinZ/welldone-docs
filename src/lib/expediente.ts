// Modelo del expediente: datos globales + definición de los documentos que lo componen.

export type LossType = 'water' | 'roof' | 'mold' | 'inspection' | 'sw'

export interface LossTypeDef {
  id: LossType
  label: string
  kind: 'full' | 'light' // full = paquete completo; light = solo Invoice + COC
}

// Provisional (a confirmar con el usuario): Water Damage y Roof piden el paquete
// completo; Mold, Inspection y SW solo Invoice + COC (las fotos van por fuera).
export const LOSS_TYPES: LossTypeDef[] = [
  { id: 'water', label: 'Water Damage', kind: 'full' },
  { id: 'roof', label: 'Roof', kind: 'full' },
  { id: 'mold', label: 'Mold', kind: 'light' },
  { id: 'inspection', label: 'Inspection', kind: 'light' },
  { id: 'sw', label: 'SW', kind: 'light' },
]

export interface Expediente {
  clientName: string
  address: string
  claimNumber: string
  policyNumber: string
  openDate: string // fecha del "open"
  closeDate: string // fecha del "close"
  lossType: LossType
  secondInvoice: boolean // el expediente lleva un 2.º invoice
}

export function emptyExpediente(): Expediente {
  return {
    clientName: '',
    address: '',
    claimNumber: '',
    policyNumber: '',
    openDate: '',
    closeDate: '',
    lossType: 'water',
    secondInvoice: false,
  }
}

export type DocId = 'dtp' | 'lop' | 'affidavit' | 'drylog' | 'coc' | 'invoice1' | 'invoice2'

export interface DocDef {
  id: DocId
  name: string
  /** Qué fecha del expediente se usa por defecto en este documento. */
  dateSource: 'open' | 'close'
  hint?: string
}

export const DOCS: DocDef[] = [
  { id: 'dtp', name: 'DTP', dateSource: 'open', hint: 'Contrato de asignación firmado por el cliente.' },
  { id: 'lop', name: 'LOP', dateSource: 'open', hint: 'Letter of Protection.' },
  { id: 'affidavit', name: 'Affidavit', dateSource: 'open' },
  { id: 'drylog', name: 'Dry Log', dateSource: 'open', hint: 'Subes el drylog inicial firmado; el closing se genera.' },
  { id: 'coc', name: 'COC', dateSource: 'close', hint: 'Certificate of Completion.' },
  { id: 'invoice1', name: 'Invoice 1', dateSource: 'close' },
  { id: 'invoice2', name: 'Invoice 2', dateSource: 'close', hint: 'Segundo invoice del expediente.' },
]

export function lossTypeDef(exp: Expediente): LossTypeDef {
  return LOSS_TYPES.find((t) => t.id === exp.lossType) ?? LOSS_TYPES[0]
}

/** Documentos activos según el tipo de pérdida y si lleva 2.º invoice. */
export function activeDocs(exp: Expediente): DocDef[] {
  const base: DocId[] =
    lossTypeDef(exp).kind === 'full'
      ? ['dtp', 'lop', 'affidavit', 'drylog', 'coc', 'invoice1']
      : ['coc', 'invoice1']
  if (exp.secondInvoice) base.push('invoice2')
  return DOCS.filter((d) => base.includes(d.id))
}

export function docDate(exp: Expediente, def: DocDef): string {
  return def.dateSource === 'open' ? exp.openDate : exp.closeDate
}

/** Campos comunes que se pueden estampar en cualquier documento. */
export interface CommonField {
  key: string
  label: string
  value: string
}

export function commonFields(exp: Expediente, def: DocDef): CommonField[] {
  return [
    { key: 'clientName', label: 'Nombre', value: exp.clientName },
    { key: 'address', label: 'Dirección', value: exp.address },
    { key: 'claimNumber', label: 'Claim #', value: exp.claimNumber },
    { key: 'policyNumber', label: 'Policy #', value: exp.policyNumber },
    { key: 'date', label: def.dateSource === 'open' ? 'Fecha (open)' : 'Fecha (close)', value: docDate(exp, def) },
  ]
}
