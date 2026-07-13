// Estado de completitud de cada documento del expediente y del paquete completo.
import { activeDocs, lossTypeDef, type DocDef, type DocId, type Expediente } from './expediente'
import type { DocEditorState } from './doc-stamp'
import type { DrylogData } from './drylog-types'
import { safeName } from './zip'

export type DocStates = Record<DocId, DocEditorState>

/** Nombre de archivo: "Documento Cliente Servicio.pdf" (ej. "DTP Jose Linares Roof.pdf"). */
export function docFileName(docName: string, exp: Expediente): string {
  const parts = [docName, exp.clientName.trim(), lossTypeDef(exp).label].filter((s) => s !== '')
  return `${safeName(parts.join(' '))}.pdf`
}

/** Nombre del ZIP del expediente: "Expediente Cliente Servicio.zip". */
export function expedienteZipName(exp: Expediente): string {
  const parts = ['Expediente', exp.clientName.trim(), lossTypeDef(exp).label].filter((s) => s !== '')
  return `${safeName(parts.join(' '))}.zip`
}

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
