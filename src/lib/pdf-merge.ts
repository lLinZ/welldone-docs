// Une varios PDFs en uno solo (conserva el orden y todas las páginas).
import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const part of parts) {
    const src = await PDFDocument.load(part, { ignoreEncryption: true })
    const pages = await out.copyPages(src, src.getPageIndices())
    for (const pg of pages) out.addPage(pg)
  }
  return out.save()
}
