// Genera el PDF de salida de un documento editado (aplanado + estampado),
// reutilizado por el editor y por el paquete del expediente.
import { stampPdf, type DocEditorState } from './doc-stamp'
import { flattenPdf } from './flatten'

export async function buildDocOutput(state: DocEditorState): Promise<Uint8Array> {
  if (!state.bytes) throw new Error('El documento no tiene PDF cargado.')
  const source = state.flatten ? await flattenPdf(state.bytes.slice()) : state.bytes.slice()
  return stampPdf(source, state.items)
}
