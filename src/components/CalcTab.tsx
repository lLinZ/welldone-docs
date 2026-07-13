import { useState } from 'react'
import { calcPsychro, parseNum } from '../lib/psychro'

export default function CalcTab() {
  const [tempF, setTempF] = useState('75')
  const [rh, setRh] = useState('50')
  const [copied, setCopied] = useState(false)

  const t = parseNum(tempF)
  const h = parseNum(rh)
  const valid = !isNaN(t) && !isNaN(h) && h >= 0 && h <= 100
  const r = valid ? calcPsychro(t, h) : null

  const copy = async () => {
    if (!r) return
    try {
      await navigator.clipboard.writeText(String(Math.round(r.gpp)))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <div className="calc-wrap">
      <div className="card">
        <div className="card-head">
          <div>
            <span className="eyebrow">Psicrometría</span>
            <div className="card-title">Calculadora GPP</div>
            <div className="card-sub">Granos por libra a presión estándar (nivel del mar).</div>
          </div>
        </div>

        <div className="calc-inputs">
          <div className="field">
            <label htmlFor="temp">Temperatura</label>
            <div className="calc-box">
              <input
                id="temp"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={tempF}
                onChange={(e) => setTempF(e.target.value)}
              />
              <span className="unit">°F</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rh">Humedad relativa</label>
            <div className="calc-box">
              <input
                id="rh"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={0}
                max={100}
                value={rh}
                onChange={(e) => setRh(e.target.value)}
              />
              <span className="unit">%</span>
            </div>
          </div>
        </div>

        <div className="readout">
          <div className="tag">Granos por libra</div>
          <div className="value">{r ? Math.round(r.gpp) : '--'}</div>
          <div className="unit-label">GPP</div>
        </div>

        <div className="extras">
          <div className="extra">
            <div className="k">Punto de rocío</div>
            <div className="v">{r && !isNaN(r.dewPointF) ? r.dewPointF.toFixed(1) + ' °F' : '--'}</div>
          </div>
          <div className="extra">
            <div className="k">Presión de vapor</div>
            <div className="v">{r ? r.vaporPressureInHg.toFixed(3) + ' inHg' : '--'}</div>
          </div>
        </div>

        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn lime block" onClick={copy} disabled={!r}>
            {copied ? '✓ Copiado' : 'Copiar GPP'}
          </button>
        </div>
      </div>
    </div>
  )
}
