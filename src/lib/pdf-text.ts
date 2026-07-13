// Las fuentes estándar de pdf-lib (Helvetica) solo codifican WinAnsi (CP1252).
// Cualquier otro carácter (→, ✓, emoji, CJK…) lanza error al dibujar: lo reemplazamos por "?".
const CP1252_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'

export function toWinAnsi(text: string): string {
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0)!
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || CP1252_EXTRA.includes(ch)) {
      out += ch
    } else if (code === 0x09 || code === 0x0a || code === 0x0d) {
      out += ' '
    } else {
      out += '?'
    }
  }
  return out
}
