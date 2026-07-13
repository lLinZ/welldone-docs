# Well Done Docs

Herramienta web para documentos de mitigación de agua. Todo corre **100 % en el navegador** — ningún documento ni dato sale de tu equipo, no hay servidor ni almacenamiento en la nube.

## Módulos

| Pestaña | Qué hace |
| --- | --- |
| **Dry Log** | Crea el Dry Log desde cero: datos del caso, visitas (Initial / Day N / Closing), lecturas OUTSIDE / AFFECTED AREA / NO AFFECTED AREA. El **GPP se calcula solo** a partir de temperatura y humedad. Firmas del técnico y del asegurado dibujadas con el mouse o el dedo. Descarga un PDF con el formato exacto de Well Done (una página por visita). |
| **Expediente** | Formulario global (cliente, dirección, claim #, policy #, fecha open, fecha close, tipo de pérdida). Alimenta todos los documentos. Water = 1 invoice; Mold = 2. |
| **Documentos** (DTP, LOP, Affidavit, COC, Invoice) | Subes el PDF firmado y editas campos con chips (clic para colocar), texto libre y borrador. Todo en **negro**, con **cuadro blanco** que tapa el dato de abajo. "Auto-colocar" ubica el Claim # y las fechas en sus posiciones exactas y activa "Aplanar" para garantizar el tapado. |
| **Dry Log** | Subes el drylog inicial firmado (editable) y **generas el closing** con nuevas temperaturas; el GPP se calcula solo. |
| **GPP** | Calculadora psicrométrica rápida: temperatura + humedad relativa → GPP, punto de rocío y presión de vapor. |

Las coordenadas exactas del Claim # y las fechas por documento están en `src/lib/doc-maps.ts`, extraídas de las anotaciones reales de los PDFs firmados.

La fórmula GPP (Magnus, presión estándar a nivel del mar) está validada contra drylogs reales de la empresa: `85 °F / 77.5 % → 141 GPP` y `76.1 °F / 40.4 % → 54 GPP`.

## Desarrollo local

```bash
npm install
npm run dev        # abre http://localhost:5173
```

## Pruebas

```bash
# Genera PDFs de muestra (drylog + DTP relleno) para inspección visual
npx tsx scripts/test-pdfs.ts <carpetaSalida> [rutaDtp.pdf]

# E2E headless con el Edge del sistema (requiere `npm run dev` corriendo)
npx tsx scripts/e2e.ts <carpetaSalida> [rutaDtp.pdf]
```

## Deploy en Vercel

```bash
npm i -g vercel      # una sola vez
vercel login         # una sola vez (abre el navegador)
vercel --prod        # desde esta carpeta; acepta los defaults (detecta Vite solo)
```

Te devuelve una URL tipo `https://welldone-docs.vercel.app` lista para usar desde cualquier teléfono o tablet.

**Alternativa sin instalar nada:** `npm run build` y arrastrá la carpeta `dist/` a <https://app.netlify.com/drop>.

## Estructura

```
src/
  lib/
    psychro.ts       # fórmulas GPP / punto de rocío / presión de vapor
    drylog-pdf.ts    # genera el Dry Log con pdf-lib (replica el layout Well Done)
    drylog-types.ts  # modelo de datos del drylog
    dtp-fields.ts    # mapa de coordenadas de los campos del DTP (612x792 pt)
    dtp-pdf.ts       # estampa texto sobre el DTP subido
  components/
    DrylogTab.tsx    # formulario del drylog
    DtpTab.tsx       # editor DTP (vista previa pdf.js + overlay)
    CalcTab.tsx      # calculadora GPP
    SignaturePad.tsx # firma en canvas
public/
  welldone_logo.png        # logo extraído del documento original
  calculadora-clasica.html # la calculadora GPP original, intacta (/calculadora-clasica.html)
```
