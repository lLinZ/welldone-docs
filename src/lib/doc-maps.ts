// Posiciones EXACTAS de los campos dinámicos (Claim # y fecha open/close) en los
// documentos firmados de Well Done. Medidas de las anotaciones reales de PDFs de
// ejemplo (612x792, origen arriba-izquierda). Con esto el auto-colocar cae justo
// sobre el dato viejo y, con "Aplanar" activo, lo tapa perfecto.
import type { StampItem } from './doc-stamp'
import { DOCS, docDate, type DocId, type Expediente } from './expediente'

interface FieldSlot {
  page: number
  x: number
  top: number
  w: number
  h: number
  field: 'claim' | 'date'
}

const MAPS: Partial<Record<DocId, FieldSlot[]>> = {
  dtp: [
    { page: 0, x: 486.6, top: 45.0, w: 97.8, h: 18.1, field: 'claim' },
    { page: 0, x: 353.4, top: 351.6, w: 136.8, h: 18.1, field: 'claim' },
    { page: 1, x: 487.8, top: 45.6, w: 103.8, h: 18.1, field: 'claim' },
    { page: 2, x: 487.2, top: 43.8, w: 117.6, h: 18.1, field: 'claim' },
    { page: 3, x: 486.6, top: 44.4, w: 109.8, h: 18.1, field: 'claim' },
    { page: 4, x: 486.0, top: 43.8, w: 94.2, h: 18.1, field: 'claim' },
    { page: 5, x: 486.0, top: 43.2, w: 102.6, h: 18.1, field: 'claim' },
    { page: 0, x: 480.0, top: 159.0, w: 79.8, h: 18.1, field: 'date' },
    { page: 0, x: 427.2, top: 313.8, w: 80.0, h: 18.1, field: 'date' },
    { page: 5, x: 403.2, top: 291.6, w: 79.8, h: 18.1, field: 'date' },
    { page: 5, x: 403.8, top: 447.0, w: 79.8, h: 18.1, field: 'date' },
  ],
  lop: [
    { page: 0, x: 486.0, top: 44.2, w: 101.2, h: 18.1, field: 'claim' },
    { page: 0, x: 354.8, top: 351.8, w: 100.5, h: 18.1, field: 'claim' },
    { page: 1, x: 494.2, top: 44.2, w: 100.5, h: 18.1, field: 'claim' },
    { page: 2, x: 487.5, top: 44.2, w: 93.0, h: 18.1, field: 'claim' },
    { page: 3, x: 489.8, top: 45.0, w: 88.5, h: 18.1, field: 'claim' },
    { page: 0, x: 480.0, top: 162.8, w: 80.0, h: 18.1, field: 'date' },
    { page: 0, x: 432.0, top: 315.0, w: 79.5, h: 18.1, field: 'date' },
    { page: 2, x: 405.8, top: 349.5, w: 80.0, h: 18.1, field: 'date' },
    { page: 2, x: 403.5, top: 510.8, w: 79.5, h: 18.1, field: 'date' },
  ],
  affidavit: [
    { page: 0, x: 361.8, top: 294.6, w: 132.6, h: 18.1, field: 'claim' },
    { page: 0, x: 444.6, top: 154.8, w: 80.0, h: 18.1, field: 'date' },
    { page: 2, x: 408.0, top: 388.8, w: 80.0, h: 18.1, field: 'date' },
    { page: 2, x: 402.0, top: 570.6, w: 79.8, h: 18.1, field: 'date' },
  ],
  coc: [
    { page: 0, x: 408.9, top: 199.4, w: 80.0, h: 15.8, field: 'claim' },
    { page: 0, x: 505.5, top: 25.2, w: 80.0, h: 15.8, field: 'claim' },
  ],
  invoice1: [{ page: 0, x: 47.0, top: 225.5, w: 80.0, h: 11.2, field: 'claim' }],
  invoice2: [{ page: 0, x: 47.0, top: 225.5, w: 80.0, h: 11.2, field: 'claim' }],
}

export function hasAutoPlace(docId: DocId): boolean {
  return !!MAPS[docId]
}

export function autoPlaceFor(docId: DocId, exp: Expediente): StampItem[] {
  const slots = MAPS[docId]
  if (!slots) return []
  const def = DOCS.find((d) => d.id === docId)!
  const items: StampItem[] = []

  for (const s of slots) {
    const value = s.field === 'claim' ? exp.claimNumber : docDate(exp, def)
    if (!value) continue
    const size = Math.max(7, Math.round(s.h * 0.66))
    // Borra el valor viejo (rectángulo exacto de la anotación)…
    items.push({ id: 0, page: s.page, x: s.x - 1, top: s.top - 1, kind: 'erase', text: '', size, whiteOut: false, w: s.w + 3, h: s.h + 2 })
    // …y escribe el nuevo encima, en negro.
    items.push({ id: 0, page: s.page, x: s.x + 1, top: s.top + 2, kind: 'text', text: value, size, whiteOut: false, w: 0, h: 0 })
  }
  return items
}
