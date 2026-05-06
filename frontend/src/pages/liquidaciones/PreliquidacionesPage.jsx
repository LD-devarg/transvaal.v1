import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Alert, CircularProgress, Autocomplete, Divider, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  InputAdornment, IconButton, Collapse,
} from '@mui/material'
import {
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as TruckIcon,
  CheckCircleOutlined as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Receipt as ReceiptIcon,
  Print as PrintIcon,
  CloudUpload as DriveIcon,
} from '@mui/icons-material'
import { printPreliquidacion, savePreliquidacionToDrive } from '../../utils/print'

const IVA = 1.21

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const todayISO = () => new Date().toISOString().slice(0, 10)

const ESTADO_CHIP = {
  pendiente:    { label: 'Pendiente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  enviada:      { label: 'Enviada',      color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  para_revisar: { label: 'Para revisar', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  confirmada:   { label: 'Confirmada',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  liquidada:    { label: 'Liquidada',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

const EstadoChip = ({ estado }) => {
  const cfg = ESTADO_CHIP[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
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

function calcTotales(selectedViajes, selectedGastos) {
  const totalSinIva = selectedViajes.reduce((sum, v) => {
    const tarifa = parseFloat(v.precio_tarifa) || 0
    const adics = (v.adicionales || []).reduce((s, a) => s + (parseFloat(a.precio_snapshot) || 0), 0)
    return sum + tarifa + adics
  }, 0)
  const totalConIva = totalSinIva * IVA
  const totalGastos = selectedGastos.reduce((s, g) => s + (g.total_gasto || 0), 0)
  const adeudado = totalConIva - totalGastos
  return { totalSinIva, totalConIva, totalGastos, adeudado }
}

export default function PreliquidacionesPage() {
  const [proveedores, setProveedores] = useState([])
  const [proveedor, setProveedor]     = useState(null)
  const [desde, setDesde]             = useState(todayISO)
  const [hasta, setHasta]             = useState(todayISO)

  const [viajes, setViajes]           = useState([])
  const [gastos, setGastos]           = useState([])
  const [buscado, setBuscado]         = useState(false)
  const [buscando, setBuscando]       = useState(false)

  const [selectedViajes, setSelectedViajes] = useState([])
  const [selectedGastos, setSelectedGastos] = useState([])

  const [historial, setHistorial]     = useState([])
  const [expandedPreliq, setExpandedPreliq] = useState(null)

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
      ? `/operaciones/preliquidaciones/?proveedor=${provId}`
      : '/operaciones/preliquidaciones/'
    client.get(url).then((r) => setHistorial(r.data))
  }, [])

  useEffect(() => {
    cargarHistorial(proveedor?.id || null)
  }, [proveedor, cargarHistorial])

  const handleBuscar = async () => {
    if (!proveedor || !desde || !hasta) return
    setBuscando(true)
    setBuscado(false)
    setSelectedViajes([])
    setSelectedGastos([])
    try {
      const [rv, rg] = await Promise.all([
        client.get(`/operaciones/viajes/?proveedor=${proveedor.id}&desde=${desde}&hasta=${hasta}&estado=habilitado&sin_preliquidar=true`),
        client.get(`/operaciones/gastos/?proveedor=${proveedor.id}&sin_preliquidar=true`),
      ])
      setViajes(rv.data)
      setGastos(rg.data)
      // Por defecto: seleccionar todos
      setSelectedViajes(rv.data)
      setSelectedGastos(rg.data)
      setBuscado(true)
    } finally {
      setBuscando(false)
    }
  }

  const toggleViaje = (v) => {
    setSelectedViajes((prev) =>
      prev.find((x) => x.id === v.id) ? prev.filter((x) => x.id !== v.id) : [...prev, v]
    )
  }

  const toggleGasto = (g) => {
    setSelectedGastos((prev) =>
      prev.find((x) => x.id === g.id) ? prev.filter((x) => x.id !== g.id) : [...prev, g]
    )
  }

  const { totalSinIva, totalConIva, totalGastos, adeudado } = calcTotales(selectedViajes, selectedGastos)

  const handleGenerar = async () => {
    if (!proveedor || !desde || !hasta || selectedViajes.length === 0) {
      setError('Seleccioná al menos un viaje.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        proveedor:     proveedor.id,
        periodo_desde: desde,
        periodo_hasta: hasta,
        viaje_ids:     selectedViajes.map((v) => v.id),
        gasto_ids:     selectedGastos.map((g) => g.id),
      }
      await client.post('/operaciones/preliquidaciones/generar/', payload)
      setSuccess('Preliquidación generada correctamente.')
      setBuscado(false)
      setViajes([])
      setGastos([])
      setSelectedViajes([])
      setSelectedGastos([])
      cargarHistorial(proveedor?.id || null)
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'Error al generar.')
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarEstado = async (preliqId, nuevoEstado) => {
    try {
      await client.patch(`/operaciones/preliquidaciones/${preliqId}/`, { estado: nuevoEstado })
      cargarHistorial(proveedor?.id || null)
    } catch {
      setError('No se pudo cambiar el estado.')
    }
  }

  const handleEnviarDrive = async (preliq) => {
    setSavingDriveId(preliq.id)
    setError('')
    setSuccess('')
    try {
      const driveResult = await savePreliquidacionToDrive(preliq)
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
          Preliquidaciones
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Card generar */}
          <Card sx={CARD}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <SectionLabel>Nueva preliquidación</SectionLabel>

              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Autocomplete
                    options={proveedores}
                    getOptionLabel={(o) => o.nombre ?? ''}
                    value={proveedor}
                    onChange={(_, v) => { setProveedor(v); setBuscado(false) }}
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
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                  <Button
                    fullWidth variant="outlined" size="small"
                    onClick={handleBuscar}
                    disabled={!proveedor || !desde || !hasta || buscando}
                    startIcon={buscando ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                    sx={{ height: 40, borderColor: 'rgba(59,130,246,0.5)', color: '#60a5fa', '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.08)' } }}
                  >
                    Buscar
                  </Button>
                </Grid>
              </Grid>

              {/* Viajes disponibles */}
              {buscado && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <SectionLabel>Viajes habilitados ({viajes.length})</SectionLabel>
                    {viajes.length > 0 && (
                      <Button size="small" sx={{ color: '#60a5fa', fontSize: 11, textTransform: 'none', py: 0 }}
                        onClick={() => setSelectedViajes(selectedViajes.length === viajes.length ? [] : [...viajes])}>
                        {selectedViajes.length === viajes.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                    )}
                  </Box>

                  {viajes.length === 0 ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, mb: 2 }}>
                      No hay viajes habilitados sin preliquidar en ese período.
                    </Typography>
                  ) : (
                    <Box sx={{ overflowX: 'auto', mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ ...TH, width: 40 }} padding="checkbox" />
                            <TableCell sx={TH}>Fecha</TableCell>
                            <TableCell sx={TH}>Cliente</TableCell>
                            <TableCell sx={TH}>Destino</TableCell>
                            <TableCell sx={TH}>Remito</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Precio</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {viajes.map((v) => {
                            const checked = !!selectedViajes.find((x) => x.id === v.id)
                            const adics = (v.adicionales || []).reduce((s, a) => s + (parseFloat(a.precio_snapshot) || 0), 0)
                            const precio = (parseFloat(v.precio_tarifa) || 0) + adics
                            return (
                              <TableRow key={v.id} hover onClick={() => toggleViaje(v)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                <TableCell padding="checkbox">
                                  <Checkbox checked={checked} size="small"
                                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#3b82f6' } }}
                                    onClick={(e) => e.stopPropagation()} onChange={() => toggleViaje(v)} />
                                </TableCell>
                                <TableCell sx={TD}>{fmtFecha(v.fecha)}</TableCell>
                                <TableCell sx={TD}>{v.cliente_nombre}</TableCell>
                                <TableCell sx={TD}>{v.salida_descripcion}</TableCell>
                                <TableCell sx={TD}>{v.remito || '-'}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right', color: checked ? '#60a5fa' : '#94a3b8' }}>
                                  {fmtPeso(precio)}
                                  {adics > 0 && <Typography component="span" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ml: 0.5 }}>+adic</Typography>}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </Box>
                  )}

                  {/* Gastos disponibles */}
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <SectionLabel>Gastos a descontar ({gastos.length})</SectionLabel>
                    {gastos.length > 0 && (
                      <Button size="small" sx={{ color: '#60a5fa', fontSize: 11, textTransform: 'none', py: 0 }}
                        onClick={() => setSelectedGastos(selectedGastos.length === gastos.length ? [] : [...gastos])}>
                        {selectedGastos.length === gastos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </Button>
                    )}
                  </Box>

                  {gastos.length === 0 ? (
                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
                      No hay gastos sin preliquidar para este proveedor.
                    </Typography>
                  ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ ...TH, width: 40 }} padding="checkbox" />
                            <TableCell sx={TH}>Fecha</TableCell>
                            <TableCell sx={TH}>Combustible</TableCell>
                            <TableCell sx={TH}>Varios</TableCell>
                            <TableCell sx={TH}>Adelanto</TableCell>
                            <TableCell sx={{ ...TH, textAlign: 'right' }}>Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {gastos.map((g) => {
                            const checked = !!selectedGastos.find((x) => x.id === g.id)
                            return (
                              <TableRow key={g.id} hover onClick={() => toggleGasto(g)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                <TableCell padding="checkbox">
                                  <Checkbox checked={checked} size="small"
                                    sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#3b82f6' } }}
                                    onClick={(e) => e.stopPropagation()} onChange={() => toggleGasto(g)} />
                                </TableCell>
                                <TableCell sx={TD}>{fmtFecha(g.fecha_gasto)}</TableCell>
                                <TableCell sx={TD}>{fmtPeso(g.total_combustible)}</TableCell>
                                <TableCell sx={TD}>{fmtPeso(g.total_varios)}</TableCell>
                                <TableCell sx={TD}>{fmtPeso(g.adelanto_otros)}</TableCell>
                                <TableCell sx={{ ...TD, textAlign: 'right', color: checked ? '#f87171' : '#94a3b8' }}>
                                  {fmtPeso(g.total_gasto)}
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
                        <TableCell sx={TH}>Período</TableCell>
                        <TableCell sx={TH}>Estado</TableCell>
                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Sin IVA</TableCell>
                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Gastos</TableCell>
                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Adeudado</TableCell>
                        <TableCell sx={TH}>Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historial.map((p) => (
                        <>
                          <TableRow key={p.id} hover
                            onClick={() => setExpandedPreliq(expandedPreliq === p.id ? null : p.id)}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                          >
                            <TableCell sx={TD}>{p.id}</TableCell>
                            <TableCell sx={TD}>{fmtFecha(p.periodo_desde)} – {fmtFecha(p.periodo_hasta)}</TableCell>
                            <TableCell sx={TD}><EstadoChip estado={p.estado} /></TableCell>
                            <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_sin_iva)}</TableCell>
                            <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_con_iva)}</TableCell>
                            <TableCell sx={{ ...TD, textAlign: 'right', color: '#f87171' }}>{fmtPeso(p.gastos_periodo)}</TableCell>
                            <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>{fmtPeso(p.adeudado_final)}</TableCell>
                            <TableCell sx={TD}>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {p.estado === 'pendiente' && (
                                  <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)', textTransform: 'none' }}
                                    variant="outlined"
                                    onClick={(e) => { e.stopPropagation(); handleCambiarEstado(p.id, 'enviada') }}>
                                    Enviar
                                  </Button>
                                )}
                                {p.estado === 'enviada' && (
                                  <>
                                    <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}
                                      variant="outlined"
                                      onClick={(e) => { e.stopPropagation(); handleCambiarEstado(p.id, 'confirmada') }}>
                                      Confirmar
                                    </Button>
                                    <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#f97316', borderColor: 'rgba(249,115,22,0.4)', textTransform: 'none' }}
                                      variant="outlined"
                                      onClick={(e) => { e.stopPropagation(); handleCambiarEstado(p.id, 'para_revisar') }}>
                                      Revisar
                                    </Button>
                                  </>
                                )}
                                {p.estado === 'para_revisar' && (
                                  <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)', textTransform: 'none' }}
                                    variant="outlined"
                                    onClick={(e) => { e.stopPropagation(); handleCambiarEstado(p.id, 'enviada') }}>
                                    Re-enviar
                                  </Button>
                                )}
                                <IconButton size="small" title="Imprimir"
                                  onClick={(e) => { e.stopPropagation(); printPreliquidacion(p) }}
                                  sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#60a5fa' } }}>
                                  <PrintIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                                <IconButton size="small" title="Enviar PDF a Drive"
                                  disabled={savingDriveId === p.id || !p.carpeta_drive_id}
                                  onClick={(e) => { e.stopPropagation(); handleEnviarDrive(p) }}
                                  sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#22c55e' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.12)' } }}>
                                  {savingDriveId === p.id ? <CircularProgress size={14} /> : <DriveIcon sx={{ fontSize: 15 }} />}
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                          {/* Detalle expandido */}
                          {expandedPreliq === p.id && (
                            <TableRow key={`det-${p.id}`}>
                              <TableCell colSpan={8} sx={{ p: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                                        <TableCell sx={TH}>Adicionales</TableCell>
                                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Sin IVA</TableCell>
                                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {(p.detalles || []).map((d) => (
                                        <TableRow key={d.id}>
                                          <TableCell sx={TD}>{fmtFecha(d.fecha_viaje)}</TableCell>
                                          <TableCell sx={TD}>{d.cliente_snapshot}</TableCell>
                                          <TableCell sx={TD}>{d.salida_snapshot}</TableCell>
                                          <TableCell sx={TD}>{d.remito_snapshot || '-'}</TableCell>
                                          <TableCell sx={TD}>
                                            {(d.adicionales_snapshot || []).length === 0 ? (
                                              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</Typography>
                                            ) : (
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                                {(d.adicionales_snapshot || []).map((a, i) => (
                                                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                    <Typography sx={{ fontSize: 11, color: '#cbd5e1' }}>
                                                      {a.nombre}{a.descripcion ? ` | ${a.descripcion}` : ''}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#94a3b8' }}>{fmtPeso(a.precio)}</Typography>
                                                  </Box>
                                                ))}
                                              </Box>
                                            )}
                                          </TableCell>
                                          <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(d.tarifa_sin_iva)}</TableCell>
                                          <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(d.tarifa_con_iva)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>

                                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10, mt: 2.5 }}>
                                    Gastos descontados
                                  </Typography>
                                  <Table size="small" sx={{ mt: 1 }}>
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={TH}>Fecha</TableCell>
                                        <TableCell sx={TH}>Combustible</TableCell>
                                        <TableCell sx={TH}>Varios</TableCell>
                                        <TableCell sx={TH}>Adelanto</TableCell>
                                        <TableCell sx={{ ...TH, textAlign: 'right' }}>Total</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {(p.gastos || []).length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={5} sx={{ ...TD, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                                            Sin gastos asociados.
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        (p.gastos || []).map((g) => (
                                          <TableRow key={g.id}>
                                            <TableCell sx={TD}>{fmtFecha(g.fecha_gasto)}</TableCell>
                                            <TableCell sx={TD}>{fmtPeso(g.total_combustible)}</TableCell>
                                            <TableCell sx={TD}>{fmtPeso(g.total_varios)}</TableCell>
                                            <TableCell sx={TD}>{fmtPeso(g.adelanto_otros)}</TableCell>
                                            <TableCell sx={{ ...TD, textAlign: 'right', color: '#f87171', fontWeight: 600 }}>{fmtPeso(g.total_gasto)}</TableCell>
                                          </TableRow>
                                        ))
                                      )}
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
            border: buscado && selectedViajes.length > 0
              ? '1px solid rgba(59,130,246,0.35)'
              : '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 0.3s',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#fff' }}>
                Resumen
              </Typography>

              {!buscado ? (
                <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                  Buscá viajes para ver el cálculo.
                </Typography>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Viajes seleccionados</Typography>
                    <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{selectedViajes.length}</Typography>
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

                  {selectedGastos.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                        Gastos ({selectedGastos.length})
                      </Typography>
                      <Typography sx={{ color: '#f87171', fontSize: 12 }}>− {fmtPeso(totalGastos)}</Typography>
                    </Box>
                  )}

                  <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
                  <Box sx={{ bgcolor: 'rgba(59,130,246,0.08)', borderRadius: 2, px: 1.5, py: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Adeudado final</Typography>
                      <Typography sx={{ color: '#60a5fa', fontWeight: 700, fontSize: 15 }}>{fmtPeso(adeudado)}</Typography>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {buscado && (
            <Button
              variant="contained" size="large" fullWidth
              onClick={handleGenerar}
              disabled={loading || selectedViajes.length === 0}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ReceiptIcon />}
              sx={{
                borderRadius: 2, py: 1.6, fontWeight: 700, fontSize: 15, letterSpacing: 0.5,
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', boxShadow: '0 4px 24px rgba(59,130,246,0.5)' },
                '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
              }}
            >
              {loading ? 'Generando...' : 'Generar preliquidación'}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  )
}

