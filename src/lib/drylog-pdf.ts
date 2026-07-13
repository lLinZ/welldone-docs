// Genera el PDF del Dry Log replicando el formato de Well Done Mitigation.
// Página carta (612 x 792 pt), una página por visita; si una visita tiene muchas
// filas, las tablas continúan en páginas adicionales y las firmas van al final.
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import type { DrylogData } from './drylog-types'
import { gppDisplay } from './psychro'
import { toWinAnsi } from './pdf-text'

const NAVY = rgb(57 / 255, 71 / 255, 117 / 255)
const BLACK = rgb(0, 0, 0)
const WHITE = rgb(1, 1, 1)

const PAGE_W = 612
const PAGE_H = 792
const ROW_H = 22
const HEADER_H = 16
// Última coordenada `top` utilizable por tablas; deja lugar para las firmas al final.
const TABLE_LIMIT = 630

// Coordenadas con origen arriba-izquierda (como el diseño original); se convierten al dibujar.
const y = (top: number) => PAGE_H - top

interface Ctx {
  page: PDFPage
  font: PDFFont
  bold: PDFFont
}

function drawText(
  ctx: Ctx,
  text: string,
  x: number,
  top: number,
  size: number,
  opts?: { bold?: boolean; color?: ReturnType<typeof rgb>; centerIn?: [number, number] },
) {
  if (!text) return
  const safe = toWinAnsi(text)
  const font = opts?.bold ? ctx.bold : ctx.font
  let drawX = x
  if (opts?.centerIn) {
    const [x0, x1] = opts.centerIn
    const w = font.widthOfTextAtSize(safe, size)
    drawX = x0 + (x1 - x0 - w) / 2
  }
  ctx.page.drawText(safe, {
    x: drawX,
    y: y(top) - size * 0.78,
    size,
    font,
    color: opts?.color ?? BLACK,
  })
}

/** Dibuja el encabezado azul y las filas dadas. Devuelve el `top` final. */
function drawTable(ctx: Ctx, top: number, colEdges: number[], headers: string[], rows: string[][]): number {
  const left = colEdges[0]
  const right = colEdges[colEdges.length - 1]

  ctx.page.drawRectangle({
    x: left,
    y: y(top + HEADER_H),
    width: right - left,
    height: HEADER_H,
    color: NAVY,
  })
  headers.forEach((h, i) => {
    drawText(ctx, h, 0, top + 3.5, 9, { bold: true, color: WHITE, centerIn: [colEdges[i], colEdges[i + 1]] })
  })

  for (let r = 0; r < rows.length; r++) {
    const rowTop = top + HEADER_H + r * ROW_H
    ctx.page.drawLine({
      start: { x: left, y: y(rowTop + ROW_H) },
      end: { x: right, y: y(rowTop + ROW_H) },
      thickness: 0.7,
      color: BLACK,
    })
    for (const cx of colEdges) {
      ctx.page.drawLine({
        start: { x: cx, y: y(rowTop) },
        end: { x: cx, y: y(rowTop + ROW_H) },
        thickness: 0.7,
        color: BLACK,
      })
    }
    rows[r].forEach((cell, i) => {
      drawText(ctx, cell, 0, rowTop + 5, 11, { centerIn: [colEdges[i], colEdges[i + 1]] })
    })
  }
  return top + HEADER_H + rows.length * ROW_H
}

async function dataUrlToImage(doc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const base64 = dataUrl.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return doc.embedPng(bytes)
}

function drawPageHeader(ctx: Ctx, data: DrylogData, logo: PDFImage) {
  const { page } = ctx
  const logoW = 178
  const logoH = (logo.height / logo.width) * logoW
  page.drawImage(logo, { x: 27, y: y(27) - logoH, width: logoW, height: logoH })
  drawText(ctx, 'Dry Log', 275, 40, 22)
  drawText(ctx, 'No.', 425, 28, 11, { bold: true })
  drawText(ctx, data.no, 448, 28, 11)

  const boxTop = 84
  const boxBottom = 172
  const boxLeft = 18.5
  const boxRight = 593.5
  const midX = 456
  const midY = (boxTop + boxBottom) / 2
  page.drawRectangle({
    x: boxLeft,
    y: y(boxBottom),
    width: boxRight - boxLeft,
    height: boxBottom - boxTop,
    borderColor: BLACK,
    borderWidth: 1,
  })
  page.drawLine({ start: { x: boxLeft, y: y(midY) }, end: { x: boxRight, y: y(midY) }, thickness: 1, color: BLACK })
  page.drawLine({ start: { x: midX, y: y(boxTop) }, end: { x: midX, y: y(boxBottom) }, thickness: 1, color: BLACK })

  drawText(ctx, "Insured's Name", 27.5, 91, 10, { bold: true })
  drawText(ctx, data.insuredName, 27.5, 110, 11)
  drawText(ctx, 'Date of Commencement', 462, 91, 10, { bold: true })
  drawText(ctx, data.dateOfCommencement, 462, 105, 19)
  drawText(ctx, "Insured's Direction", 27.5, 135, 10, { bold: true })
  drawText(ctx, data.insuredDirection, 27.5, 154, 11)
  drawText(ctx, 'Claim Type', 462, 135, 10, { bold: true })
  drawText(ctx, data.claimType, 462, 154, 11)
}

