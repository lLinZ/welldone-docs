// Genera un Dry Log de muestra fuera del navegador para inspección visual:
//   npx tsx scripts/test-pdfs.ts <outDir>
// Usa los casos GPP validados (85/77.5→141, 76.1/40.4→54).
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// El generador carga el logo con fetch(): en Node lo servimos desde disco.
const realFetch = globalThis.fetch
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url).endsWith('welldone_logo.png')) {
    return new Response(readFileSync(join(root, 'public', 'welldone_logo.png')))
  }
  return realFetch(url as never, init)
}) as typeof fetch

const { generateDrylogPdf } = await import('../src/lib/drylog-pdf')

const outDir = process.argv[2] ?? '.'

const drylog = await generateDrylogPdf({
  no: '',
  insuredName: 'Cliente Ejemplo',
  insuredDirection: '123 Test St, Miami, FL 33101',
  claimType: 'Kitchen',
  dateOfCommencement: '07/01/2026',
  visits: [
    {
      outside: { label: 'Initial', date: '07/01/2026', time: '10:27 am', tempF: '73.1', rh: '74.9' },
      affected: [{ area: 'Kitchen', date: '07/01/2026', time: '10:08 am', tempF: '70.7', rh: '82.1', moisture: '66.9' }],
      noAffected: [{ area: 'Hallway', date: '07/01/2026', time: '10:05 am', tempF: '72.2', rh: '54.9', dryStandard: '11.8' }],
      techSignature: null,
      insuredSignature: null,
    },
    {
      outside: { label: 'Closing', date: '07/06/2026', time: '4:46 PM', tempF: '85', rh: '77.5' },
      affected: [{ area: 'Kitchen', date: '07/06/2026', time: '4:59 PM', tempF: '76.1', rh: '40.4', moisture: '9.1' }],
      noAffected: [{ area: 'Hallway', date: '07/06/2026', time: '4:58 PM', tempF: '79.3', rh: '40.8', dryStandard: '8.3' }],
      techSignature: null,
      insuredSignature: null,
    },
  ],
})
writeFileSync(join(outDir, 'test-drylog.pdf'), drylog)
console.log('test-drylog.pdf listo')
