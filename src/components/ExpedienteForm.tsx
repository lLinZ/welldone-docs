import { LOSS_TYPES, lossTypeDef, type Expediente } from '../lib/expediente'

interface Props {
  exp: Expediente
  onChange: (e: Expediente) => void
}

export default function ExpedienteForm({ exp, onChange }: Props) {
  const set = (patch: Partial<Expediente>) => onChange({ ...exp, ...patch })
  const kind = lossTypeDef(exp).kind

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="eyebrow">Paso 1 · Datos del caso</span>
          <div className="card-title">Información del expediente</div>
          <div className="card-sub">
            Estos datos se comparten con todos los documentos. Después los colocas en cada PDF con un clic.
          </div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="field">
          <label>Nombre del cliente</label>
          <input
            className="big"
            value={exp.clientName}
            onChange={(e) => set({ clientName: e.target.value })}
            placeholder="Nombre y apellido"
          />
        </div>
        <div className="field">
          <label>Dirección</label>
          <input
            value={exp.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Calle, número, ciudad, estado, ZIP"
          />
        </div>
        <div className="field">
          <label>Claim #</label>
          <input value={exp.claimNumber} onChange={(e) => set({ claimNumber: e.target.value })} placeholder="Número de claim" />
        </div>
        <div className="field">
          <label>Policy #</label>
          <input value={exp.policyNumber} onChange={(e) => set({ policyNumber: e.target.value })} placeholder="Número de póliza" />
        </div>
        <div className="field">
          <label>
            Fecha del open <span className="sub">· DTP, LOP, Affidavit, Dry Log</span>
          </label>
          <input value={exp.openDate} onChange={(e) => set({ openDate: e.target.value })} placeholder="MM/DD/AAAA" />
        </div>
        <div className="field">
          <label>
            Fecha del close <span className="sub">· COC, Invoices</span>
          </label>
          <input value={exp.closeDate} onChange={(e) => set({ closeDate: e.target.value })} placeholder="MM/DD/AAAA" />
        </div>
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <label>Tipo de pérdida</label>
        <div className="segmented wrap">
          {LOSS_TYPES.map((t) => (
            <button key={t.id} className={exp.lossType === t.id ? 'active' : ''} onClick={() => set({ lossType: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="card-sub" style={{ marginTop: 8 }}>
          {kind === 'full'
            ? 'Paquete completo: DTP, LOP, Affidavit, Dry Log, COC e Invoice.'
            : 'Documentos: Invoice y COC (las fotos se manejan por fuera).'}
        </div>
      </div>

      <label className="mini-check" style={{ marginTop: 16 }}>
        <input type="checkbox" checked={exp.secondInvoice} onChange={(e) => set({ secondInvoice: e.target.checked })} />
        <span style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 600 }}>Este expediente lleva un segundo invoice</span>
      </label>
    </div>
  )
}
