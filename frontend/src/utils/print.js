import client from '../api/client'

// ─── Utilidades de impresión y guardado en Drive ──────────────────────────────
// printPreliquidacion(preliq) y printLiquidacion(liq):
//   1. Abre ventana de impresión (window.print)
//   2. Si el objeto tiene carpeta_drive_id, sube el PDF a Drive via GAS
const EMPRESA = 'TRANSVAAL'

const fmtPeso = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const isLowPowerDevice = () => {
  const cores = navigator.hardwareConcurrency || 0
  const memory = navigator.deviceMemory || 0
  return (cores > 0 && cores <= 2) || (memory > 0 && memory <= 4)
}

const runWhenIdle = (callback, timeout = 2500) => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout })
    return
  }
  setTimeout(callback, timeout)
}

// ─── Nombre de archivo ────────────────────────────────────────────────────────
// Formato: MM-AA-NOMBRE-PROVEEDOR-PRIMERA/SEGUNDA-QUINCENA-PRELIQ/LIQUID.pdf
// Quincena: día de inicio 1-15 → PRIMERA, 16+ → SEGUNDA
function buildFilename(periodoDesde, proveedorNombre, tipo) {
  const fecha = new Date(periodoDesde + 'T00:00:00')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = String(fecha.getFullYear()).slice(-2)
  const dia = fecha.getDate()
  const quincena = dia <= 15 ? 'PRIMERA' : 'SEGUNDA'
  const nombre = proveedorNombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar tildes
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  return `${mes}-${anio}-${nombre}-${quincena}-QUINCENA-${tipo}.pdf`
}

const fmtAdicsHTML = (snap) => {
  if (!snap || !Array.isArray(snap) || snap.length === 0) return null
  return snap.map((a) => {
    const desc = a.descripcion ? ` — ${a.descripcion}` : ''
    return `<div class="adic-item"><span class="adic-nombre">${a.nombre}${desc}</span><span class="adic-precio">${fmtPeso(a.precio)}</span></div>`
  }).join('')
}

