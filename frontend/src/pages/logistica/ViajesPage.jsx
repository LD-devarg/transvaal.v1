import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Alert, CircularProgress, Autocomplete, Chip, Divider,
  InputAdornment, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton,
  Pagination, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  AltRoute as RouteIcon,
  LocalShipping as TruckIcon,
  ReceiptLong as RemitoIcon,
  StarBorder as AdicionalIcon,
  CheckCircleOutlined as CheckIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material'

const CAT_MAP = {
  '3ero_sin_semi': 'precio_cat_3ero_sin_semi',
  '1': 'precio_cat_1',
  '2': 'precio_cat_2',
  '3': 'precio_cat_3',
}

const ESTADO_CHOICES = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente',    label: 'Pendiente' },
  { value: 'habilitado',   label: 'Habilitado' },
  { value: 'preliquidado', label: 'Preliquidado' },
  { value: 'liquidado',    label: 'Liquidado' },
]

const ESTADO_CHIP = {
  pendiente:    { label: 'Pendiente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  habilitado:   { label: 'Habilitado',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  preliquidado: { label: 'Preliquidado', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  liquidado:    { label: 'Liquidado',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
}

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

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

const EstadoChip = ({ estado }) => {
  const cfg = ESTADO_CHIP[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return (
    <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11, letterSpacing: 0.4 }}>
      {cfg.label}
    </Box>
  )
}

const SectionLabel = ({ children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 0.5 }}>
    <Box sx={{ width: 3, height: 16, borderRadius: 4, bgcolor: '#3b82f6' }} />
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
      {children}
    </Typography>
  </Box>
)

const INITIAL_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  cliente: '', salida: '', proveedor: '', remito: '', adicionales_ids: [],
}

