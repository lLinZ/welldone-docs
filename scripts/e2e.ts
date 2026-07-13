// Prueba E2E headless con el Edge del sistema: npx tsx scripts/e2e.ts <outDir> [dtpPath]
import { chromium } from 'playwright-core'

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = 'http://localhost:5173'
const outDir = process.argv[2] ?? '.'
const dtpPath = process.argv[3]

let failures = 0
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}
const navVisible = (page: import('playwright-core').Page, name: string) =>
  page.locator('.docnav-btn', { hasText: new RegExp(`^\\s*${name}\\b`) }).first().isVisible().catch(() => false)

const browser = await chromium.launch({ executablePath: EDGE, headless: true })
const page = await browser.newPage()
const consoleErrors: string[] = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text())
})
page.on('pageerror', (e) => consoleErrors.push(String(e)))

await page.goto(BASE, { waitUntil: 'networkidle' })
check('La app carga', (await page.locator('.brand-text h1').count()) === 1)

// ---------- Formulario del expediente ----------
await page.getByPlaceholder('Nombre y apellido').fill('Cliente De Prueba')
await page.getByPlaceholder('Calle, número, ciudad, estado, ZIP').fill('123 Test St, Miami, FL 33101')
await page.getByPlaceholder('Número de claim').fill('CLAIM-TEST-123')
await page.getByPlaceholder('Número de póliza').fill('POL-TEST')
await page.getByPlaceholder('MM/DD/AAAA').first().fill('01/02/2030') // open
await page.getByPlaceholder('MM/DD/AAAA').nth(1).fill('09/09/2030') // close
check('Chip de progreso "Datos" marcado', (await page.locator('.docnav-btn .chk.done').count()) >= 1)

// ---------- Tipos de pérdida ----------
check('Water Damage (full): DTP visible', await navVisible(page, 'DTP'))
check('Sin 2.º invoice por defecto', !(await navVisible(page, 'Invoice 2')))
await page.locator('label', { hasText: 'segundo invoice' }).locator('input').check()
check('Al marcar 2.º invoice aparece Invoice 2', await navVisible(page, 'Invoice 2'))
await page.locator('label', { hasText: 'segundo invoice' }).locator('input').uncheck()

await page.getByRole('button', { name: 'Mold' }).click()
check('Mold (light): DTP oculto', !(await navVisible(page, 'DTP')))
check('Mold (light): COC visible', await navVisible(page, 'COC'))
check('Mold (light): Invoice 1 visible', await navVisible(page, 'Invoice 1'))
await page.getByRole('button', { name: 'Water Damage' }).click()

// ---------- GPP ----------
await page.locator('.docnav-btn', { hasText: 'GPP' }).click()
await page.locator('#temp').fill('85')
await page.locator('#rh').fill('77.5')
check('GPP 85/77.5 → 141', (await page.locator('.readout .value').textContent())?.trim() === '141')

// ---------- DTP: auto-colocar + export ----------
if (dtpPath) {
  await page.locator('.docnav-btn', { hasText: /^\s*DTP\b/ }).first().click()
  await page.locator('input[type="file"]').setInputFiles(dtpPath)
  await page.waitForSelector('.pdf-stage canvas', { timeout: 20000 })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'Auto-colocar' }).click()
  const placed = await page.locator('.item-row').count()
  check('DTP: auto-colocó Claim # y fechas', placed >= 10, `${placed} items`)
  const flat = await page.locator('label', { hasText: 'Aplanar y garantizar' }).locator('input').isChecked()
  check('DTP: auto-colocar activó "Aplanar"', flat)
  const ovColor = await page.locator('.ov.text').first().evaluate((el) => getComputedStyle(el).color).catch(() => '')
  check('DTP: overlay de texto es negro', ovColor === 'rgb(17, 19, 24)', ovColor)

  const dl = page.waitForEvent('download', { timeout: 45000 })
  await page.getByRole('button', { name: /Descargar DTP/i }).click()
  const download = await dl
  await download.saveAs(`${outDir}/e2e-dtp.pdf`)
  check('DTP: PDF descargado', true, download.suggestedFilename())
}

// ---------- Drylog: generar closing ----------
await page.locator('.docnav-btn', { hasText: 'Dry Log' }).click()
await page.getByRole('button', { name: 'Generar closing' }).click()
const visit = page.locator('.card').filter({ hasText: 'Outside · exterior' }).first()
await visit.getByPlaceholder('85').first().fill('85')
await visit.getByPlaceholder('77.5').first().fill('77.5')
check('Drylog closing: GPP en vivo = 141', (await visit.locator('.gpp-pill').first().textContent())?.trim() === '141')
const dl2 = page.waitForEvent('download', { timeout: 30000 })
await page.getByRole('button', { name: 'Descargar Dry Log' }).click()
const d2 = await dl2
await d2.saveAs(`${outDir}/e2e-drylog-closing.pdf`)
check('Drylog closing: PDF descargado', true, d2.suggestedFilename())

// ---------- Persistencia entre pestañas ----------
await page.locator('.docnav-btn', { hasText: 'Datos del caso' }).click()
check('Persistencia: nombre sigue cargado', (await page.getByPlaceholder('Nombre y apellido').inputValue()) === 'Cliente De Prueba')

check('Sin errores de consola', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await browser.close()
console.log(failures === 0 ? '\nTODO OK' : `\n${failures} FALLAS`)
process.exit(failures === 0 ? 0 : 1)
