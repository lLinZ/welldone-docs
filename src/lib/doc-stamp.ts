// Estampa items (texto negro o rectángulos blancos) sobre cualquier PDF subido.
// Todo en coordenadas de puntos PDF con origen arriba-izquierda.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { toWinAnsi } from './pdf-text'

const BLACK = rgb(0, 0, 0)
const WHITE = rgb(1, 1, 1)

export type ItemKind = 'text' | 'erase'

export interface StampItem {
  id: number
  page: number // índice 0-based
  x: number
  top: number
  kind: ItemKind
  text: string // solo 'text'
  size: number // solo 'text'
  whiteOut: boolean // 'text': tapa el dato de abajo antes de escribir
  w: number // 'erase' (y ancho del tapado del texto si whiteOut)
  h: number // 'erase'
}

export function newTextItem(page: number, x: number, top: number, text: string, whiteOut: boolean): StampItem {
  return { id: 0, page, x, top, kind: 'text', text, size: 11, whiteOut, w: 0, h: 0 }
}

export function newEraseItem(page: number, x: number, top: number): StampItem {
  return { id: 0, page, x, top, kind: 'erase', text: '', size: 11, whiteOut: false, w: 120, h: 20 }
}

export async function stampPdf(bytes: Uint8Array, items: StampItem[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  for (const item of items) {
    const page = pages[item.page]
    if (!page) continue
    const H = page.getHeight()

    if (item.kind === 'erase') {
      page.drawRectangle({
        x: item.x,
        y: H - item.top - item.h,
        width: item.w,
        height: item.h,
        color: WHITE,
      })
      continue
    }

    if (!item.text) continue
    const safe = toWinAnsi(item.text)
    if (item.whiteOut) {
      const w = font.widthOfTextAtSize(safe, item.size)
      page.drawRectangle({
        x: item.x - 2,
        y: H - item.top - item.size * 1.28,
        width: w + 6,
        height: item.size * 1.55,
        color: WHITE,
      })
    }
    page.drawText(safe, {
      x: item.x,
      y: H - item.top - item.size * 0.82,
      size: item.size,
      font,
      color: BLACK,
    })
  }

  return doc.save()
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
