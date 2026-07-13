import { useEffect, useState } from 'react'
import {
  emptyAffectedRow,
  emptyNoAffectedRow,
  emptyVisit,
  type AffectedRow,
  type DrylogData,
  type NoAffectedRow,
  type Visit,
} from '../lib/drylog-types'
import { generateDrylogPdf, downloadPdf } from '../lib/drylog-pdf'
import { gppDisplay } from '../lib/psychro'
import SignaturePad from './SignaturePad'

export interface DrylogSeed {
  no?: string
  insuredName: string
  insuredDirection: string
  claimType: string
  dateOfCommencement: string
  readingDate: string
  firstLabel: string // "Initial" o "Closing"
}

export default function DrylogTab({ seed, onData }: { seed?: DrylogSeed; onData?: (d: DrylogData) => void }) {
  const [data, setData] = useState<DrylogData>(() => {
    const v = emptyVisit(seed?.firstLabel ?? 'Initial')
    if (seed) {
      v.outside.date = seed.readingDate
      v.affected[0].date = seed.readingDate
      v.noAffected[0].date = seed.readingDate
    }
    return {
      no: seed?.no ?? '',
      insuredName: seed?.insuredName ?? '',
      insuredDirection: seed?.insuredDirection ?? '',
      claimType: seed?.claimType ?? '',
      dateOfCommencement: seed?.dateOfCommencement ?? '',
      visits: [v],
    }
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)

  // Reporta los datos hacia arriba para que el paquete del expediente pueda
  // generar este drylog aunque estés en otra pestaña.
  useEffect(() => {
    onData?.(data)
  }, [data, onData])

  const set = (patch: Partial<DrylogData>) => setData((d) => ({ ...d, ...patch }))
  const setVisit = (i: number, patch: Partial<Visit>) =>
    setData((d) => ({ ...d, visits: d.visits.map((v, j) => (j === i ? { ...v, ...patch } : v)) }))

  const addVisit = () => {
    const n = data.visits.length
    setData((d) => ({ ...d, visits: [...d.visits, emptyVisit(n === 0 ? 'Initial' : `Day ${n + 1}`)] }))
  }
  const removeVisit = (i: number) => setData((d) => ({ ...d, visits: d.visits.filter((_, j) => j !== i) }))

  const generate = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const bytes = await generateDrylogPdf(data)
      const name = data.insuredName ? data.insuredName.replace(/\s+/g, ' ').trim() : 'drylog'
      downloadPdf(bytes, `Drylog ${name}.pdf`)
      setMsg({ text: 'Dry Log generado y descargado' })
    } catch (e) {
      console.error(e)
      setMsg({ text: 'No se pudo generar el PDF.', err: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">Encabezado</span>
            <div className="card-title">Datos del Dry Log</div>
            <div className="card-sub">El GPP se calcula solo a partir de temperatura y humedad.</div>
          </div>
        </div>
        <div className="grid cols-3">
          <div className="field">
            <label>No. <span className="sub">(opcional)</span></label>
            <input value={data.no} onChange={(e) => set({ no: e.target.value })} placeholder="—" />
          </div>
          <div className="field">
            <label>Nombre del asegurado</label>
            <input value={data.insuredName} onChange={(e) => set({ insuredName: e.target.value })} placeholder="Nombre del asegurado" />
          </div>
          <div className="field">
            <label>Fecha de inicio (commencement)</label>
            <input value={data.dateOfCommencement} onChange={(e) => set({ dateOfCommencement: e.target.value })} placeholder="07/01/2026" />
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Dirección del asegurado</label>
            <input value={data.insuredDirection} onChange={(e) => set({ insuredDirection: e.target.value })} placeholder="Dirección del asegurado" />
          </div>
          <div className="field">
            <label>Tipo de claim</label>
            <input value={data.claimType} onChange={(e) => set({ claimType: e.target.value })} placeholder="Kitchen" />
          </div>
        </div>
      </div>

      {data.visits.map((visit, vi) => (
        <VisitEditor
          key={vi}
          index={vi}
          visit={visit}
          onChange={(patch) => setVisit(vi, patch)}
          onRemove={data.visits.length > 1 ? () => removeVisit(vi) : undefined}
        />
      ))}

      <div className="toolbar">
        <button className="btn" onClick={addVisit}>+ Agregar visita (día)</button>
        <button className="btn primary" onClick={generate} disabled={busy}>
          {busy ? 'Generando…' : 'Descargar Dry Log'}
        </button>
        {msg && <span className={`msg ${msg.err ? 'err' : 'ok'}`}>{msg.text}</span>}
      </div>
    </div>
  )
}

function VisitEditor({
  index,
  visit,
  onChange,
  onRemove,
}: {
  index: number
  visit: Visit
  onChange: (patch: Partial<Visit>) => void
  onRemove?: () => void
}) {
  const o = visit.outside
  const setAffected = (rows: AffectedRow[]) => onChange({ affected: rows })
  const setNoAffected = (rows: NoAffectedRow[]) => onChange({ noAffected: rows })

  return (
    <div className="card">
      <div className="visit-head">
        <div className="num">Visita {index + 1} · página {index + 1} del PDF</div>
        {onRemove && <button className="btn sm danger" onClick={onRemove}>Quitar visita</button>}
      </div>

      <div className="section-label">Outside · exterior</div>
      <div className="rows-scroll">
        <table className="rows-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Etiqueta</th>
              <th style={{ width: '16%' }}>Fecha</th>
              <th style={{ width: '15%' }}>Hora</th>
              <th style={{ width: '14%' }}>Temp °F</th>
              <th style={{ width: '14%' }}>RH %</th>
              <th style={{ width: '10%' }}>GPP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><input value={o.label} onChange={(e) => onChange({ outside: { ...o, label: e.target.value } })} placeholder="Closing" /></td>
              <td><input value={o.date} onChange={(e) => onChange({ outside: { ...o, date: e.target.value } })} placeholder="07/06/2026" /></td>
              <td><input value={o.time} onChange={(e) => onChange({ outside: { ...o, time: e.target.value } })} placeholder="4:46 PM" /></td>
              <td><input value={o.tempF} onChange={(e) => onChange({ outside: { ...o, tempF: e.target.value } })} inputMode="decimal" placeholder="85" /></td>
              <td><input value={o.rh} onChange={(e) => onChange({ outside: { ...o, rh: e.target.value } })} inputMode="decimal" placeholder="77.5" /></td>
              <td><span className={`gpp-pill ${gppDisplay(o.tempF, o.rh) ? '' : 'empty'}`}>{gppDisplay(o.tempF, o.rh) || '--'}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section-label">Affected area · áreas afectadas</div>
      <div className="rows-scroll">
        <table className="rows-table">
          <thead>
            <tr>
              <th>Área / Cuarto</th><th>Fecha</th><th>Hora</th><th>Temp °F</th><th>RH %</th><th>GPP</th><th>Moisture</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visit.affected.map((row, ri) => (
              <tr key={ri}>
                <td><input value={row.area} onChange={(e) => setAffected(upd(visit.affected, ri, { area: e.target.value }))} placeholder="Kitchen" /></td>
                <td><input value={row.date} onChange={(e) => setAffected(upd(visit.affected, ri, { date: e.target.value }))} placeholder="07/06/2026" /></td>
                <td><input value={row.time} onChange={(e) => setAffected(upd(visit.affected, ri, { time: e.target.value }))} placeholder="4:59 PM" /></td>
                <td><input value={row.tempF} onChange={(e) => setAffected(upd(visit.affected, ri, { tempF: e.target.value }))} inputMode="decimal" placeholder="76.1" /></td>
                <td><input value={row.rh} onChange={(e) => setAffected(upd(visit.affected, ri, { rh: e.target.value }))} inputMode="decimal" placeholder="40.4" /></td>
                <td><span className={`gpp-pill ${gppDisplay(row.tempF, row.rh) ? '' : 'empty'}`}>{gppDisplay(row.tempF, row.rh) || '--'}</span></td>
                <td><input value={row.moisture} onChange={(e) => setAffected(upd(visit.affected, ri, { moisture: e.target.value }))} placeholder="9.1" /></td>
                <td>{visit.affected.length > 1 && <button className="row-del" onClick={() => setAffected(visit.affected.filter((_, j) => j !== ri))}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setAffected([...visit.affected, emptyAffectedRow()])}>+ Fila afectada</button>

      <div className="section-label">No affected area · áreas no afectadas</div>
      <div className="rows-scroll">
        <table className="rows-table">
          <thead>
            <tr>
              <th>Área / Cuarto</th><th>Fecha</th><th>Hora</th><th>Temp °F</th><th>RH %</th><th>Dry Standard</th><th></th>
            </tr>
          </thead>
          <tbody>
            {visit.noAffected.map((row, ri) => (
              <tr key={ri}>
                <td><input value={row.area} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { area: e.target.value }))} placeholder="Hallway" /></td>
                <td><input value={row.date} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { date: e.target.value }))} placeholder="07/06/2026" /></td>
                <td><input value={row.time} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { time: e.target.value }))} placeholder="4:58 PM" /></td>
                <td><input value={row.tempF} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { tempF: e.target.value }))} inputMode="decimal" placeholder="79.3" /></td>
                <td><input value={row.rh} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { rh: e.target.value }))} inputMode="decimal" placeholder="40.8" /></td>
                <td><input value={row.dryStandard} onChange={(e) => setNoAffected(upd(visit.noAffected, ri, { dryStandard: e.target.value }))} placeholder="8.3" /></td>
                <td>{visit.noAffected.length > 1 && <button className="row-del" onClick={() => setNoAffected(visit.noAffected.filter((_, j) => j !== ri))}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn sm" style={{ marginTop: 8 }} onClick={() => setNoAffected([...visit.noAffected, emptyNoAffectedRow()])}>+ Fila no afectada</button>

      <div className="sig-row">
        <SignaturePad label="Firma del técnico" value={visit.techSignature} onChange={(v) => onChange({ techSignature: v })} />
        <SignaturePad label="Firma del asegurado" value={visit.insuredSignature} onChange={(v) => onChange({ insuredSignature: v })} />
      </div>
    </div>
  )
}

function upd<T>(rows: T[], i: number, patch: Partial<T>): T[] {
  return rows.map((r, j) => (j === i ? { ...r, ...patch } : r))
}
