// Estado de completitud de cada documento del expediente y del paquete completo.
import { activeDocs, type DocDef, type DocId, type Expediente } from './expediente'
import type { DocEditorState } from './doc-stamp'
import type { DrylogData } from './drylog-types'

export type DocStates = Record<DocId, DocEditorState>

export interface DocStatus {
  ok: boolean
  note: string
}

/** El closing del drylog está listo si al menos la lectura OUTSIDE tiene temp y humedad. */
export function closingReady(d: DrylogData | null): boolean {
  const o = d?.visits[0]?.outside
  return !!o && o.tempF.trim() !== '' && o.rh.trim() !== ''
}

export function docStatus(def: DocDef, docStates: DocStates, drylogClosing: DrylogData | null): DocStatus {
  const st = docStates[def.id]
  if (def.id === 'drylog') {
    if (!st.bytes) return { ok: false, note: 'Falta subir el drylog firmado' }
    if (!closingReady(drylogClosing)) return { ok: false, note: 'Falta generar el closing (temperaturas)' }
    return { ok: true, note: 'Firmado + closing listos' }
  }
  return st.bytes ? { ok: true, note: st.fileName || 'Listo' } : { ok: false, note: 'Falta subir el PDF' }
}

export function packageReady(exp: Expediente, docStates: DocStates, drylogClosing: DrylogData | null): boolean {
  return activeDocs(exp).every((d) => docStatus(d, docStates, drylogClosing).ok)
}
