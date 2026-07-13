import { useState } from 'react'
import type { DocDef, Expediente } from '../lib/expediente'
import DocEditor, { type DocEditorState } from './DocEditor'
import DrylogTab from './DrylogTab'

interface Props {
  def: DocDef
  exp: Expediente
  state: DocEditorState
  onChange: (s: DocEditorState) => void
}

/** Dry Log: se sube el inicial firmado (editable) y se genera el closing con nuevas lecturas. */
export default function DrylogSlot({ def, exp, state, onChange }: Props) {
  const [mode, setMode] = useState<'inicial' | 'closing'>('inicial')

  return (
    <div>
      <div className="card" style={{ paddingBottom: 18 }}>
        <div className="card-head" style={{ marginBottom: 14 }}>
          <div>
            <span className="eyebrow">Documento · Dry Log</span>
            <div className="card-title">Dry Log</div>
            <div className="card-sub">Sube el drylog inicial firmado; genera el del closing con las nuevas temperaturas.</div>
          </div>
        </div>
        <div className="segmented">
          <button className={mode === 'inicial' ? 'active' : ''} onClick={() => setMode('inicial')}>
            Inicial (firmado)
          </button>
          <button className={mode === 'closing' ? 'active' : ''} onClick={() => setMode('closing')}>
            Generar closing
          </button>
        </div>
      </div>

      <div style={{ display: mode === 'inicial' ? undefined : 'none' }}>
        <DocEditor def={def} exp={exp} state={state} onChange={onChange} />
      </div>
      <div style={{ display: mode === 'closing' ? undefined : 'none' }}>
        <DrylogTab
          seed={{
            insuredName: exp.clientName,
            insuredDirection: exp.address,
            claimType: '',
            dateOfCommencement: exp.openDate,
            readingDate: exp.closeDate,
            firstLabel: 'Closing',
          }}
        />
      </div>
    </div>
  )
}
