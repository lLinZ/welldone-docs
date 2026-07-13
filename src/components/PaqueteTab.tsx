import { useState } from 'react'
import { activeDocs, type Expediente } from '../lib/expediente'
import type { DrylogData } from '../lib/drylog-types'
import { docStatus, type DocStates } from '../lib/paquete'
import { buildDocOutput } from '../lib/build-doc'
import { generateDrylogPdf } from '../lib/drylog-pdf'
import { downloadZip, safeName, zipStore, type ZipEntry } from '../lib/zip'

interface Props {
  exp: Expediente
  docStates: DocStates
  drylogClosing: DrylogData | null
}

export default function PaqueteTab({ exp, docStates, drylogClosing }: Props) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)

  const docs = activeDocs(exp)
  const rows = docs.map((d) => ({ def: d, status: docStatus(d, docStates, drylogClosing) }))
  const missing = rows.filter((r) => !r.status.ok).length
  const allOk = missing === 0

  const download = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const cli = exp.clientName ? ` ${safeName(exp.clientName)}` : ''
      const files: ZipEntry[] = []
      for (const d of docs) {
        if (d.id === 'drylog') {
          files.push({ name: `Dry Log inicial${cli}.pdf`, data: await buildDocOutput(docStates.drylog) })
          files.push({ name: `Dry Log closing${cli}.pdf`, data: await generateDrylogPdf(drylogClosing!) })
        } else {
          files.push({ name: `${d.name}${cli}.pdf`, data: await buildDocOutput(docStates[d.id]) })
        }
      }
      downloadZip(zipStore(files), `Expediente${cli || ' cliente'}.zip`)
      setMsg({ text: `Paquete descargado (${files.length} documentos).` })
    } catch (e) {
      console.error(e)
      setMsg({ text: 'No se pudo generar el paquete. Revisa que todos los documentos abran bien.', err: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="eyebrow">Paso final</span>
          <div className="card-title">Descargar expediente completo</div>
          <div className="card-sub">
            Genera un ZIP con todos los documentos ya editados. Se habilita cuando están todos completos.
          </div>
        </div>
      </div>

      <div className="checklist">
        {rows.map(({ def, status }) => (
          <div className={`check-item ${status.ok ? 'ok' : 'pending'}`} key={def.id}>
            <span className="ci-icon">{status.ok ? '✓' : '○'}</span>
            <span className="ci-name">{def.name}</span>
            <span className="ci-note">{status.note}</span>
          </div>
        ))}
      </div>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <button className="btn primary" disabled={!allOk || busy} onClick={download}>
          {busy ? 'Generando paquete…' : 'Descargar expediente (ZIP)'}
        </button>
        {!allOk && (
          <span className="msg err">
            Falta{missing > 1 ? 'n' : ''} {missing} documento{missing > 1 ? 's' : ''}
          </span>
        )}
        {msg && <span className={`msg ${msg.err ? 'err' : 'ok'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}
