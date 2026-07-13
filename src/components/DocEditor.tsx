import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { DocDef, Expediente } from '../lib/expediente'
import { commonFields } from '../lib/expediente'
import {
  downloadBytes,
  emptyDocState,
  newEraseItem,
  newTextItem,
  type DocEditorState,
  type StampItem,
} from '../lib/doc-stamp'
import { buildDocOutput } from '../lib/build-doc'
import { docFileName } from '../lib/paquete'

export type { DocEditorState }
export { emptyDocState }

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const RENDER_SCALE = 2

type Armed = { type: 'field' | 'free' | 'erase'; text: string } | null

interface Props {
  def: DocDef
  exp: Expediente
  state: DocEditorState
  onChange: (s: DocEditorState) => void
  /** Colocación automática de campos conocidos (p.ej. DTP). */
  autoPlace?: (exp: Expediente) => StampItem[]
}

export default function DocEditor({ def, exp, state, onChange, autoPlace }: Props) {
  const { fileName, bytes, items } = state
  const [numPages, setNumPages] = useState(0)
  const [pageIdx, setPageIdx] = useState(0)
  const [pageSizes, setPageSizes] = useState<{ w: number; h: number }[]>([])
  const [armed, setArmed] = useState<Armed>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [stageW, setStageW] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)

  const fields = useMemo(() => commonFields(exp, def), [exp, def])
  const nextId = () => (items.reduce((m, i) => Math.max(m, i.id), 0) + 1)

  const patch = (p: Partial<DocEditorState>) => onChange({ ...state, ...p })
  const setItems = (next: StampItem[]) => patch({ items: next })

  // ---- Carga del archivo ----
  const loadFile = async (file: File) => {
    setMsg(null)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setMsg({ text: 'Ese archivo no es un PDF. Sube el documento en formato PDF.', err: true })
      return
    }
    try {
      const buf = new Uint8Array(await file.arrayBuffer())
      const doc = await pdfjsLib.getDocument({ data: buf.slice() }).promise
      docRef.current = doc
      const sizes: { w: number; h: number }[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const vp = (await doc.getPage(i)).getViewport({ scale: 1 })
        sizes.push({ w: vp.width, h: vp.height })
      }
      setPageSizes(sizes)
      setNumPages(doc.numPages)
      setPageIdx(0)
      onChange({ fileName: file.name, bytes: buf, items: [], flatten: false })
    } catch (e) {
      console.error(e)
      setMsg({ text: 'No se pudo leer el PDF. Verificá que no esté dañado ni protegido con contraseña.', err: true })
    }
  }

  // Reabrir el doc en pdf.js si venimos con bytes de otro montaje
  useEffect(() => {
    let cancelled = false
    if (bytes && !docRef.current) {
      pdfjsLib
        .getDocument({ data: bytes.slice() })
        .promise.then(async (doc) => {
          if (cancelled) return
          docRef.current = doc
          const sizes: { w: number; h: number }[] = []
          for (let i = 1; i <= doc.numPages; i++) {
            const vp = (await doc.getPage(i)).getViewport({ scale: 1 })
            sizes.push({ w: vp.width, h: vp.height })
          }
          if (cancelled) return
          setPageSizes(sizes)
          setNumPages(doc.numPages)
        })
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes])

  // ---- Render de la página ----
  useEffect(() => {
    let task: pdfjsLib.RenderTask | null = null
    let cancelled = false
    const run = async () => {
      const doc = docRef.current
      const canvas = canvasRef.current
      if (!doc || !canvas || pageIdx + 1 > doc.numPages) return
      const page = await doc.getPage(pageIdx + 1)
      if (cancelled) return
      const viewport = page.getViewport({ scale: RENDER_SCALE })
      canvas.width = viewport.width
      canvas.height = viewport.height
      task = page.render({ canvasContext: canvas.getContext('2d')!, viewport })
      try {
        await task.promise
      } catch {
        /* render cancelado al cambiar de página: normal */
      }
    }
    run()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [pageIdx, numPages, bytes])

  // ---- Ancho del stage para escalar overlays ----
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(() => setStageW(stage.clientWidth))
    ro.observe(stage)
    setStageW(stage.clientWidth)
    return () => ro.disconnect()
  }, [bytes, numPages])

  const pageSize = pageSizes[pageIdx] ?? { w: 612, h: 792 }
  const scale = stageW / pageSize.w

  // ---- Colocación ----
  const onStageClick = (e: React.MouseEvent) => {
    if (!armed) return
    const rect = stageRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left) / scale
    const top = (e.clientY - rect.top) / scale
    const id = nextId()
    let item: StampItem
    if (armed.type === 'erase') {
      item = { ...newEraseItem(pageIdx, Math.round(x), Math.round(top)), id }
    } else {
      const whiteOut = armed.type === 'field'
      item = { ...newTextItem(pageIdx, Math.round(x), Math.round(top - 6), armed.text, whiteOut), id }
    }
    setItems([...items, item])
    setSelected(id)
    setArmed(null)
  }

  const updateItem = (id: number, p: Partial<StampItem>) =>
    setItems(items.map((it) => (it.id === id ? { ...it, ...p } : it)))

  const removeItem = (id: number) => setItems(items.filter((it) => it.id !== id))

  const selectItem = (it: StampItem) => {
    setSelected(it.id)
    setPageIdx(it.page)
  }

  const duplicateItem = (it: StampItem) => {
    const id = nextId()
    const copy: StampItem = { ...it, id, x: it.x + 12, top: it.top + 12 }
    setItems([...items, copy])
    setSelected(id)
  }

  // ---- Arrastrar / redimensionar ----
  const startDrag = (id: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelected(id)
    const it = items.find((i) => i.id === id)!
    const sx = e.clientX
    const sy = e.clientY
    const ox = it.x
    const oy = it.top
    const move = (ev: PointerEvent) => {
      updateItem(id, {
        x: Math.round(ox + (ev.clientX - sx) / scale),
        top: Math.round(oy + (ev.clientY - sy) / scale),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startResize = (id: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const it = items.find((i) => i.id === id)!
    const sx = e.clientX
    const sy = e.clientY
    const ow = it.w
    const oh = it.h
    const move = (ev: PointerEvent) => {
      updateItem(id, {
        w: Math.max(6, Math.round(ow + (ev.clientX - sx) / scale)),
        h: Math.max(6, Math.round(oh + (ev.clientY - sy) / scale)),
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ---- Export ----
  const exportPdf = async () => {
    if (!bytes) return
    setBusy(true)
    setMsg(null)
    try {
      const out = await buildDocOutput(state)
      downloadBytes(out, docFileName(def.name, exp))
      setMsg({ text: state.flatten ? 'Documento aplanado y descargado' : 'Documento descargado' })
    } catch (e) {
      console.error(e)
      setMsg({ text: 'No se pudo generar el PDF editado.', err: true })
    } finally {
      setBusy(false)
    }
  }

  const reset = () => {
    const hasWork = items.length > 0
    if (hasWork && !window.confirm('Se van a descartar los campos colocados en este documento. ¿Subir otro archivo?')) return
    docRef.current = null
    setPageSizes([])
    setNumPages(0)
    setPageIdx(0)
    setArmed(null)
    setSelected(null)
    onChange(emptyDocState())
  }

  const runAutoPlace = () => {
    if (!autoPlace) return
    const placed = autoPlace(exp)
    if (placed.length === 0) {
      setMsg({ text: 'Completa el Claim # y las fechas en el formulario del caso para poder auto-colocar.', err: true })
      return
    }
    let id = nextId()
    const withIds = placed.map((p) => ({ ...p, id: id++ }))
    // Estos documentos vienen firmados (el dato viejo es una anotación): activamos
    // "Aplanar" para que el tapado quede garantizado.
    patch({ items: [...items, ...withIds], flatten: true })
    setMsg({ text: 'Campos colocados sobre el Claim # y las fechas. Se activó "Aplanar" para tapar el dato firmado. Revisa la vista previa.' })
  }

  // ================= Sin archivo =================
  if (!bytes) {
    return (
      <Dropzone def={def} onFile={loadFile}>
        {msg && <div className={`msg ${msg.err ? 'err' : 'ok'}`} style={{ marginTop: 14 }}>{msg.text}</div>}
      </Dropzone>
    )
  }

  const itemsOnPage = items.filter((i) => i.page === pageIdx)
  const selItem = items.find((i) => i.id === selected) ?? null

  return (
    <div className="editor">
      {/* ---------- Panel lateral ---------- */}
      <div className="editor-side">
        <div className="side-card">
          <h4>
            Campos del expediente <span className="tag">clic para colocar</span>
          </h4>
          {armed && (
            <div className="armed-banner">
              {armed.type === 'erase' ? 'Clic para colocar un borrador' : `Clic para colocar: ${armed.text || 'texto'}`}
              <button className="btn sm ghost" onClick={() => setArmed(null)}>
                Cancelar
              </button>
            </div>
          )}
          <div className="chips">
            {fields.map((f) => (
              <button
                key={f.key}
                className={`chip ${armed?.type === 'field' && armed.text === f.value ? 'armed' : ''} ${
                  f.value ? '' : 'disabled'
                }`}
                disabled={!f.value}
                onClick={() => setArmed({ type: 'field', text: f.value })}
                title={f.value || 'Completa este dato en el formulario del caso'}
              >
                <span className="k">{f.label}</span>
                <span className="v">{f.value || '—'}</span>
              </button>
            ))}
          </div>
          <div className="toolbar" style={{ marginTop: 14 }}>
            <button className="btn sm" onClick={() => setArmed({ type: 'free', text: '' })}>
              + Texto libre
            </button>
            <button className="btn sm" onClick={() => setArmed({ type: 'erase', text: '' })}>
              Borrador
            </button>
            {autoPlace && (
              <button className="btn sm lime" onClick={runAutoPlace}>
                Auto-colocar
              </button>
            )}
          </div>
          <div className="note-box" style={{ marginTop: 14 }}>
            <span className="ic">
              <InfoIcon />
            </span>
            <span>
              Los campos se estampan en <b>negro</b> y tapan con un cuadro blanco el dato de abajo. Arrástralos en la
              vista previa para ajustarlos.
            </span>
          </div>
        </div>

        {items.length > 0 && (
          <div className="side-card">
            <h4>
              Colocados <span className="tag">{items.length}</span>
            </h4>
            <div className="item-list">
              {items.map((it) => (
                <div
                  className={`item-row ${selected === it.id ? 'selected' : ''}`}
                  key={it.id}
                  onClick={() => selectItem(it)}
                >
                  <div className="top">
                    <span className="pg">p.{it.page + 1}</span>
                    <span className={`item-tag ${it.kind}`}>{it.kind === 'erase' ? 'borrar' : 'texto'}</span>
                    <span className="row-text">{it.kind === 'erase' ? 'Cuadro blanco' : it.text || '(vacío)'}</span>
                    <button
                      className="icon-btn"
                      title="Quitar"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeItem(it.id)
                        if (selected === it.id) setSelected(null)
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hint" style={{ marginTop: 8 }}>
              Toca uno para seleccionarlo; se edita en la barra de abajo.
            </div>
          </div>
        )}

        <div className="side-card">
          <label className="mini-check" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={state.flatten}
              onChange={(e) => patch({ flatten: e.target.checked })}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              <b style={{ color: 'var(--navy)' }}>Aplanar y garantizar el tapado.</b> Ideal para documentos firmados:
              asegura que el cuadro blanco cubra el dato de abajo. El PDF final queda como imagen (sin texto
              seleccionable).
            </span>
          </label>
          <div className="toolbar">
            <button className="btn primary block" onClick={exportPdf} disabled={busy}>
              {busy ? 'Generando…' : `Descargar ${def.name}`}
            </button>
          </div>
          <div className="toolbar" style={{ marginTop: 10, justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fileName}
            </span>
            <button className="btn sm ghost" onClick={reset}>
              Otro archivo
            </button>
          </div>
          {msg && <div className={`msg ${msg.err ? 'err' : 'ok'}`} style={{ marginTop: 10 }}>{msg.text}</div>}
        </div>
      </div>

      {/* ---------- Vista previa ---------- */}
      <div className="stage-wrap">
        <div className="page-nav">
          <button className="btn sm" disabled={pageIdx === 0} onClick={() => setPageIdx((p) => p - 1)}>
            ← Anterior
          </button>
          <span className="count">
            Página {pageIdx + 1} de {numPages}
          </span>
          <button className="btn sm" disabled={pageIdx >= numPages - 1} onClick={() => setPageIdx((p) => p + 1)}>
            Siguiente →
          </button>
        </div>

        <div className="pdf-stage" ref={stageRef}>
          <canvas ref={canvasRef} />
          <div className={`pdf-overlay ${armed ? 'placing' : ''}`} onClick={onStageClick}>
            {itemsOnPage.map((it) =>
              it.kind === 'erase' ? (
                <div
                  key={it.id}
                  className={`ov erase ${selected === it.id ? 'selected' : ''}`}
                  style={{ left: it.x * scale, top: it.top * scale, width: it.w * scale, height: it.h * scale }}
                  onPointerDown={(e) => startDrag(it.id, e)}
                >
                  {selected === it.id && <span className="handle" onPointerDown={(e) => startResize(it.id, e)} />}
                </div>
              ) : (
                <div
                  key={it.id}
                  className={`ov text ${selected === it.id ? 'selected' : ''}`}
                  style={{ left: it.x * scale, top: it.top * scale, fontSize: it.size * scale }}
                  onPointerDown={(e) => startDrag(it.id, e)}
                >
                  <span className={it.whiteOut ? 'bg' : ''}>{it.text || '···'}</span>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="stage-hint">
          {armed
            ? 'Haz clic en el documento para colocar.'
            : 'Toca un elemento para seleccionarlo, arrastrarlo o editarlo en la barra de abajo.'}
          <br />
          Los contornos y recuadros son solo guías del editor — no salen en el PDF.
        </div>
      </div>

      {/* ---------- Barra flotante del elemento seleccionado ---------- */}
      {selItem && (
        <div className="sel-bar">
          <span className="sel-tag">
            {selItem.kind === 'erase' ? 'Cuadro blanco' : 'Texto'} · p.{selItem.page + 1}
          </span>
          {selItem.kind === 'text' ? (
            <>
              <input
                key={selItem.id}
                type="text"
                value={selItem.text}
                autoFocus={selItem.text === ''}
                placeholder="Escribe el texto…"
                onChange={(e) => updateItem(selItem.id, { text: e.target.value })}
              />
              <div className="stepper" title="Tamaño del texto">
                <button onClick={() => updateItem(selItem.id, { size: Math.max(6, selItem.size - 1) })}>−</button>
                <span>{selItem.size}</span>
                <button onClick={() => updateItem(selItem.id, { size: Math.min(48, selItem.size + 1) })}>+</button>
              </div>
              <label className="mini-check">
                <input
                  type="checkbox"
                  checked={selItem.whiteOut}
                  onChange={(e) => updateItem(selItem.id, { whiteOut: e.target.checked })}
                />
                tapar
              </label>
            </>
          ) : (
            <>
              <label className="lbl">
                An
                <input
                  className="num"
                  type="number"
                  value={selItem.w}
                  onChange={(e) => updateItem(selItem.id, { w: parseFloat(e.target.value) || 10 })}
                />
              </label>
              <label className="lbl">
                Al
                <input
                  className="num"
                  type="number"
                  value={selItem.h}
                  onChange={(e) => updateItem(selItem.id, { h: parseFloat(e.target.value) || 10 })}
                />
              </label>
            </>
          )}
          <button className="bar-btn dup" onClick={() => duplicateItem(selItem)}>
            Duplicar
          </button>
          <button
            className="bar-btn del"
            onClick={() => {
              removeItem(selItem.id)
              setSelected(null)
            }}
          >
            Eliminar
          </button>
          <button className="bar-btn done" onClick={() => setSelected(null)}>
            Listo
          </button>
        </div>
      )}
    </div>
  )
}

/* ============ Dropzone ============ */
function Dropzone({ def, onFile, children }: { def: DocDef; onFile: (f: File) => void; children?: React.ReactNode }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="eyebrow">Documento</span>
          <div className="card-title">Subir {def.name}</div>
          {def.hint && <div className="card-sub">{def.hint}</div>}
        </div>
      </div>
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
      >
        <div className="dz-icon">
          <UploadIcon />
        </div>
        <h3>Arrastra el PDF de {def.name} o haz clic para elegirlo</h3>
        <p>El archivo se procesa en tu navegador — no se sube a ningún servidor.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {children}
    </div>
  )
}

/* ============ Íconos ============ */
function UploadIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}
