// Cálculos psicrométricos a presión atmosférica estándar (nivel del mar).
// Validado contra drylogs reales de Well Done: 85°F/77.5% → 141 GPP, 76.1°F/40.4% → 54 GPP.

const P_ATM_HPA = 1013.25

/** Presión de vapor de saturación (fórmula de Magnus) en hPa. */
function satVaporPressureHpa(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5))
}

export interface PsychroResult {
  gpp: number
  dewPointF: number
  vaporPressureInHg: number
}

/** Granos de humedad por libra de aire seco a partir de °F y humedad relativa (%). */
export function calcGpp(tempF: number, rhPercent: number): number {
  const c = ((tempF - 32) * 5) / 9
  const pv = (rhPercent / 100) * satVaporPressureHpa(c)
  const w = (0.62198 * pv) / (P_ATM_HPA - pv)
  return w * 7000
}

export function calcPsychro(tempF: number, rhPercent: number): PsychroResult {
  const c = ((tempF - 32) * 5) / 9
  const pv = (rhPercent / 100) * satVaporPressureHpa(c)
  const w = (0.62198 * pv) / (P_ATM_HPA - pv)

  let dewPointF = NaN
  if (rhPercent > 0) {
    const gamma = Math.log(rhPercent / 100) + (17.67 * c) / (243.5 + c)
    const dpC = (243.5 * gamma) / (17.67 - gamma)
    dewPointF = (dpC * 9) / 5 + 32
  }

  return {
    gpp: w * 7000,
    dewPointF,
    vaporPressureInHg: pv / 33.8639,
  }
}

/** parseFloat que acepta coma decimal ("77,5" → 77.5). */
export function parseNum(s: string): number {
  return parseFloat(s.trim().replace(',', '.'))
}

/** GPP redondeado para mostrar en el drylog, o cadena vacía si faltan datos. */
export function gppDisplay(tempF: string, rh: string): string {
  const t = parseNum(tempF)
  const h = parseNum(rh)
  if (isNaN(t) || isNaN(h) || h < 0 || h > 100) return ''
  return String(Math.round(calcGpp(t, h)))
}
