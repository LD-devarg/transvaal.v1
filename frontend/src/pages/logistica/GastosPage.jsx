import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Alert, CircularProgress, Autocomplete, Divider, InputAdornment,
  IconButton, Table, TableBody, TableCell, TableHead, TableRow, Collapse,
  Dialog, DialogTitle, DialogContent, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  CalendarToday as CalendarIcon, LocalShipping as TruckIcon,
  LocalGasStation as CombIcon, ReceiptLong as RemitoIcon,
  AttachMoney as MoneyIcon, PlaylistAdd as VariosIcon,
  CheckCircleOutlined as CheckIcon, FilterList as FilterIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Download as DownloadIcon,
} from '@mui/icons-material'

import { exportToExcel } from '../../utils/export'

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const fmtFecha = (d) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const todayISO = () => new Date().toISOString().slice(0, 10)
const lastWeekISO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

const ESTADOS_EDITABLES = ['pendiente', 'para_revisar']
const canEdit = (g) =>
  g.preliquidacion === null || ESTADOS_EDITABLES.includes(g.preliquidacion_estado)

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

const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD = { color: '#cbd5e1', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1 }

const PRELIQ_ESTADO_CFG = {
  pendiente:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   label: 'Pendiente' },
  enviada:      { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   label: 'Enviada' },
  para_revisar: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    label: 'Para revisar' },
  confirmada:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    label: 'Confirmada' },
  liquidada:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',  label: 'Liquidada' },
}

const PreliqChip = ({ estado }) => {
  const cfg = PRELIQ_ESTADO_CFG[estado] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: estado }
  return (
    <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }}>
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
  fecha_gasto: todayISO(),
  proveedor: null,
  lts_comb: '',
  precio_lts_comb: '',
  remito_combustible: '',
  adelanto_otros: '',
  varios: [],
}