function ViajeForm({ onSuccess, clientes, proveedores, todosAdicionales, editViaje = null }) {
  const [salidas, setSalidas]           = useState([])
  const [tarifa, setTarifa]             = useState(null)
  const [form, setForm]                 = useState(INITIAL_FORM)
  const [conAdicional, setConAdicional] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  // Pre-rellenar cuando se edita
  useEffect(() => {
    if (editViaje) {
      const adics = (editViaje.adicionales || []).map((a) => a.adicional)
      setForm({
        fecha:          editViaje.fecha,
        cliente:        editViaje.cliente,
        salida:         editViaje.salida,
        proveedor:      editViaje.proveedor,
        remito:         editViaje.remito || '',
        adicionales_ids: adics,
      })
      setConAdicional(adics.length > 0)
    } else {
      setForm(INITIAL_FORM)
      setConAdicional(false)
    }
  }, [editViaje])

  useEffect(() => {
    if (form.cliente) {
      client.get(`/maestros/salidas/?cliente=${form.cliente}`)
        .then((r) => setSalidas(r.data)).catch(() => setSalidas([]))
    } else { setSalidas([]) }
  }, [form.cliente])

  useEffect(() => {
    if (form.cliente && form.salida) {
      client.get(`/maestros/tarifas/?activo=true&cliente=${form.cliente}&salida=${form.salida}`)
        .then((r) => setTarifa(r.data[0] || null)).catch(() => setTarifa(null))
    } else { setTarifa(null) }
  }, [form.cliente, form.salida])

  const proveedorSelec = proveedores.find((p) => p.id === Number(form.proveedor))

  const precioTarifa = (() => {
    if (!tarifa || !proveedorSelec) return null
    const val = tarifa[CAT_MAP[proveedorSelec.categoria]]
    return val != null ? parseFloat(val) : null
  })()

  const adicionalesDelCliente = todosAdicionales.filter((a) => a.cliente === Number(form.cliente))

  const precioAdicionales = form.adicionales_ids.reduce((sum, id) => {
    const ad = adicionalesDelCliente.find((a) => a.id === id)
    if (!ad || !proveedorSelec) return sum
    return sum + parseFloat(ad[CAT_MAP[proveedorSelec.categoria]] || 0)
  }, 0)

  const total = (precioTarifa || 0) + precioAdicionales

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'cliente') {
      setForm((f) => ({ ...f, cliente: value, salida: '', adicionales_ids: [] }))
      setConAdicional(false)
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tarifa) { setError('No hay tarifa para esta combinación de cliente y destino.'); return }
    setLoading(true); setError('')
    const payload = {
      fecha: form.fecha, cliente: form.cliente, salida: form.salida,
      proveedor: form.proveedor, tarifa: tarifa.id,
      remito: form.remito || null, adicionales_ids: form.adicionales_ids,
    }
    try {
      if (editViaje) {
        await client.patch(`/operaciones/viajes/${editViaje.id}/`, payload)
      } else {
        await client.post('/operaciones/viajes/', payload)
        setForm(INITIAL_FORM); setConAdicional(false); setTarifa(null)
      }
      onSuccess()
    } catch (err) {
      const data = err.response?.data || {}
      setError(Object.values(data).flat().join(' ') || 'Error al guardar el viaje.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <SectionLabel>Identificacion</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Fecha" type="date" name="fecha" value={form.fecha}
            onChange={handleChange} fullWidth required size="small" sx={darkField}
            slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label="Remito" name="remito" value={form.remito}
            onChange={handleChange} fullWidth size="small" placeholder="N de remito" sx={darkField}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><RemitoIcon /></InputAdornment> } }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
      <SectionLabel>Ruta</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
            value={clientes.find((c) => c.id === Number(form.cliente)) || null}
            onChange={(_, v) => handleChange({ target: { name: 'cliente', value: v ? v.id : '' } })}
            renderInput={(params) => (
              <TextField {...params} label="Cliente" required size="small" sx={darkField}
                InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><PersonIcon /></InputAdornment>{params.InputProps?.startAdornment}</>) }}
              />
            )}
            sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete options={salidas} getOptionLabel={(o) => o.descripcion ?? ''}
            value={salidas.find((s) => s.id === Number(form.salida)) || null}
            onChange={(_, v) => handleChange({ target: { name: 'salida', value: v ? v.id : '' } })}
            disabled={!form.cliente}
            noOptionsText={form.cliente ? 'Sin destinos' : 'Elegi un cliente primero'}
            renderInput={(params) => (
              <TextField {...params} label="Destino" required size="small" sx={{ ...darkField, opacity: form.cliente ? 1 : 0.5 }}
                InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><RouteIcon /></InputAdornment>{params.InputProps?.startAdornment}</>) }}
              />
            )}
            sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
      <SectionLabel>Transportista</SectionLabel>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Autocomplete options={proveedores} getOptionLabel={(o) => o.nombre ?? ''}
            value={proveedores.find((p) => p.id === Number(form.proveedor)) || null}
            onChange={(_, v) => handleChange({ target: { name: 'proveedor', value: v ? v.id : '' } })}
            renderInput={(params) => (
              <TextField {...params} label="Proveedor" required size="small" sx={darkField}
                InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</>) }}
              />
            )}
            sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
      <SectionLabel>Adicionales</SectionLabel>
      <FormControlLabel
        control={
          <Switch checked={conAdicional}
            onChange={(e) => { setConAdicional(e.target.checked); if (!e.target.checked) setForm((f) => ({ ...f, adicionales_ids: [] })) }}
            disabled={!form.cliente || adicionalesDelCliente.length === 0}
            size="small"
            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3b82f6' } }}
          />
        }
        label={<Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          {!form.cliente ? 'Selecciona un cliente primero' : adicionalesDelCliente.length === 0 ? 'Sin adicionales para este cliente' : 'Incluir adicionales'}
        </Typography>}
      />
      {conAdicional && adicionalesDelCliente.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Autocomplete multiple options={adicionalesDelCliente} getOptionLabel={(o) => o.nombre}
            value={adicionalesDelCliente.filter((a) => form.adicionales_ids.includes(a.id))}
            onChange={(_, v) => setForm((f) => ({ ...f, adicionales_ids: v.map((x) => x.id) }))}
            renderTags={(val, getTagProps) => val.map((opt, idx) => (
              <Chip key={opt.id} label={opt.nombre} size="small" {...getTagProps({ index: idx })} icon={<AdicionalIcon />}
                sx={{ bgcolor: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', '& .MuiChip-deleteIcon': { color: 'rgba(147,197,253,0.6)' }, '& .MuiChip-icon': { color: '#93c5fd', fontSize: 14 } }}
              />
            ))}
            renderInput={(params) => <TextField {...params} label="Adicionales" placeholder="Buscar..." size="small" sx={darkField} />}
            sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' } }}
          />
        </Box>
      )}

      {form.cliente && form.salida && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 3 }} />
          <SectionLabel>Resumen de tarifa</SectionLabel>
          {!tarifa ? (
            <Alert severity="warning" variant="outlined" sx={{ borderRadius: 2, fontSize: 12, py: 0.5 }}>
              Sin tarifa activa para esta combinacion.
            </Alert>
          ) : !proveedorSelec ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Selecciona un proveedor para calcular.</Typography>
          ) : (
            <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>Tarifa base</Typography>
                <Typography sx={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>{precioTarifa != null ? fmtPeso(precioTarifa) : '-'}</Typography>
              </Box>
              {form.adicionales_ids.map((id) => {
                const ad = adicionalesDelCliente.find((a) => a.id === id)
                if (!ad) return null
                const precio = parseFloat(ad[CAT_MAP[proveedorSelec.categoria]] || 0)
                return (
                  <Box key={id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>+ {ad.nombre}</Typography>
                    <Typography sx={{ color: '#93c5fd', fontSize: 12 }}>{fmtPeso(precio)}</Typography>
                  </Box>
                )
              })}
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Total</Typography>
                <Typography sx={{ fontWeight: 800, color: '#60a5fa', fontSize: 14 }}>{fmtPeso(total)}</Typography>
              </Box>
            </Box>
          )}
        </>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : (editViaje ? <EditIcon /> : <AddIcon />)}
          sx={{
            px: 4, py: 1.2, fontWeight: 700, fontSize: 14, borderRadius: 2,
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
            '&.Mui-disabled': { background: 'rgba(59,130,246,0.2)', color: 'rgba(255,255,255,0.3)' },
          }}
        >
          {loading ? 'Guardando...' : editViaje ? 'Actualizar viaje' : 'Guardar viaje'}
        </Button>
      </Box>
    </Box>
  )
}