// ─── CSS base compartido ──────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 15px;
    font-weight: bold;
    color: #1e293b;
    background: #fff;
    padding: 28px 36px;
  }

  .gastos-page {
    page-break-before: always;
    break-before: page;
    padding-top: 28px;
  }

  /* ── Header ── */
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 18px;
    margin-bottom: 24px;
    border-bottom: 3px solid #1e40af;
  }
  .empresa-name {
    font-size: 26px;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: 2px;
    line-height: 1;
  }
  .empresa-sub {
    font-size: 10px;
    color: #64748b;
    margin-top: 4px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }
  .doc-badge {
    text-align: right;
  }
  .doc-tipo {
    font-size: 13px;
    font-weight: 700;
    color: #1e3a8a;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .doc-num {
    font-size: 28px;
    font-weight: 900;
    color: #1e40af;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }

  /* ── Meta info grid ── */
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 24px;
  }
  .meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
  }
  .meta-box.accent {
    background: #eff6ff;
    border-color: #bfdbfe;
  }
  .meta-lbl {
    font-size: 9.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }
  .meta-val {
    font-size: 13px;
    font-weight: 700;
    color: #1e293b;
  }
  .meta-val.primary {
    font-size: 15px;
    color: #1e40af;
  }

  /* ── Section title ── */
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .section-title::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 14px;
    background: #3b82f6;
    border-radius: 2px;
  }
  .section-title span {
    font-size: 10px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ── Tabla ── */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24px;
  }
  thead tr {
    background: #1e3a8a;
  }
  thead th {
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    padding: 9px 10px;
    text-align: left;
  }
  thead th.r { text-align: right; }

  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 15px;
    color: #334155;
    vertical-align: top;
  }
  tbody td.r { text-align: right; }
  tbody td.amount { text-align: right; font-weight: 600; color: #1e40af; }
  tbody td.muted { color: #94a3b8; font-style: italic; }

  tfoot td {
    padding: 8px 10px;
    border-top: 2px solid #1e3a8a;
    font-size: 12px;
    color: #475569;
    background: #f1f5f9;
  }
  tfoot td.amount { text-align: right; font-weight: 800; color: #1e3a8a; font-size: 13px; }

  /* ── Totales ── */
  .totals-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 32px;
  }
  .totals {
    width: 400px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }
  .t-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  .t-row:last-child { border-bottom: none; }
  .t-row.sep { border-top: 1px solid #e2e8f0; margin-top: 2px; }
  .t-row.gastos { background: #fef9ec; }
  .t-row.final {
    background: #1e3a8a;
    padding: 12px 16px;
  }
  .t-lbl { font-size: 11.5px; color: #64748b; }
  .t-val { font-size: 11.5px; font-weight: 600; color: #1e293b; }
  .t-row.gastos .t-lbl { color: #92400e; }
  .t-row.gastos .t-val { color: #d97706; font-weight: 700; }
  .t-row.final .t-lbl { color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 600; }
  .t-row.final .t-val { color: #fff; font-size: 18px; font-weight: 900; }

  /* ── Footer ── */
  .doc-footer {
    margin-top: 40px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
  }

  /* ── Adicionales detail ── */
  .adic-item {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #475569;
    padding: 1px 0;
  }
  .adic-nombre { flex: 1; }
  .adic-precio { font-weight: 600; color: #1e40af; white-space: nowrap; margin-left: 8px; }

  /* ── Print ── */
  @media print {
    html, body {
      width: 210mm;
      min-height: 297mm;
      overflow: visible !important;
    }
    body { padding: 0; }
    @page { margin: 1.4cm; size: A4; }
    thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .t-row.final { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table { page-break-inside: auto; break-inside: auto; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .gastos-page {
      display: block !important;
      page-break-before: always;
      break-before: page;
      page-break-inside: auto;
      break-inside: auto;
      padding-top: 0;
    }
  }

  @media screen {
    body {
      min-width: 794px;
    }
  }
`

// ─── Página de gastos ─────────────────────────────────────────────────────────
function buildGastosPage(gastos) {
  if (!gastos || gastos.length === 0) return ''
  const rows = gastos.map((g, i) => {
    const comb = g.combustible || {}
    const bruto = parseFloat(comb.precio_total_comb || 0)
    const neto = parseFloat(g.total_combustible || 0)
    const varios = g.varios || []
    const adelanto = parseFloat(g.adelanto_otros || 0)

    const combustCell = bruto > 0
      ? `<div>${comb.lts_comb} lts × ${fmtPeso(comb.precio_lts_comb)}/lt</div>
         <div style="font-size:10px;color:#64748b">Bruto: ${fmtPeso(bruto)} − dto. 20% = <strong>${fmtPeso(neto)}</strong></div>
         ${g.remito_combustible ? `<div style="font-size:10px;color:#94a3b8">Rem: ${g.remito_combustible}</div>` : ''}`
      : '<span style="color:#94a3b8;font-style:italic">—</span>'

    const variosCell = varios.length > 0
      ? varios.map((v) => `<div>${v.descripcion}: <strong>${fmtPeso(v.monto)}</strong></div>`).join('')
      : '<span style="color:#94a3b8;font-style:italic">—</span>'

    return `<tr>
      <td style="color:#94a3b8">${i + 1}</td>
      <td>${fmtFecha(g.fecha_gasto)}</td>
      <td>${combustCell}</td>
      <td>${variosCell}</td>
      <td class="r">${adelanto > 0 ? fmtPeso(adelanto) : '<span style="color:#94a3b8">—</span>'}</td>
      <td class="amount">${fmtPeso(g.total_gasto)}</td>
    </tr>`
  }).join('\n')

  return `
  <div class="gastos-page">
    <div class="section-title"><span>Gastos del período (${gastos.length} registros)</span></div>
    <table>
      <thead>
        <tr>
          <th style="width:28px">#</th>
          <th style="width:80px">Fecha</th>
          <th>Combustible</th>
          <th>Varios</th>
          <th class="r" style="width:90px">Adelanto</th>
          <th class="r" style="width:100px">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`
}

// ─── Template HTML ────────────────────────────────────────────────────────────
function buildHTML({ tipo, id, proveedorNombre, periodoDesde, periodoHasta, fechaEmision, extraMeta, rows, totalSinIva, totalConIva, gastosPeriodo, adeudadoFinal, gastos = [] }) {
  const now = new Date()
  const fechaGen = now.toLocaleDateString('es-AR')
  const horaGen = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const numDoc = String(id).padStart(6, '0')
  const iva = parseFloat(totalConIva) - parseFloat(totalSinIva)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${tipo} #${numDoc} — ${proveedorNombre}</title>
  <style>${CSS}</style>
</head>
<body>

  <div class="doc-header">
    <div>
      <div class="empresa-name">${EMPRESA}</div>
      <div class="empresa-sub">Sistema de Gestión Logística</div>
    </div>
    <div class="doc-badge">
      <div class="doc-tipo">${tipo}</div>
      <div class="doc-num">#${numDoc}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-box accent">
      <div class="meta-lbl">Transportista</div>
      <div class="meta-val primary">${proveedorNombre}</div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Período</div>
      <div class="meta-val">${fmtFecha(periodoDesde)} — ${fmtFecha(periodoHasta)}</div>
    </div>
    <div class="meta-box">
      <div class="meta-lbl">Fecha de emisión</div>
      <div class="meta-val">${fmtFecha(fechaEmision)}</div>
    </div>
    ${extraMeta}
  </div>

  <div class="section-title"><span>Detalle de viajes (${rows.length} items)</span></div>
  <table>
    <thead>
      <tr>
        <th style="width:28px">#</th>
        <th style="width:80px">Fecha</th>
        <th>Cliente</th>
        <th>Destino</th>
        <th style="width:80px">Remito</th>
        <th>Adicionales</th>
        <th class="r" style="width:110px">Importe s/IVA</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((d, i) => {
    const adicsHTML = fmtAdicsHTML(d.adicionales_snapshot)
    return `<tr>
        <td style="color:#94a3b8">${i + 1}</td>
        <td>${fmtFecha(d.fecha_viaje)}</td>
        <td>${d.cliente_snapshot || '-'}</td>
        <td>${d.salida_snapshot || '-'}</td>
        <td class="${d.remito_snapshot ? '' : 'muted'}">${d.remito_snapshot || '-'}</td>
        <td>${adicsHTML || '<span class="muted">—</span>'}</td>
        <td class="amount">${fmtPeso(d.tarifa_sin_iva)}</td>
      </tr>`
  }).join('\n      ')}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" style="text-align:right; color:#475569;font-size:16px; font-weight:600;">Subtotal sin IVA</td>
        <td class="amount" style="font-size:16px; font-weight:600;">${fmtPeso(totalSinIva)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="t-row">
        <span class="t-lbl" style="font-size:16px; font-weight:600;">Total sin IVA</span>
        <span class="t-val" style="font-size:16px; font-weight:600;">${fmtPeso(totalSinIva)}</span>
      </div>
      <div class="t-row">
        <span class="t-lbl" style="font-size:16px; font-weight:600;">IVA (21%)</span>
        <span class="t-val" style="font-size:16px; font-weight:600;">${fmtPeso(iva)}</span>
      </div>
      <div class="t-row sep">
        <span class="t-lbl" style="font-size:16px; font-weight:600;">Total con IVA</span>
        <span class="t-val" style="font-size:16px; font-weight:600;">${fmtPeso(totalConIva)}</span>
      </div>
      <div class="t-row gastos">
        <span class="t-lbl" style="font-size:16px; font-weight:600;">(-) Gastos del período</span>
        <span class="t-val" style="font-size:16px; font-weight:600;">${fmtPeso(gastosPeriodo)}</span>
      </div>
      <div class="t-row final">
        <span class="t-lbl" style="font-size:16px; font-weight:600;">ADEUDADO</span>
        <span class="t-val" style="font-size:16px; font-weight:600;">${fmtPeso(adeudadoFinal)}</span>
      </div>
    </div>
  </div>

  ${buildGastosPage(gastos)}

  <div class="doc-footer">
    <span>Generado el ${fechaGen} a las ${horaGen}</span>
    <span>${EMPRESA} &mdash; Documento interno</span>
  </div>

</body>
</html>`
}

// ─── Abrir ventana e imprimir ─────────────────────────────────────────────────
function openAndPrint(html, title, { afterPrint } = {}) {
  const w = window.open('', '_blank', 'width=960,height=720,toolbar=0,menubar=0')
  if (!w) {
    alert('El navegador bloqueó la ventana emergente. Habilitá los pop-ups para este sitio.')
    return null
  }
  w.document.write(html)
  w.document.close()
  w.focus()

  let afterPrintDone = false
  const runAfterPrint = () => {
    if (afterPrintDone || typeof afterPrint !== 'function') return
    afterPrintDone = true
    runWhenIdle(afterPrint, 6000)
  }

  w.addEventListener?.('afterprint', runAfterPrint, { once: true })

  const printWhenReady = async () => {
    try {
      if (w.document.fonts?.ready) await w.document.fonts.ready
      await new Promise((resolve) => w.requestAnimationFrame(() => w.requestAnimationFrame(resolve)))
      await new Promise((resolve) => setTimeout(resolve, 400))
      w.print()
      setTimeout(runAfterPrint, 10000)
    } catch {
      setTimeout(() => {
        w.print()
        setTimeout(runAfterPrint, 10000)
      }, 800)
    }
  }

  printWhenReady()
  return w
}

// ─── Subir PDF a Google Drive via backend + GAS ───────────────────────────────
async function uploadToDrive(html, filename, folderId) {
  const GAS_URL = import.meta.env.VITE_GAS_URL
  if (!GAS_URL) {
    console.warn('VITE_GAS_URL no definido — se omite el guardado en Drive.')
    return
  }

  try {
    // 1. Backend genera el PDF con WeasyPrint
    const pdfRes = await client.post('/operaciones/generar-pdf/', { html }, { responseType: 'blob' })
    const pdfBlob = pdfRes.data
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(pdfBlob)
    })

    // 3. Enviar al GAS para guardar en Drive
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ file_b64: base64, mime_type: 'application/pdf', filename, folder_id: folderId }),
    })
    const data = await gasRes.json()
    if (!data.ok) {
      console.error('GAS error:', data.error)
      return data
    }
    return data
  } catch (err) {
    console.error('Error al subir a Drive:', err)
    let errorDetail = err.message
    if (err.response && err.response.data instanceof Blob) {
      errorDetail = await err.response.data.text()
    } else if (err.response && err.response.data) {
      errorDetail = JSON.stringify(err.response.data)
    }
    return { ok: false, error: errorDetail || 'Error al subir a Drive.' }
  }
}

// ─── Preliquidación ───────────────────────────────────────────────────────────
function buildPreliquidacionDocument(preliq) {
  const estadoLabels = {
    pendiente: 'Pendiente', enviada: 'Enviada',
    para_revisar: 'Para revisar', confirmada: 'Confirmada', liquidada: 'Liquidada',
  }
  const extraMeta = `
    <div class="meta-box">
      <div class="meta-lbl">Estado</div>
      <div class="meta-val">${estadoLabels[preliq.estado] || preliq.estado || '-'}</div>
    </div>`

  const html = buildHTML({
    tipo: 'Preliquidación',
    id: preliq.id,
    proveedorNombre: preliq.proveedor_nombre,
    periodoDesde: preliq.periodo_desde,
    periodoHasta: preliq.periodo_hasta,
    fechaEmision: preliq.fecha,
    extraMeta,
    rows: preliq.detalles || [],
    totalSinIva: preliq.total_sin_iva,
    totalConIva: preliq.total_con_iva,
    gastosPeriodo: preliq.gastos_periodo,
    adeudadoFinal: preliq.adeudado_final,
    gastos: preliq.gastos || [],
  })

  const filename = buildFilename(preliq.periodo_desde, preliq.proveedor_nombre, 'PRELIQ')
  return { html, filename }
}

export async function savePreliquidacionToDrive(preliq) {
  if (!preliq.carpeta_drive_id) {
    return { ok: false, error: 'La preliquidacion no tiene carpeta de Drive configurada.' }
  }
  const { html, filename } = buildPreliquidacionDocument(preliq)
  return uploadToDrive(html, filename, preliq.carpeta_drive_id)
}

export function printPreliquidacion(preliq) {
  const { html, filename } = buildPreliquidacionDocument(preliq)
  openAndPrint(html, filename)
}

// ─── Liquidación ──────────────────────────────────────────────────────────────
function buildLiquidacionDocument(liq) {
  const extraMeta = liq.factura ? `
    <div class="meta-box">
      <div class="meta-lbl">N° Factura</div>
      <div class="meta-val">${liq.factura}</div>
    </div>` : `
    <div class="meta-box">
      <div class="meta-lbl">Estado de pago</div>
      <div class="meta-val">${{ pendiente: 'Pendiente', pagada_parcial: 'Pago parcial', pagada: 'Pagada' }[liq.estado_pago] || liq.estado_pago}</div>
    </div>`

  const html = buildHTML({
    tipo: 'Liquidación',
    id: liq.id,
    proveedorNombre: liq.proveedor_nombre,
    periodoDesde: liq.periodo_desde,
    periodoHasta: liq.periodo_hasta,
    fechaEmision: liq.fecha,
    extraMeta,
    rows: liq.detalles || [],
    totalSinIva: liq.total_sin_iva,
    totalConIva: liq.total_con_iva,
    gastosPeriodo: liq.gastos_periodo,
    adeudadoFinal: liq.adeudado_final,
    gastos: liq.gastos || [],
  })

  const filename = buildFilename(liq.periodo_desde, liq.proveedor_nombre, 'LIQUID')
  return { html, filename }
}

export async function saveLiquidacionToDrive(liq) {
  if (!liq.carpeta_drive_id) {
    return { ok: false, error: 'La liquidacion no tiene carpeta de Drive configurada.' }
  }
  const { html, filename } = buildLiquidacionDocument(liq)
  return uploadToDrive(html, filename, liq.carpeta_drive_id)
}

export function printLiquidacion(liq) {
  const { html, filename } = buildLiquidacionDocument(liq)
  openAndPrint(html, filename)
}