// GastoForm --------------------------------------------------------
function GastoForm({ onSuccess, proveedores, editGasto = null }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editGasto) {
      const comb = editGasto.combustible || {}
      setForm({
        fecha_gasto:        editGasto.fecha_gasto,
        proveedor:          proveedores.find((p) => p.id === editGasto.proveedor) || null,
        lts_comb:           comb.lts_comb ?? '',
        precio_lts_comb:    comb.precio_lts_comb ?? '',
        remito_combustible: editGasto.remito_combustible || '',
        adelanto_otros:     editGasto.adelanto_otros || '',
        varios:             (editGasto.varios || []).map((v) => ({ descripcion: v.descripcion, monto: String(v.monto) })),
      })
    } else {
      setForm({ ...INITIAL_FORM, fecha_gasto: todayISO() })
    }
  }, [editGasto, proveedores])

  const totalComb              = (parseFloat(form.lts_comb) || 0) * (parseFloat(form.precio_lts_comb) || 0)
  const totalCombConDescuento  = totalComb * 0.8
  const totalVarios            = form.varios.reduce((s, v) => s + (parseFloat(v.monto) || 0), 0)
  const totalAdelanto          = parseFloat(form.adelanto_otros) || 0
  const totalGasto             = totalCombConDescuento + totalVarios + totalAdelanto

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }
  const handleVarioChange = (idx, field, value) => {
    setForm((f) => {
      const varios = [...f.varios]
      varios[idx] = { ...varios[idx], [field]: value }
      return { ...f, varios }
    })
  }
  const addVario    = () => setForm((f) => ({ ...f, varios: [...f.varios, { descripcion: '', monto: '' }] }))
  const removeVario = (idx) => setForm((f) => ({ ...f, varios: f.varios.filter((_, i) => i !== idx) }))

  const ResumenRow = ({ label, value, highlight }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#60a5fa' : '#fff', fontSize: highlight ? 14 : 12 }}>
        {fmtPeso(value)}
      </Typography>
    </Box>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.proveedor) { setError('Seleccioná un proveedor.'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        fecha_gasto:        form.fecha_gasto,
        proveedor:          form.proveedor.id,
        adelanto_otros:     form.adelanto_otros || '0',
        remito_combustible: form.remito_combustible || '',
        varios:             form.varios.filter((v) => v.descripcion.trim()).map((v) => ({
          descripcion: v.descripcion.trim(), monto: parseFloat(v.monto) || 0,
        })),
        combustible: form.lts_comb
          ? { lts_comb: parseFloat(form.lts_comb), precio_lts_comb: parseFloat(form.precio_lts_comb) || 0, precio_total_comb: totalComb }
          : {},
      }
      if (editGasto) {
        await client.patch(`/operaciones/gastos/${editGasto.id}/`, payload)
      } else {
        await client.post('/operaciones/gastos/', payload)
      }
      onSuccess()
    } catch (err) {
      const data = err.response?.data || {}
      setError(data.detail || Object.values(data).flat().join(' ') || 'Error al guardar el gasto.')
    } finally { setLoading(false) }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 240px' }, gap: 2.5, alignItems: 'start' }}>

      {/* Campos */}
      <Box>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

        <SectionLabel>Identificacion</SectionLabel>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Fecha" type="date" name="fecha_gasto" value={form.fecha_gasto} onChange={handleChange}
              fullWidth required size="small" sx={darkField}
              slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Autocomplete options={proveedores} getOptionLabel={(opt) => opt.nombre ?? ''} value={form.proveedor}
              onChange={(_, val) => setForm((f) => ({ ...f, proveedor: val }))}
              renderInput={(params) => (
                <TextField {...params} label="Proveedor" required size="small" sx={darkField}
                  InputProps={{ ...params.InputProps, startAdornment: <><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</> }} />
              )}
              sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }} />
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
        <SectionLabel>Combustible</SectionLabel>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="Litros" type="number" name="lts_comb" value={form.lts_comb} onChange={handleChange}
              fullWidth size="small" sx={darkField}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><CombIcon /></InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="Precio/litro" type="number" name="precio_lts_comb" value={form.precio_lts_comb} onChange={handleChange}
              fullWidth size="small" sx={darkField}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField label="Remito combustible" name="remito_combustible" value={form.remito_combustible} onChange={handleChange}
              fullWidth size="small" sx={darkField}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><RemitoIcon /></InputAdornment> } }} />
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <SectionLabel>Varios</SectionLabel>
          <Button size="small" startIcon={<VariosIcon sx={{ fontSize: 15 }} />} onClick={addVario}
            sx={{ color: '#60a5fa', fontSize: 12, textTransform: 'none', py: 0.3, mt: -1.5 }}>
            Agregar
          </Button>
        </Box>
        {form.varios.length === 0 && (
          <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, mb: 2 }}>Sin items varios.</Typography>
        )}
        {form.varios.map((v, idx) => (
          <Grid container spacing={1.5} key={idx} sx={{ mb: 1.5 }}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <TextField label="Descripcion" value={v.descripcion} onChange={(e) => handleVarioChange(idx, 'descripcion', e.target.value)}
                fullWidth size="small" sx={darkField} />
            </Grid>
            <Grid size={{ xs: 9, sm: 4 }}>
              <TextField label="Monto" type="number" value={v.monto} onChange={(e) => handleVarioChange(idx, 'monto', e.target.value)}
                fullWidth size="small" sx={darkField}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 3, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => removeVario(idx)} size="small"
                sx={{ color: 'rgba(248,113,113,0.7)', '&:hover': { color: '#f87171' } }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Grid>
          </Grid>
        ))}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2.5, mt: form.varios.length > 0 ? 1 : 0 }} />
        <SectionLabel>Adelanto / Otros</SectionLabel>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField label="Monto" type="number" name="adelanto_otros" value={form.adelanto_otros} onChange={handleChange}
              fullWidth size="small" sx={darkField}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment> } }} />
          </Grid>
        </Grid>
      </Box>

      {/* Resumen + boton */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.07)', p: 2 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 13, mb: 1.5 }}>Resumen</Typography>
          <ResumenRow label="Combustible (bruto)" value={totalComb} />
          <ResumenRow label="Combustible (-20%)" value={totalCombConDescuento} />
          {form.varios.filter((v) => v.descripcion).map((v, idx) => (
            <ResumenRow key={idx} label={v.descripcion || `Item ${idx + 1}`} value={parseFloat(v.monto) || 0} />
          ))}
          {totalAdelanto > 0 && <ResumenRow label="Adelanto / Otros" value={totalAdelanto} />}
          <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.08)' }} />
          <Box sx={{ bgcolor: 'rgba(59,130,246,0.08)', borderRadius: 1.5, px: 1.5, py: 1 }}>
            <ResumenRow label="Total gasto" value={totalGasto} highlight />
          </Box>
        </Box>

        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : (editGasto ? <EditIcon /> : <AddIcon />)}
          sx={{
            borderRadius: 2, py: 1.5, fontWeight: 700, fontSize: 14,
            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
            '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
            '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
          }}>
          {loading ? 'Guardando...' : editGasto ? 'Actualizar gasto' : 'Guardar gasto'}
        </Button>
      </Box>
    </Box>
  )
}