const OUTSIDE_COLS = [24, 159, 245, 327, 411, 493, 584]
const AFFECTED_COLS = [24, 156, 227, 292, 362, 426, 492, 584]

export async function generateDrylogPdf(data: DrylogData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'
  const logoRes = await fetch(`${base}welldone_logo.png`)
  const logo = await doc.embedPng(await logoRes.arrayBuffer())

  for (const visit of data.visits) {
    let ctx: Ctx = { page: doc.addPage([PAGE_W, PAGE_H]), font, bold }
    drawPageHeader(ctx, data, logo)
    let cursor = 194

    const newPage = () => {
      ctx = { page: doc.addPage([PAGE_W, PAGE_H]), font, bold }
      drawPageHeader(ctx, data, logo)
      cursor = 194
    }

    /** Dibuja una sección, partiéndola en varias páginas si las filas no caben. */
    const drawSection = (label: string, colEdges: number[], headers: string[], rows: string[][], minRows = 1) => {
      let pending = [...rows]
      while (pending.length < minRows) pending.push(headers.map(() => ''))
      let first = true
      while (pending.length > 0 || first) {
        // ¿Cuántas filas caben en esta página? (rótulo 16 + encabezado 16)
        let capacity = Math.floor((TABLE_LIMIT - (cursor + 16 + HEADER_H)) / ROW_H)
        if (capacity < 1) {
          newPage()
          capacity = Math.floor((TABLE_LIMIT - (cursor + 16 + HEADER_H)) / ROW_H)
        }
        const chunk = pending.splice(0, capacity)
        drawText(ctx, first ? label : `${label} (cont.)`, 24, cursor, 13, { bold: true })
        cursor = drawTable(ctx, cursor + 16, colEdges, headers, chunk) + 26
        first = false
        if (pending.length === 0) break
      }
    }

    const o = visit.outside
    drawSection(
      'OUTSIDE',
      OUTSIDE_COLS,
      ['Area / Room', 'Date', 'Time', 'Temp. °F', 'RH %', 'G.P.P'],
      [[o.label, o.date, o.time, o.tempF, o.rh, gppDisplay(o.tempF, o.rh)]],
    )

    drawSection(
      'AFFECTED AREA',
      AFFECTED_COLS,
      ['Area / Room', 'Date', 'Time', 'Temp. °F', 'RH %', 'G.P.P', 'Moisture Reading'],
      visit.affected.map((a) => [a.area, a.date, a.time, a.tempF, a.rh, gppDisplay(a.tempF, a.rh), a.moisture]),
      5,
    )

    drawSection(
      'NO AFFECTED AREA',
      OUTSIDE_COLS,
      ['Area / Room', 'Date', 'Time', 'Temp. °F', 'RH %', 'Dry Standard'],
      visit.noAffected.map((n) => [n.area, n.date, n.time, n.tempF, n.rh, n.dryStandard]),
    )

    // ---- Firmas (siempre en la última página de la visita) ----
    const sigTop = cursor + 14
    drawText(ctx, 'Technician Signature', 0, sigTop, 11, { centerIn: [120, 320] })
    drawText(ctx, 'Insured Signature', 0, sigTop, 11, { centerIn: [360, 560] })
    const sigH = 55
    if (visit.techSignature) {
      const img = await dataUrlToImage(doc, visit.techSignature)
      const w = (img.width / img.height) * sigH
      ctx.page.drawImage(img, { x: 220 - w / 2, y: y(sigTop + 18 + sigH), width: w, height: sigH })
    }
    if (visit.insuredSignature) {
      const img = await dataUrlToImage(doc, visit.insuredSignature)
      const w = (img.width / img.height) * sigH
      ctx.page.drawImage(img, { x: 460 - w / 2, y: y(sigTop + 18 + sigH), width: w, height: sigH })
    }
  }

  return doc.save()
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
