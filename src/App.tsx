import { useState } from 'react'
import { activeDocs, emptyExpediente, type DocId, type Expediente } from './lib/expediente'
import { autoPlaceFor, hasAutoPlace } from './lib/doc-maps'
import ExpedienteForm from './components/ExpedienteForm'
import DocEditor, { emptyDocState, type DocEditorState } from './components/DocEditor'
import DrylogSlot from './components/DrylogSlot'
import CalcTab from './components/CalcTab'

type View = 'datos' | DocId | 'gpp'

const ALL_DOC_IDS: DocId[] = ['dtp', 'lop', 'affidavit', 'drylog', 'coc', 'invoice1', 'invoice2']

function initialDocStates(): Record<DocId, DocEditorState> {
  return ALL_DOC_IDS.reduce((acc, id) => {
    acc[id] = emptyDocState()
    return acc
  }, {} as Record<DocId, DocEditorState>)
}

export default function App() {
  const [exp, setExp] = useState<Expediente>(emptyExpediente())
  const [docStates, setDocStates] = useState<Record<DocId, DocEditorState>>(initialDocStates)
  const [view, setView] = useState<View>('datos')

  const docs = activeDocs(exp)
  const setDocState = (id: DocId, s: DocEditorState) => setDocStates((prev) => ({ ...prev, [id]: s }))

  // Si el documento activo se desactiva (p.ej. Invoice 2 al cambiar a water), volvemos a Datos.
  const visibleView: View =
    view !== 'datos' && view !== 'gpp' && !docs.some((d) => d.id === view) ? 'datos' : view

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <BrandMark />
          </div>
          <div className="brand-text">
            <h1>Well Done · Expedientes</h1>
            <p>Documentos de mitigación</p>
          </div>
        </div>
        <div className="header-badge">
          <span className="dot" />
          Todo local · nada se sube a la nube
        </div>
      </header>

      <nav className="docnav">
        <NavBtn label="Datos del caso" active={visibleView === 'datos'} onClick={() => setView('datos')} done={caseReady(exp)} />
        <span className="docnav-sep" />
        {docs.map((d) => (
          <NavBtn
            key={d.id}
            label={d.name}
            active={visibleView === d.id}
            onClick={() => setView(d.id)}
            done={docStates[d.id].items.length > 0 || !!docStates[d.id].bytes}
          />
        ))}
        <span className="docnav-sep" />
        <NavBtn label="GPP" active={visibleView === 'gpp'} onClick={() => setView('gpp')} />
      </nav>

      <main>
        {visibleView === 'datos' && <ExpedienteForm exp={exp} onChange={setExp} />}

        {docs.map((d) => {
          if (visibleView !== d.id) return null
          if (d.id === 'drylog') {
            return <DrylogSlot key={d.id} def={d} exp={exp} state={docStates.drylog} onChange={(s) => setDocState('drylog', s)} />
          }
          return (
            <DocEditor
              key={d.id}
              def={d}
              exp={exp}
              state={docStates[d.id]}
              onChange={(s) => setDocState(d.id, s)}
              autoPlace={hasAutoPlace(d.id) ? (e) => autoPlaceFor(d.id, e) : undefined}
            />
          )
        })}

        {visibleView === 'gpp' && <CalcTab />}
      </main>

      <footer className="app-footer">
        Well Done Mitigation · Los documentos y datos nunca salen de tu equipo.
      </footer>
    </div>
  )
}

function caseReady(exp: Expediente): boolean {
  return exp.clientName.trim() !== '' && exp.claimNumber.trim() !== ''
}

function NavBtn({ label, active, onClick, done }: { label: string; active: boolean; onClick: () => void; done?: boolean }) {
  return (
    <button className={`docnav-btn ${active ? 'active' : ''}`} onClick={onClick}>
      {done !== undefined && <span className={`chk ${done ? 'done' : 'empty'}`}>{done ? '✓' : ''}</span>}
      {label}
    </button>
  )
}

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="#383f6b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 15 16 6l11 9" />
      <path d="M8 14v11h16V14" />
      <path d="M12 25V15l4 5 4-5v10" />
    </svg>
  )
}