// GastosPage -------------------------------------------------------
export default function GastosPage() {
  const [proveedores, setProveedores] = useState([])
  const [gastos, setGastos]           = useState([])
  const [loadingList, setLoadingList] = useState(false)

  const [fDesde, setFDesde]         = useState(lastWeekISO)
  const [fHasta, setFHasta]         = useState(todayISO)
  const [fProveedor, setFProveedor] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editGasto, setEditGasto] = useState(null)
  const [success, setSuccess]     = useState('')
  const [expandedGasto, setExpandedGasto] = useState(null)

  useEffect(() => {
    client.get('/maestros/proveedores/').then((r) => setProveedores(r.data))
  }, [])

  const cargarGastos = useCallback(async () => {
    setLoadingList(true)
    try {
      const params = new URLSearchParams()
      if (fDesde)     params.append('desde', fDesde)
      if (fHasta)     params.append('hasta', fHasta)
      if (fProveedor) params.append('proveedor', fProveedor.id)
      const r = await client.get('/operaciones/gastos/?' + params.toString())
      setGastos(r.data.results ?? r.data)
    } finally { setLoadingList(false) }
  }, [fDesde, fHasta, fProveedor])

  useEffect(() => { cargarGastos() }, [cargarGastos])

  const abrirNuevo  = () => { setEditGasto(null); setModalOpen(true) }
  const abrirEditar = (g) => { setEditGasto(g);   setModalOpen(true) }
  const cerrarModal = () => { setModalOpen(false); setEditGasto(null) }

  const handleSuccess = () => {
    cerrarModal()
    setSuccess(editGasto ? 'Gasto actualizado correctamente.' : 'Gasto registrado correctamente.')
    cargarGastos()
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (fDesde)     params.append('desde', fDesde)
      if (fHasta)     params.append('hasta', fHasta)
      if (fProveedor) params.append('proveedor', fProveedor.id)
      params.append('sin_paginar', 'true')

      const r = await client.get('/operaciones/gastos/?' + params.toString())
      const todosLosGastos = r.data.results ?? r.data

      const data = todosLosGastos.map(g => ({
        'ID': g.id,
        'Fecha': g.fecha_gasto,
        'Proveedor': g.proveedor_nombre,
        'Lts Combustible': g.combustible?.lts_comb || 0,
        'Precio Lts Combustible': g.combustible?.precio_lts_comb || 0,
        'Remito Combustible': g.remito_combustible || '',
        'Total Combustible Bruto': g.combustible?.precio_total_comb || 0,
        'Total Comb. Neto (-20%)': parseFloat(g.total_combustible) || 0,
        'Total Varios': parseFloat(g.total_varios) || 0,
        'Adelanto/Otros': parseFloat(g.adelanto_otros) || 0,
        'Total Gasto': parseFloat(g.total_gasto) || 0,
        'Estado Preliq': g.preliquidacion_estado || 'Sin preliquidar'
      }))
      exportToExcel(data, `Gastos_${todayISO()}`)
    } catch (error) {
      console.error('Error al exportar:', error)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
            Logistica
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>Gastos</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={gastos.length === 0}
            sx={{
              fontWeight: 600, fontSize: 13, borderRadius: 2, px: 2,
              color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)',
              '&:hover': { borderColor: '#38bdf8', bgcolor: 'rgba(56,189,248,0.1)' },
            }}
          >
            Exportar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirNuevo}
            sx={{
              fontWeight: 700, fontSize: 13, borderRadius: 2, px: 2.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
            }}>
            Nuevo gasto
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" icon={<CheckIcon />}
          sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          onClose={() => setSuccess('')}>
          {success}
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
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField label="Hasta" type="date" value={fHasta} onChange={(e) => setFHasta(e.target.value)}
                fullWidth size="small" sx={darkField}
                slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment> } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <Autocomplete options={proveedores} getOptionLabel={(o) => o.nombre ?? ''}
                value={fProveedor} onChange={(_, v) => setFProveedor(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Proveedor" size="small" sx={darkField}
                    InputProps={{ ...params.InputProps, startAdornment: <><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</> }} />
                )}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button size="small" sx={{ color: '#60a5fa', fontSize: 12, textTransform: 'none', height: 40 }}
                onClick={() => { setFDesde(lastWeekISO()); setFHasta(todayISO()); setFProveedor(null) }}>
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
              {loadingList ? 'Cargando...' : gastos.length + ' gasto' + (gastos.length !== 1 ? 's' : '')}
            </Typography>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={TH}>Fecha</TableCell>
                  <TableCell sx={TH}>Proveedor</TableCell>
                  <TableCell sx={{ ...TH, textAlign: 'right' }}>Combustible</TableCell>
                  <TableCell sx={{ ...TH, textAlign: 'right' }}>Varios</TableCell>
                  <TableCell sx={{ ...TH, textAlign: 'right' }}>Adelanto</TableCell>
                  <TableCell sx={{ ...TH, textAlign: 'right' }}>Total</TableCell>
                  <TableCell sx={TH}>Preliquidacion</TableCell>
                  <TableCell sx={{ ...TH, width: 40 }} />
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
                {!loadingList && gastos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>
                      No hay gastos con los filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
                {!loadingList && gastos.map((g) => {
                  const open = expandedGasto === g.id
                  const comb = g.combustible || {}
                  return (
                    <>
                      <TableRow
                        key={g.id}
                        onClick={() => setExpandedGasto(open ? null : g.id)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}
                      >
                        <TableCell sx={TD}>{fmtFecha(g.fecha_gasto)}</TableCell>
                        <TableCell sx={TD}>{g.proveedor_nombre}</TableCell>
                        <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(g.total_combustible)}</TableCell>
                        <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(g.total_varios)}</TableCell>
                        <TableCell sx={{ ...TD, textAlign: 'right' }}>{fmtPeso(g.adelanto_otros)}</TableCell>
                        <TableCell sx={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#f1f5f9' }}>{fmtPeso(g.total_gasto)}</TableCell>
                        <TableCell sx={TD}>
                          {g.preliquidacion
                            ? <PreliqChip estado={g.preliquidacion_estado} />
                            : <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>-</Typography>}
                        </TableCell>
                        <TableCell sx={TD}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {canEdit(g) && (
                              <IconButton
                                size="small"
                                onClick={(e) => { e.stopPropagation(); abrirEditar(g) }}
                                sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}
                              >
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            )}
                            <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.25)' }}>
                              {open ? <ExpandLessIcon sx={{ fontSize: 17 }} /> : <ExpandMoreIcon sx={{ fontSize: 17 }} />}
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow key={`det-${g.id}`}>
                        <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr' }, gap: 2 }}>
                                <Box>
                                  <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                                    Combustible
                                  </Typography>
                                  {comb.lts_comb ? (
                                    <>
                                      <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>
                                        {comb.lts_comb} lts x {fmtPeso(comb.precio_lts_comb)} / lt
                                      </Typography>
                                      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, mt: 0.4 }}>
                                        Bruto: {fmtPeso(comb.precio_total_comb)} · Neto con dto. 20%: {fmtPeso(g.total_combustible)}
                                      </Typography>
                                      <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, mt: 0.4 }}>
                                        Remito: {g.remito_combustible || '-'}
                                      </Typography>
                                    </>
                                  ) : (
                                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Sin combustible.</Typography>
                                  )}
                                </Box>

                                <Box>
                                  <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                                    Varios
                                  </Typography>
                                  {(g.varios || []).length === 0 ? (
                                    <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Sin items varios.</Typography>
                                  ) : (
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                      {(g.varios || []).map((v, idx) => (
                                        <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                                          <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>{v.descripcion || `Item ${idx + 1}`}</Typography>
                                          <Typography sx={{ color: '#93c5fd', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtPeso(v.monto)}</Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>

                                <Box>
                                  <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1 }}>
                                    Resumen
                                  </Typography>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.6 }}>
                                    <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Adelanto / Otros</Typography>
                                    <Typography sx={{ color: '#cbd5e1', fontSize: 12 }}>{fmtPeso(g.adelanto_otros)}</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                    <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Total gasto</Typography>
                                    <Typography sx={{ color: '#f87171', fontSize: 13, fontWeight: 800 }}>{fmtPeso(g.total_gasto)}</Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={cerrarModal} maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
              Logistica
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>
              {editGasto ? 'Editar gasto' : 'Nuevo gasto'}
            </Typography>
          </Box>
          <Button onClick={cerrarModal} sx={{ minWidth: 0, color: 'rgba(255,255,255,0.4)', p: 0.5 }}>
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <GastoForm onSuccess={handleSuccess} proveedores={proveedores} editGasto={editGasto} />
        </DialogContent>
      </Dialog>
    </Box>
  )
}
