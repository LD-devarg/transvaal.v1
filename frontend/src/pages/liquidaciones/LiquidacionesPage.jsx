import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Alert, CircularProgress, Autocomplete, Divider, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow,
  InputAdornment, Collapse, IconButton,
} from '@mui/material'
import {
  Search as SearchIcon,
  LocalShipping as TruckIcon,
  CheckCircleOutlined as CheckIcon,
  ReceiptLong as ReceiptIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  CloudUpload as DriveIcon,
} from '@mui/icons-material'
import { printLiquidacion, saveLiquidacionToDrive } from '../../utils/print'

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const todayISO = () => new Date().toISOString().slice(0, 10)

const ESTADO_PAGO_CHIP = {
  pendiente:      { label: 'Pendiente',           color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  pagada_parcial: { label: 'Pago parcial',        color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  pagada:         { label: 'Pagada',              color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
}

const EstadoPagoChip = ({ estado }) => {
  const cfg = ESTADO_PAGO_CHIP[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return (
    <Box sx={{
      display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5,
      bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11, letterSpacing: 0.4,
    }}>
      {cfg.label}
    </Box>
  )
}

const darkField = {
  '& .MuiOutlinedInput-root': {
    color: '#fff', fontSize: 13,
    bgcolor: 'rgba(255,255,255,0.03)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
  '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.35)' },
  '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.3)', fontSize: 18 },
}

const CARD = {
  bgcolor: '#1e293b',
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: 'none',
}

const TH = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD = { color: '#cbd5e1', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1 }

const SectionLabel = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Box sx={{ width: 3, height: 16, borderRadius: 4, bgcolor: '#3b82f6' }} />
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
      {children}
    </Typography>
  </Box>
)

function calcResumen(selectedPreliquidaciones) {
  const totalSinIva  = selectedPreliquidaciones.reduce((s, p) => s + parseFloat(p.total_sin_iva  || 0), 0)
  const totalConIva  = selectedPreliquidaciones.reduce((s, p) => s + parseFloat(p.total_con_iva  || 0), 0)
  const totalGastos  = selectedPreliquidaciones.reduce((s, p) => s + parseFloat(p.gastos_periodo || 0), 0)
  const adeudado     = selectedPreliquidaciones.reduce((s, p) => s + parseFloat(p.adeudado_final || 0), 0)
  return { totalSinIva, totalConIva, totalGastos, adeudado }
}

export default function LiquidacionesPage() {
  const [proveedores, setProveedores]           = useState([])
  const [proveedor, setProveedor]               = useState(null)

  const [preliqsConfirmadas, setPreliqsConfirmadas] = useState([])
  const [cargandoPraliqs, setCargandoPreliqss]      = useState(false)

  const [selected, setSelected]                 = useState([])
  const [factura, setFactura]                   = useState('')
  const [fechaPago, setFechaPago]               = useState(todayISO)

  const [historial, setHistorial]               = useState([])
  const [expandedLiq, setExpandedLiq]           = useState(null)

  const [loading, setLoading]   = useState(false)
  const [savingDriveId, setSavingDriveId] = useState(null)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  useEffect(() => {
    client.get('/maestros/proveedores/').then((r) => setProveedores(r.data))
    cargarHistorial(null)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cargarHistorial = useCallback((provId) => {
    const url = provId
      ? `/operaciones/liquidaciones/?proveedor=${provId}`
      : '/operaciones/liquidaciones/'
    client.get(url).then((r) => setHistorial(r.data))
  }, [])

  const cargarPreliqsConfirmadas = useCallback(async (provId) => {
    if (!provId) { setPreliqsConfirmadas([]); return }
    setCargandoPreliqss(true)
    try {
      const r = await client.get(`/operaciones/preliquidaciones/?proveedor=${provId}&estado=confirmada`)
      setPreliqsConfirmadas(r.data)
      setSelected(r.data) // por defecto todas seleccionadas
    } finally {
      setCargandoPreliqss(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorial(proveedor?.id || null)
    cargarPreliqsConfirmadas(proveedor?.id || null)
    setFactura('')
    setFechaPago(todayISO())
    setSelected([])
  }, [proveedor, cargarHistorial, cargarPreliqsConfirmadas])

  const togglePreliq = (p) => {
    setSelected((prev) =>
      prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]
    )
  }

  const { totalSinIva, totalConIva, totalGastos, adeudado } = calcResumen(selected)

  const handleGenerar = async () => {
    if (!proveedor || selected.length === 0) {
      setError('Seleccioná al menos una preliquidación confirmada.')
      return
    }
    if (!factura.trim() || !fechaPago) {
      setError('Completá número de factura y fecha de pago.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        preliquidacion_ids: selected.map((p) => p.id),
        gastos_periodo:     totalGastos.toFixed(2),
        factura:            factura.trim(),
        fecha_pago:          fechaPago,
      }
      await client.post('/operaciones/liquidaciones/generar/', payload)
      setSuccess('Liquidación generada correctamente.')
      setFactura('')
      setFechaPago(todayISO())
      setSelected([])
      cargarPreliqsConfirmadas(proveedor.id)
      cargarHistorial(proveedor.id)
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'Error al generar.')
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarEstadoPago = async (liqId, nuevoEstado) => {
    try {
      await client.patch(`/operaciones/liquidaciones/${liqId}/`, { estado_pago: nuevoEstado })
      cargarHistorial(proveedor?.id || null)
    } catch {
      setError('No se pudo cambiar el estado de pago.')
    }
  }

  const handleEnviarDrive = async (liq) => {
    setSavingDriveId(liq.id)
    setError('')
    setSuccess('')
    try {
      const driveResult = await saveLiquidacionToDrive(liq)
      if (driveResult && !driveResult.ok) {
        setError(`No se pudo guardar el PDF en Drive: ${driveResult.error || 'error desconocido'}`)
        return
      }
      setSuccess('PDF guardado en Drive correctamente.')
    } catch (err) {
      setError(err.message || 'No se pudo guardar el PDF en Drive.')
    } finally {
      setSavingDriveId(null)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
          Liquidaciones
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>
          Liquidaciones
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" icon={<CheckIcon />}
          sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          onClose={() => setSuccess('')}>{success}</Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' }, gap: 2.5, alignItems: 'start' }}>

        {/* Columna principal */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Card generar */}
          <Card sx={CARD}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <SectionLabel>Nueva liquidación</SectionLabel>

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Autocomplete
                    options={proveedores}
                    getOptionLabel={(o) => o.nombre ?? ''}
                    value={proveedor}
                    onChange={(_, v) => setProveedor(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Proveedor" size="small" sx={darkField}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (<><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</>),
                        }}
                      />
                    )}
                    sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    label="N° Factura" value={factura}
                    onChange={(e) => setFactura(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><ReceiptIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              {/* Preliquidaciones confirmadas */}
              {proveedor && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <SectionLabel>
                      Preliquidaciones confirmadas
                      {cargandoPraliqs ? ' …' : ` (${preliqsConfirmadas.length})`}
                    </SectionLabel>
                    {preliqsConfirmadas.length > 0 && (
                      <Button size="small" sx={{ color: '#60a5fa', fontSize: 11, textTransform: 'none', py: 0 }}
                        onClick={() => setSelected(selected.length === preliqsConfirmadas.length ? [] : [...preliqsConfirmadas])}>
                        {selected.length === preliqsConfirmadas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                      </Button>
                    )}
                  </Box>

                  {cargandoPraliqs ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                    </Box>
                  ) : preliqsConfirmadas.length === 0 ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, mb: 2 }}>
                      No hay preliquidaciones confirmadas para este proveedor.
                    </Typography>
                  ) : (
                    <Box sx={{ overflowX: 'auto', mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ ...TH, width: 40 }} padding="checkbox" />
                            <TableCell sx={TH}>#</TableCell>
                            <TableCell sx={TH}>Período</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Sin IVA</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Gastos</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Adeudado</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {preliqsConfirmadas.map((p) => {
                            const checked = !!selected.find((x) => x.id === p.id)
                            return (
                              <TableRow key={p.id} hover onClick={() => togglePreliq(p)}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                <TableCell padding="checkbox">
                                  <Checkbox checked={checked} size="small"
                                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#3b82f6' } }}
                                    onClick={(e) => e.stopPropagation()} onChange={() => togglePreliq(p)} />
                                </TableCell>
                                <TableCell sx={TD}>{p.id}</TableCell>
                                <TableCell sx={TD}>{fmtFecha(p.periodo_desde)} – {fmtFecha(p.periodo_hasta)}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_sin_iva)}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_con_iva)}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right', color: '#f87171' }}>{fmtPeso(p.gastos_periodo)}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right', color: checked ? '#60a5fa' : '#94a3b8', fontWeight: checked ? 600 : 400 }}>
                                  {fmtPeso(p.adeudado_final)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Historial */}
          <Card sx={CARD}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <SectionLabel>Historial{proveedor ? ` — ${proveedor.nombre}` : ' — Todos los proveedores'}</SectionLabel>
              <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={TH}>#</TableCell>
                      <TableCell sx={TH}>Fecha</TableCell>
                      <TableCell sx={TH}>Período</TableCell>
                      <TableCell sx={TH}>Factura</TableCell>
                      <TableCell sx={TH}>Fecha pago</TableCell>
                      <TableCell sx={TH}>Estado pago</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Gastos</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Adeudado</TableCell>
                      <TableCell sx={TH}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historial.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} sx={{ ...TD, textAlign: 'center', py: 3, color: 'rgba(255,255,255,0.2)' }}>
                          No hay liquidaciones registradas.
                        </TableCell>
                      </TableRow>
                    )}
                    {historial.map((liq) => (
                      <>
                        <TableRow key={liq.id} hover
                          onClick={() => setExpandedLiq(expandedLiq === liq.id ? null : liq.id)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                          <TableCell sx={TD}>{liq.id}</TableCell>
                          <TableCell sx={TD}>{fmtFecha(liq.fecha)}</TableCell>
                          <TableCell sx={TD}>{fmtFecha(liq.periodo_desde)} – {fmtFecha(liq.periodo_hasta)}</TableCell>
                          <TableCell sx={{ ...TD, color: liq.factura ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}>
                            {liq.factura || '—'}
                          </TableCell>
                          <TableCell sx={TD}>{fmtFecha(liq.fecha_pago)}</TableCell>
                          <TableCell sx={TD}><EstadoPagoChip estado={liq.estado_pago} /></TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(liq.total_con_iva)}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right', color: '#f87171' }}>{fmtPeso(liq.gastos_periodo)}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>{fmtPeso(liq.adeudado_final)}</TableCell>
                          <TableCell sx={TD}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {liq.estado_pago === 'pendiente' && (
                                <Button size="small" variant="outlined"
                                  sx={{ fontSize: 10, py: 0.2, px: 1, color: '#f97316', borderColor: 'rgba(249,115,22,0.4)', textTransform: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); handleCambiarEstadoPago(liq.id, 'pagada_parcial') }}>
                                  Pago parcial
                                </Button>
                              )}
                              {liq.estado_pago === 'pagada_parcial' && (
                                <Button size="small" variant="outlined"
                                  sx={{ fontSize: 10, py: 0.2, px: 1, color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); handleCambiarEstadoPago(liq.id, 'pagada') }}>
                                  Marcar pagada
                                </Button>
                              )}
                              <IconButton size="small" title="Imprimir"
                                onClick={(e) => { e.stopPropagation(); printLiquidacion(liq) }}
                                sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#60a5fa' } }}>
                                <PrintIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                              <IconButton size="small" title="Enviar PDF a Drive"
                                disabled={savingDriveId === liq.id || !liq.carpeta_drive_id}
                                onClick={(e) => { e.stopPropagation(); handleEnviarDrive(liq) }}
                                sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#22c55e' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.12)' } }}>
                                {savingDriveId === liq.id ? <CircularProgress size={14} /> : <DriveIcon sx={{ fontSize: 15 }} />}
                              </IconButton>
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
                                {expandedLiq === liq.id ? <ExpandLessIcon fontSize="inherit" /> : <ExpandMoreIcon fontSize="inherit" />}
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>

                        {/* Detalle expandido */}
                        {expandedLiq === liq.id && (
                          <TableRow key={`det-${liq.id}`}>
                            <TableCell colSpan={10} sx={{ p: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', px: 3, py: 2 }}>
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                                  Detalle de viajes
                                </Typography>
                                <Table size="small" sx={{ mt: 1 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={TH}>Fecha</TableCell>
                                      <TableCell sx={TH}>Cliente</TableCell>
                                      <TableCell sx={TH}>Destino</TableCell>
                                      <TableCell sx={TH}>Remito</TableCell>
                                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Sin IVA</TableCell>
                                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(liq.detalles || []).length === 0 && (
                                      <TableRow>
                                        <TableCell colSpan={6} sx={{ ...TD, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
                                          Sin detalles.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                    {(liq.detalles || []).map((d) => (
                                      <TableRow key={d.id}>
                                        <TableCell sx={TD}>{fmtFecha(d.fecha_viaje)}</TableCell>
                                        <TableCell sx={TD}>{d.cliente_snapshot}</TableCell>
                                        <TableCell sx={TD}>{d.salida_snapshot}</TableCell>
                                        <TableCell sx={TD}>{d.remito_snapshot || '-'}</TableCell>
                                        <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(d.tarifa_sin_iva)}</TableCell>
                                        <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(d.tarifa_con_iva)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Panel lateral resumen */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card sx={{
            ...CARD,
            border: selected.length > 0
              ? '1px solid rgba(59,130,246,0.35)'
              : '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 0.3s',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#fff' }}>
                Resumen
              </Typography>

              {selected.length === 0 ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                  Seleccioná preliquidaciones confirmadas para ver el cálculo.
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Preliquidaciones</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{selected.length}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Total sin IVA</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 12 }}>{fmtPeso(totalSinIva)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>IVA 21%</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 12 }}>{fmtPeso(totalConIva - totalSinIva)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Total con IVA</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 12 }}>{fmtPeso(totalConIva)}</Typography>
                  </Box>

                  {totalGastos > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Gastos</Typography>
                      <Typography sx={{ color: '#f87171', fontSize: 12 }}>− {fmtPeso(totalGastos)}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600 }}>Adeudado</Typography>
                    <Typography sx={{ color: '#60a5fa', fontSize: 14, fontWeight: 700 }}>{fmtPeso(adeudado)}</Typography>
                  </Box>
                </>
              )}

              <Button
                fullWidth variant="contained"
                onClick={handleGenerar}
                disabled={loading || !proveedor || selected.length === 0}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <MoneyIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  borderRadius: 2, py: 1.2, fontWeight: 700, fontSize: 13,
                  boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
                  '&:disabled': { background: 'rgba(59,130,246,0.2)', color: 'rgba(255,255,255,0.3)' },
                }}
              >
                Generar liquidación
              </Button>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