export default function ViajesPage() {
  const [clientes, setClientes]               = useState([])
  const [proveedores, setProveedores]         = useState([])
  const [todosAdicionales, setTodosAdicionales] = useState([])

  const [viajes, setViajes]       = useState([])
  const [count, setCount]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loadingList, setLoadingList] = useState(false)

  const [fDesde, setFDesde]     = useState('')
  const [fHasta, setFHasta]     = useState('')
  const [fChofer, setFChofer]   = useState('')
  const [fCliente, setFCliente] = useState(null)
  const [fEstado, setFEstado]   = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editViaje, setEditViaje] = useState(null)
  const [success, setSuccess]     = useState('')

  useEffect(() => {
    Promise.all([
      client.get('/maestros/clientes/'),
      client.get('/maestros/proveedores/'),
      client.get('/maestros/adicionales/?activo=true'),
    ]).then(([c, p, a]) => {
      setClientes(c.data)
      setProveedores(p.data)
      setTodosAdicionales(a.data)
    })
  }, [])

  const cargarViajes = useCallback(async (pg = 1) => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams({ page: pg })
      if (fDesde)         params.append('desde', fDesde)
      if (fHasta)         params.append('hasta', fHasta)
      if (fChofer.trim()) params.append('chofer', fChofer.trim())
      if (fCliente)       params.append('cliente', fCliente.id)
      if (fEstado)        params.append('estado', fEstado)
      const r = await client.get('/operaciones/viajes/?' + params.toString())
      setViajes(r.data.results ?? r.data)
      setCount(r.data.count ?? r.data.length)
    } finally {
      setLoadingList(false)
    }
  }, [fDesde, fHasta, fChofer, fCliente, fEstado])

  useEffect(() => {
    setPage(1)
    cargarViajes(1)
  }, [fDesde, fHasta, fChofer, fCliente, fEstado, cargarViajes])

  const handlePageChange = (_, pg) => {
    setPage(pg)
    cargarViajes(pg)
  }

  const abrirNuevo = () => { setEditViaje(null); setModalOpen(true) }
  const abrirEditar = (v) => { setEditViaje(v); setModalOpen(true) }

  const handleSuccess = () => {
    setModalOpen(false)
    setSuccess(editViaje ? 'Viaje actualizado correctamente.' : 'Viaje registrado correctamente.')
    setEditViaje(null)
    cargarViajes(page)
  }

  const totalPages = Math.ceil(count / 20)

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
            Logistica
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>
            Viajes
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevo}
          sx={{
            fontWeight: 700, fontSize: 13, borderRadius: 2, px: 2.5,
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
          }}
        >
          Nuevo viaje
        </Button>
      </Box>

      {success && (
        <Alert severity="success" icon={<CheckIcon />}
          sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          onClose={() => setSuccess('')}>
          Viaje registrado correctamente.
        </Alert>
      )}

      <Card sx={{ ...CARD, mb: 2.5 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 11 }}>
              Filtros
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField label="Desde" type="date" value={fDesde} onChange={(e) => setFDesde(e.target.value)}
                fullWidth size="small" sx={darkField}
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField label="Hasta" type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)}
                fullWidth size="small" sx={darkField}
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <TextField label="Chofer" value={fChofer} onChange={(e) => setFChofer(e.target.value)}
                fullWidth size="small" placeholder="Buscar chofer..." sx={darkField}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon /></InputAdornment> } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 3 }}>
              <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
                value={fCliente} onChange={(_, v) => setFCliente(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Cliente" size="small" sx={darkField}
                    InputProps={{ ...params.InputProps, startAdornment: (<><InputAdornment position="start"><PersonIcon /></InputAdornment>{params.InputProps?.startAdornment}</>) }}
                  />
                )}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3, md: 2 }}>
              <FormControl fullWidth size="small" sx={darkField}>
                <InputLabel>Estado</InputLabel>
                <Select value={fEstado} label="Estado" onChange={(e) => setFEstado(e.target.value)}
                  sx={{ color: '#fff' }}
                  MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}
                >
                  {ESTADO_CHOICES.map((e) => (
                    <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button size="small" sx={{ color: '#60a5fa', fontSize: 12, textTransform: 'none', height: 40 }}
                onClick={() => { setFDesde(''); setFHasta(''); setFChofer(''); setFCliente(null); setFEstado('') }}>
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={CARD}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              {loadingList ? 'Cargando...' : count + ' viaje' + (count !== 1 ? 's' : '')}
            </Typography>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={TH}>Fecha</TableCell>
                  <TableCell sx={TH}>Proveedor</TableCell>
                  <TableCell sx={TH}>Cliente</TableCell>
                  <TableCell sx={TH}>Destino</TableCell>
                  <TableCell sx={TH}>Remito</TableCell>
                  <TableCell sx={{ ...TH, textAlign: 'right' }}>Precio</TableCell>
                  <TableCell sx={TH}>Estado</TableCell>
                  <TableCell sx={{ ...TH, width: 40 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingList && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, border: 'none' }}>
                      <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                    </TableCell>
                  </TableRow>
                )}
                {!loadingList && viajes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>
                      No hay viajes con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
                {!loadingList && viajes.map((v) => {
                  const adics = (v.adicionales || []).reduce((s, a) => s + parseFloat(a.precio_snapshot || 0), 0)
                  const precio = (parseFloat(v.precio_tarifa) || 0) + adics
                  return (
                    <TableRow key={v.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={TD}>{fmtFecha(v.fecha)}</TableCell>
                      <TableCell sx={TD}>{v.proveedor_nombre}</TableCell>
                      <TableCell sx={TD}>{v.cliente_nombre}</TableCell>
                      <TableCell sx={TD}>{v.salida_descripcion}</TableCell>
                      <TableCell sx={{ ...TD, color: v.remito ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}>
                        {v.remito || '-'}
                      </TableCell>
                      <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa', fontWeight: 500 }}>
                        {fmtPeso(precio)}
                        {adics > 0 && <Typography component="span" sx={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ml: 0.5 }}>+adic</Typography>}
                      </TableCell>
                      <TableCell sx={TD}><EstadoChip estado={v.estado} /></TableCell>
                      <TableCell sx={TD}>
                        {(v.estado === 'pendiente' || v.estado === 'habilitado') && (
                          <IconButton size="small" onClick={() => abrirEditar(v)}
                            sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}>
                            <EditIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
              <Pagination count={totalPages} page={page} onChange={handlePageChange} size="small"
                sx={{
                  '& .MuiPaginationItem-root': { color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.1)' },
                  '& .MuiPaginationItem-root.Mui-selected': { bgcolor: '#3b82f6', color: '#fff', borderColor: '#3b82f6' },
                  '& .MuiPaginationItem-root:hover': { bgcolor: 'rgba(59,130,246,0.15)' },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => { setModalOpen(false); setEditViaje(null) }} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
              Logistica
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>
              {editViaje ? 'Editar viaje' : 'Nuevo viaje'}
            </Typography>
          </Box>
          <Button onClick={() => { setModalOpen(false); setEditViaje(null) }} sx={{ minWidth: 0, color: 'rgba(255,255,255,0.4)', p: 0.5 }}>
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <ViajeForm onSuccess={handleSuccess} clientes={clientes} proveedores={proveedores} todosAdicionales={todosAdicionales} editViaje={editViaje} />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
