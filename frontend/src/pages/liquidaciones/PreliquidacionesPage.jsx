import { Fragment, useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Alert, CircularProgress, Autocomplete, Divider, Checkbox,
  Table, TableBody, TableCell, TableHead, TableRow, Chip,
  InputAdornment, IconButton, Collapse, TableSortLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
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
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { printPreliquidacion, savePreliquidacionToDrive, sendPreliquidacionToTelegram } from '../../utils/print'

const IVA = 1.21

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const todayISO = () => new Date().toISOString().slice(0, 10)

const ESTADO_CHIP = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  enviada: { label: 'Enviada', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  para_revisar: { label: 'Para revisar', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  confirmada: { label: 'Confirmada', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  liquidada: { label: 'Liquidada', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
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

const canModificarPreliq = (preliq) => ['pendiente', 'enviada', 'para_revisar'].includes(preliq?.estado)

const errorMessage = (err, fallback) => {
  const data = err.response?.data
  if (data?.detail) return data.detail
  if (typeof data === 'string') return data.slice(0, 240)
  if (err.message) return err.message
  return fallback
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
  const [proveedor, setProveedor] = useState(null)
  const [desde, setDesde] = useState(todayISO)
  const [hasta, setHasta] = useState(todayISO)

  const [viajes, setViajes] = useState([])
  const [gastos, setGastos] = useState([])
  const [buscado, setBuscado] = useState(false)
  const [buscando, setBuscando] = useState(false)

  const [selectedViajes, setSelectedViajes] = useState([])
  const [selectedGastos, setSelectedGastos] = useState([])

  const [historial, setHistorial] = useState([])
  const [historialFiltro, setHistorialFiltro] = useState(null)
  const [histProveedor, setHistProveedor] = useState(null)
  const [histDesde, setHistDesde] = useState('')
  const [histHasta, setHistHasta] = useState('')
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [expandedPreliq, setExpandedPreliq] = useState(null)

  const [order, setOrder] = useState('desc')
  const [orderBy, setOrderBy] = useState('id')

  const [loading, setLoading] = useState(false)
  const [sendingTelegramId, setSendingTelegramId] = useState(null)
  const [viajesDisponibles, setViajesDisponibles] = useState({})
  const [loadingViajesDisponibles, setLoadingViajesDisponibles] = useState({})
  const [modificandoViaje, setModificandoViaje] = useState(null)
  const [confirmandoLiq, setConfirmandoLiq] = useState(false)
  const [preliqAConfirmar, setPreliqAConfirmar] = useState(null)
  const [fechaPago, setFechaPago] = useState(todayISO)
  const [numeroFactura, setNumeroFactura] = useState('')
  const [savingDriveId, setSavingDriveId] = useState(null)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/maestros/proveedores/').then((r) => setProveedores(r.data))
  }, [])

  const cargarHistorial = useCallback(async (provId, desdePeriodo, hastaPeriodo) => {
    const params = new URLSearchParams()
    if (provId) params.set('proveedor', provId)
    if (desdePeriodo) params.set('desde', desdePeriodo)
    if (hastaPeriodo) params.set('hasta', hastaPeriodo)
    const query = params.toString()
    const url = query ? `/operaciones/preliquidaciones/?${query}` : '/operaciones/preliquidaciones/'
    setCargandoHistorial(true)
    try {
      const r = await client.get(url)
      setHistorial(r.data)
    } finally {
      setCargandoHistorial(false)
    }
  }, [])

  useEffect(() => {
    cargarHistorial(null)
  }, [cargarHistorial])

  const refrescarHistorial = useCallback(() => {
    if (!historialFiltro) {
      cargarHistorial(null)
      return
    }
    cargarHistorial(historialFiltro.proveedorId, historialFiltro.desdePeriodo, historialFiltro.hastaPeriodo)
  }, [cargarHistorial, historialFiltro])

  const handleBuscarHistorial = () => {
    const tieneFiltro = !!histProveedor || !!histDesde || !!histHasta
    const filtro = {
      proveedorId: histProveedor?.id || null,
      proveedorNombre: histProveedor?.nombre || null,
      desdePeriodo: histDesde || null,
      hastaPeriodo: histHasta || null,
    }
    setHistorialFiltro(tieneFiltro ? filtro : null)
    cargarHistorial(filtro.proveedorId, filtro.desdePeriodo, filtro.hastaPeriodo)
  }

  const handleLimpiarHistorial = () => {
    setHistProveedor(null)
    setHistDesde('')
    setHistHasta('')
    setHistorialFiltro(null)
    cargarHistorial(null)
  }

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
        proveedor: proveedor.id,
        periodo_desde: desde,
        periodo_hasta: hasta,
        viaje_ids: selectedViajes.map((v) => v.id),
        gasto_ids: selectedGastos.map((g) => g.id),
      }
      await client.post('/operaciones/preliquidaciones/generar/', payload)
      setSuccess('Preliquidación generada correctamente.')
      setBuscado(false)
      setViajes([])
      setGastos([])
      setSelectedViajes([])
      setSelectedGastos([])
      refrescarHistorial()
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'Error al generar.')
    } finally {
      setLoading(false)
    }
  }

  const handleCambiarEstado = async (preliqId, nuevoEstado) => {
    setError('')
    setSuccess('')
    try {
      await client.patch(`/operaciones/preliquidaciones/${preliqId}/`, { estado: nuevoEstado })
      const mensajes = {
        enviada: 'Preliquidación enviada.',
        confirmada: 'Preliquidación confirmada.',
        para_revisar: 'Preliquidación rechazada.',
      }
      setSuccess(mensajes[nuevoEstado] || 'Estado actualizado.')
      refrescarHistorial()
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'No se pudo cambiar el estado.')
    }
  }

  const handleEnviarPreliquidacion = async (preliq) => {
    setSendingTelegramId(preliq.id)
    setError('')
    setSuccess('')
    try {
      await client.patch(`/operaciones/preliquidaciones/${preliq.id}/`, { estado: 'enviada' })
      try {
        await sendPreliquidacionToTelegram(preliq)
        setSuccess('Preliquidación enviada y Telegram entregado.')
      } catch (telegramErr) {
        setSuccess('Preliquidación enviada.')
        setError(errorMessage(telegramErr, 'No se pudo enviar el PDF por Telegram.'))
      }
      refrescarHistorial()
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'No se pudo enviar la preliquidación.')
    } finally {
      setSendingTelegramId(null)
    }
  }

  const abrirConfirmacionLiquidacion = (preliq) => {
    setError('')
    setSuccess('')
    setPreliqAConfirmar(preliq)
    setFechaPago(todayISO())
    setNumeroFactura('')
  }

  const cerrarConfirmacionLiquidacion = () => {
    if (confirmandoLiq) return
    setPreliqAConfirmar(null)
    setFechaPago(todayISO())
    setNumeroFactura('')
  }

  const handleConfirmarYLiquidar = async () => {
    if (!preliqAConfirmar) return
    if (!fechaPago || !numeroFactura.trim()) {
      setError('Completá fecha de pago y número de factura.')
      return
    }

    setConfirmandoLiq(true)
    setError('')
    setSuccess('')
    try {
      await client.post('/operaciones/liquidaciones/generar/', {
        preliquidacion_ids: [preliqAConfirmar.id],
        gastos_periodo: preliqAConfirmar.gastos_periodo || '0',
        factura: numeroFactura.trim(),
        fecha_pago: fechaPago,
      })
      setSuccess('Liquidación generada correctamente.')
      setPreliqAConfirmar(null)
      setFechaPago(todayISO())
      setNumeroFactura('')
      refrescarHistorial()
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'No se pudo generar la liquidación.')
    } finally {
      setConfirmandoLiq(false)
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
      await client.patch(`/operaciones/preliquidaciones/${preliq.id}/`, { enviado_a_drive: true })
      setHistorial((prev) => prev.map((p) => (p.id === preliq.id ? { ...p, enviado_a_drive: true } : p)))
      setSuccess('PDF guardado en Drive correctamente.')
      refrescarHistorial()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el PDF en Drive.')
    } finally {
      setSavingDriveId(null)
    }
  }

  const actualizarPreliqEnHistorial = (preliqActualizada) => {
    setHistorial((prev) => prev.map((p) => (p.id === preliqActualizada.id ? preliqActualizada : p)))
  }

  const cargarViajesDisponibles = async (preliq) => {
    setLoadingViajesDisponibles((prev) => ({ ...prev, [preliq.id]: true }))
    setError('')
    try {
      const params = new URLSearchParams({
        proveedor: String(preliq.proveedor),
        desde: preliq.periodo_desde,
        hasta: preliq.periodo_hasta,
        estado: 'habilitado',
        sin_preliquidar: 'true',
      })
      const r = await client.get(`/operaciones/viajes/?${params.toString()}`)
      setViajesDisponibles((prev) => ({ ...prev, [preliq.id]: r.data }))
    } catch (err) {
      setError(errorMessage(err, 'No se pudieron cargar viajes disponibles.'))
    } finally {
      setLoadingViajesDisponibles((prev) => ({ ...prev, [preliq.id]: false }))
    }
  }

  const handleAgregarViajePreliq = async (preliq, viaje) => {
    setModificandoViaje(`${preliq.id}-add-${viaje.id}`)
    setError('')
    setSuccess('')
    try {
      const r = await client.post(`/operaciones/preliquidaciones/${preliq.id}/viajes/`, { viaje_id: viaje.id })
      actualizarPreliqEnHistorial(r.data)
      setViajesDisponibles((prev) => ({
        ...prev,
        [preliq.id]: (prev[preliq.id] || []).filter((v) => v.id !== viaje.id),
      }))
      setSuccess('Viaje agregado. La preliquidacion volvio a pendiente para reenviar.')
    } catch (err) {
      setError(errorMessage(err, 'No se pudo agregar el viaje.'))
    } finally {
      setModificandoViaje(null)
    }
  }

  const handleQuitarViajePreliq = async (preliq, detalle) => {
    setModificandoViaje(`${preliq.id}-del-${detalle.viaje}`)
    setError('')
    setSuccess('')
    try {
      const r = await client.delete(`/operaciones/preliquidaciones/${preliq.id}/viajes/${detalle.viaje}/`)
      actualizarPreliqEnHistorial(r.data)
      setViajesDisponibles((prev) => {
        if (!prev[preliq.id]) return prev
        return { ...prev, [preliq.id]: [] }
      })
      setSuccess('Viaje quitado. La preliquidacion volvio a pendiente para reenviar.')
    } catch (err) {
      setError(errorMessage(err, 'No se pudo quitar el viaje.'))
    } finally {
      setModificandoViaje(null)
    }
  }

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const sortedHistorial = [...historial].sort((a, b) => {
    let valA = a[orderBy]
    let valB = b[orderBy]

    if (orderBy === 'proveedor_nombre') {
      valA = (valA || '').toLowerCase()
      valB = (valB || '').toLowerCase()
    } else if (orderBy === 'periodo_desde') {
      valA = valA || ''
      valB = valB || ''
    }

    if (valA < valB) return order === 'asc' ? -1 : 1
    if (valA > valB) return order === 'asc' ? 1 : -1
    return 0
  })

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
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

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

        {/* Columna principal */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

          {/* Card generar */}
          <Card sx={CARD}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <SectionLabel>Nueva preliquidación</SectionLabel>

              <Grid container spacing={2} sx={{ mb: 1 }}>
                <Grid size={{ xs: 12, sm: 3 }}>
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
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }} >
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

              {buscado && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 2.5 }} />
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(5, minmax(0, 1fr)) auto' },
                    alignItems: 'center',
                    gap: 1.5,
                  }}>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Viajes</Typography>
                      <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{selectedViajes.length}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Sin IVA</Typography>
                      <Typography sx={{ color: '#fff', fontSize: 14 }}>{fmtPeso(totalSinIva)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Con IVA</Typography>
                      <Typography sx={{ color: '#fff', fontSize: 14 }}>{fmtPeso(totalConIva)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Gastos</Typography>
                      <Typography sx={{ color: '#f87171', fontSize: 14 }}>{fmtPeso(totalGastos)}</Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Adeudado</Typography>
                      <Typography sx={{ color: '#60a5fa', fontSize: 15, fontWeight: 700 }}>{fmtPeso(adeudado)}</Typography>
                    </Box>
                    <Button
                      variant="contained" size="large"
                      onClick={handleGenerar}
                      disabled={loading || selectedViajes.length === 0}
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ReceiptIcon />}
                      sx={{
                        minWidth: 220, borderRadius: 2, py: 1.3, fontWeight: 700, fontSize: 13,
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
                        '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', boxShadow: '0 4px 24px rgba(59,130,246,0.5)' },
                        '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
                      }}
                    >
                      {loading ? 'Generando...' : 'Generar preliquidacion'}
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Historial */}
          <Card sx={CARD}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <SectionLabel>Historial{historialFiltro?.proveedorNombre ? ` - ${historialFiltro.proveedorNombre}` : ' - Todos los proveedores'}</SectionLabel>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Autocomplete
                    options={proveedores}
                    getOptionLabel={(o) => o.nombre ?? ''}
                    value={histProveedor}
                    onChange={(_, v) => setHistProveedor(v)}
                    renderInput={(params) => (
                      <TextField {...params} label="Proveedor / Chofer" size="small" sx={darkField}
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (<><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</>),
                        }}
                      />
                    )}
                    sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    label="Desde" type="date" value={histDesde} onChange={(e) => setHistDesde(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <TextField
                    label="Hasta" type="date" value={histHasta} onChange={(e) => setHistHasta(e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Button
                    fullWidth variant="outlined" size="small"
                    onClick={handleBuscarHistorial}
                    disabled={cargandoHistorial}
                    startIcon={cargandoHistorial ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}
                    sx={{ height: 40, borderColor: 'rgba(59,130,246,0.5)', color: '#60a5fa', '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.08)' } }}
                  >
                    Buscar
                  </Button>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Button
                    fullWidth variant="text" size="small"
                    onClick={handleLimpiarHistorial}
                    disabled={cargandoHistorial}
                    sx={{ height: 40, color: 'rgba(255,255,255,0.45)', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}
                  >
                    Ver todas
                  </Button>
                </Grid>
              </Grid>
              <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 420 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={TH}>
                        <TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'asc'} onClick={() => handleRequestSort('id')} sx={{ color: 'inherit !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}>#</TableSortLabel>
                      </TableCell>
                      <TableCell sx={TH}>
                        <TableSortLabel active={orderBy === 'periodo_desde'} direction={orderBy === 'periodo_desde' ? order : 'asc'} onClick={() => handleRequestSort('periodo_desde')} sx={{ color: 'inherit !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}>Período</TableSortLabel>
                      </TableCell>
                      <TableCell sx={TH}>
                        <TableSortLabel active={orderBy === 'proveedor_nombre'} direction={orderBy === 'proveedor_nombre' ? order : 'asc'} onClick={() => handleRequestSort('proveedor_nombre')} sx={{ color: 'inherit !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}>Proveedor / Chofer</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Sin IVA</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Con IVA</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Gastos</TableCell>
                      <TableCell sx={{ ...TH, textAlign: 'right' }}>Adeudado</TableCell>
                      <TableCell sx={TH}>
                        <TableSortLabel active={orderBy === 'estado'} direction={orderBy === 'estado' ? order : 'asc'} onClick={() => handleRequestSort('estado')} sx={{ color: 'inherit !important', '& .MuiTableSortLabel-icon': { color: 'rgba(255,255,255,0.7) !important' } }}>Estado</TableSortLabel>
                      </TableCell>
                      <TableCell sx={TH}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedHistorial.map((p) => (
                      <Fragment key={p.id}>
                        <TableRow hover
                          onClick={() => setExpandedPreliq(expandedPreliq === p.id ? null : p.id)}
                          sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                          <TableCell sx={TD}>{p.id}</TableCell>
                          <TableCell sx={TD}>{fmtFecha(p.periodo_desde)} – {fmtFecha(p.periodo_hasta)}</TableCell>
                          <TableCell sx={{ ...TD, color: '#e2e8f0', fontWeight: 600 }}>{p.proveedor_nombre || '-'}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_sin_iva)}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(p.total_con_iva)}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right', color: '#f87171' }}>{fmtPeso(p.gastos_periodo)}</TableCell>
                          <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa', fontWeight: 600 }}>{fmtPeso(p.adeudado_final)}</TableCell>
                          <TableCell sx={TD}><EstadoChip estado={p.estado} /></TableCell>
                          <TableCell sx={TD}>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {p.estado === 'pendiente' && (
                                <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)', textTransform: 'none' }}
                                  variant="outlined"
                                  disabled={sendingTelegramId === p.id}
                                  onClick={(e) => { e.stopPropagation(); handleEnviarPreliquidacion(p) }}>
                                  {sendingTelegramId === p.id ? 'Enviando...' : 'Enviar'}
                                </Button>
                              )}
                              {p.estado === 'enviada' && (
                                <>
                                  <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', textTransform: 'none' }}
                                    variant="outlined"
                                    onClick={(e) => { e.stopPropagation(); abrirConfirmacionLiquidacion(p) }}>
                                    Confirmar
                                  </Button>
                                  <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#f97316', borderColor: 'rgba(249,115,22,0.4)', textTransform: 'none' }}
                                    variant="outlined"
                                    onClick={(e) => { e.stopPropagation(); handleCambiarEstado(p.id, 'para_revisar') }}>
                                    Rechazar
                                  </Button>
                                </>
                              )}
                              {p.estado === 'para_revisar' && (
                                <Button size="small" sx={{ fontSize: 10, py: 0.2, px: 1, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)', textTransform: 'none' }}
                                  variant="outlined"
                                  disabled={sendingTelegramId === p.id}
                                  onClick={(e) => { e.stopPropagation(); handleEnviarPreliquidacion(p) }}>
                                  {sendingTelegramId === p.id ? 'Enviando...' : 'Re-enviar'}
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
                                sx={{ color: p.enviado_a_drive ? '#22c55e' : 'rgba(255,255,255,0.25)', '&:hover': { color: '#22c55e' }, '&.Mui-disabled': { color: 'rgba(255,255,255,0.12)' } }}>
                                {savingDriveId === p.id ? <CircularProgress size={14} /> : <DriveIcon sx={{ fontSize: 15 }} />}
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                        {/* Detalle expandido */}
                        {expandedPreliq === p.id && (
                          <TableRow key={`det-${p.id}`}>
                            <TableCell colSpan={9} sx={{ p: 0, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                                      {canModificarPreliq(p) && <TableCell sx={{ ...TH, width: 44 }} />}
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
                                        {canModificarPreliq(p) && (
                                          <TableCell sx={TD}>
                                            <IconButton size="small" title="Quitar viaje"
                                              disabled={modificandoViaje === `${p.id}-del-${d.viaje}`}
                                              onClick={(e) => { e.stopPropagation(); handleQuitarViajePreliq(p, d) }}
                                              sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#f87171' } }}>
                                              {modificandoViaje === `${p.id}-del-${d.viaje}` ? <CircularProgress size={14} /> : <DeleteIcon sx={{ fontSize: 15 }} />}
                                            </IconButton>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>

                                {canModificarPreliq(p) && (
                                  <Box sx={{ mt: 2.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 10 }}>
                                        Agregar viajes habilitados
                                      </Typography>
                                      <Button size="small" variant="text"
                                        disabled={!!loadingViajesDisponibles[p.id]}
                                        startIcon={loadingViajesDisponibles[p.id] ? <CircularProgress size={13} color="inherit" /> : <SearchIcon />}
                                        onClick={(e) => { e.stopPropagation(); cargarViajesDisponibles(p) }}
                                        sx={{ color: '#60a5fa', fontSize: 11, textTransform: 'none', py: 0 }}>
                                        Buscar disponibles
                                      </Button>
                                    </Box>
                                    {viajesDisponibles[p.id] && (
                                      viajesDisponibles[p.id].length === 0 ? (
                                        <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                                          No hay viajes habilitados sin preliquidar para este proveedor y periodo.
                                        </Typography>
                                      ) : (
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell sx={TH}>Fecha</TableCell>
                                              <TableCell sx={TH}>Cliente</TableCell>
                                              <TableCell sx={TH}>Destino</TableCell>
                                              <TableCell sx={TH}>Remito</TableCell>
                                              <TableCell sx={{ ...TH, textAlign: 'right' }}>Precio</TableCell>
                                              <TableCell sx={{ ...TH, width: 44 }} />
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {viajesDisponibles[p.id].map((v) => {
                                              const adics = (v.adicionales || []).reduce((s, a) => s + (parseFloat(a.precio_snapshot) || 0), 0)
                                              const precio = (parseFloat(v.precio_tarifa) || 0) + adics
                                              return (
                                                <TableRow key={v.id}>
                                                  <TableCell sx={TD}>{fmtFecha(v.fecha)}</TableCell>
                                                  <TableCell sx={TD}>{v.cliente_nombre}</TableCell>
                                                  <TableCell sx={TD}>{v.salida_descripcion}</TableCell>
                                                  <TableCell sx={TD}>{v.remito || '-'}</TableCell>
                                                  <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(precio)}</TableCell>
                                                  <TableCell sx={TD}>
                                                    <IconButton size="small" title="Agregar viaje"
                                                      disabled={modificandoViaje === `${p.id}-add-${v.id}`}
                                                      onClick={(e) => { e.stopPropagation(); handleAgregarViajePreliq(p, v) }}
                                                      sx={{ color: 'rgba(255,255,255,0.25)', '&:hover': { color: '#60a5fa' } }}>
                                                      {modificandoViaje === `${p.id}-add-${v.id}` ? <CircularProgress size={14} /> : <AddIcon sx={{ fontSize: 16 }} />}
                                                    </IconButton>
                                                  </TableCell>
                                                </TableRow>
                                              )
                                            })}
                                          </TableBody>
                                        </Table>
                                      )
                                    )}
                                  </Box>
                                )}

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
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {false && (
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
        )}
      </Box>
      <Dialog
        open={!!preliqAConfirmar}
        onClose={cerrarConfirmacionLiquidacion}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#1e293b',
              color: '#fff',
              borderRadius: 2,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18, bgcolor: '#1e293b', color: '#fff' }}>
          Confirmar y liquidar
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, bgcolor: '#1e293b' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>
            {preliqAConfirmar?.proveedor_nombre || '-'} · {fmtFecha(preliqAConfirmar?.periodo_desde)} - {fmtFecha(preliqAConfirmar?.periodo_hasta)}
          </Typography>
          <TextField
            label="Fecha de pago"
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={darkField}
            fullWidth
          />
          <TextField
            label="Número de factura"
            value={numeroFactura}
            onChange={(e) => setNumeroFactura(e.target.value)}
            sx={darkField}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, bgcolor: '#1e293b' }}>
          <Button onClick={cerrarConfirmacionLiquidacion} disabled={confirmandoLiq} sx={{ color: 'rgba(255,255,255,0.55)', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmarYLiquidar}
            disabled={confirmandoLiq || !fechaPago || !numeroFactura.trim()}
            startIcon={confirmandoLiq ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {confirmandoLiq ? 'Generando...' : 'Crear liquidación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
