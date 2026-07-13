// Aplana un PDF: rasteriza cada página (incluyendo la capa de anotaciones con
// los datos ya firmados) y reconstruye el PDF con esas imágenes. Así, al estampar
// encima, el cuadro blanco SIEMPRE tapa el dato de abajo — ningún visor lo dibuja
// por encima porque ya no es una anotación, es parte de la imagen de la página.
// Contra: el PDF resultante deja de tener texto seleccionable.
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const RASTER_SCALE = 2.5 // resolución del rasterizado

export async function flattenPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const src = await pdfjsLib.getDocument({ data: bytes.slice() }).promise
  const out = await PDFDocument.create()

  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i)
    const ptView = page.getViewport({ scale: 1 }) // dimensiones en puntos PDF
    const pxView = page.getViewport({ scale: RASTER_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(pxView.width)
    canvas.height = Math.ceil(pxView.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // annotationMode por defecto (ENABLE) dibuja las anotaciones sobre el canvas.
    await page.render({ canvasContext: ctx, viewport: pxView }).promise

    const png = await out.embedPng(canvas.toDataURL('image/png'))
    const p = out.addPage([ptView.width, ptView.height])
    p.drawImage(png, { x: 0, y: 0, width: ptView.width, height: ptView.height })
  }

  return out.save()
}
