import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
  Alert, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton, Grid, Autocomplete,
  InputAdornment,
} from '@mui/material'
import { Add as AddIcon, Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material'

const darkField = {
  '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 13, bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
}
const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD = { color: '#cbd5e1', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1 }
const BTN_SX = { fontWeight: 700, fontSize: 13, borderRadius: 2, px: 2.5, background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)', '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }, '&.Mui-disabled': { background: 'rgba(59,130,246,0.2)', color: 'rgba(255,255,255,0.3)' } }
const AC_SX = { '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }

const fmtPeso = (v) => v != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v) : '-'
const fmtFecha = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-AR') : '-'

const INIT = {
  cliente: null, salida: null,
  precio_cat_3ero_sin_semi: '', precio_cat_1: '', precio_cat_2: '', precio_cat_3: '',
  vigente_desde: new Date().toISOString().slice(0, 10),
}

const PRECIOS = [
  { key: 'precio_cat_3ero_sin_semi', label: '3ero S/Semi' },
  { key: 'precio_cat_1', label: 'Cat. 1' },
  { key: 'precio_cat_2', label: 'Cat. 2' },
  { key: 'precio_cat_3', label: 'Cat. 3' },
]

export default function TarifasPage() {
  const [lista, setLista]       = useState([])
  const [clientes, setClientes] = useState([])
  const [salidas, setSalidas]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(INIT)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [filtCliente, setFiltCliente] = useState(null)
  const [prefillTarifa, setPrefillTarifa] = useState(null)

  useEffect(() => {
    client.get('/maestros/clientes/').then(r => setClientes(r.data))
  }, [])

  useEffect(() => {
    if (form.cliente) {
      client.get('/maestros/salidas/?cliente=' + form.cliente.id).then(r => setSalidas(r.data))
    } else { setSalidas([]) }
  }, [form.cliente])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtCliente ? `?activo=true&cliente=${filtCliente.id}` : '?activo=true'
      const r = await client.get('/maestros/tarifas/' + params)
      setLista(r.data)
    } finally { setLoading(false) }
  }, [filtCliente])
  useEffect(() => { cargar() }, [cargar])

  const abrirNueva = (t = null) => {
    if (t) {
      const cli = clientes.find(c => c.id === t.cliente) || null
      setForm({
        cliente: cli, salida: null,
        precio_cat_3ero_sin_semi: t.precio_cat_3ero_sin_semi || '',
        precio_cat_1: t.precio_cat_1 || '', precio_cat_2: t.precio_cat_2 || '', precio_cat_3: t.precio_cat_3 || '',
        vigente_desde: new Date().toISOString().slice(0, 10),
      })
      setPrefillTarifa(t)
    } else {
      setForm(INIT); setPrefillTarifa(null)
    }
    setError(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente || !form.salida) { setError('Seleccioná cliente y destino.'); return }
    setSaving(true); setError('')
    const payload = {
      cliente: form.cliente.id, salida: form.salida.id,
      vigente_desde: form.vigente_desde,
    }
    PRECIOS.forEach(p => { if (form[p.key] !== '') payload[p.key] = form[p.key] })
    try {
      await client.post('/maestros/tarifas/actualizar/', payload)
      setModal(false); setSuccess('Tarifa guardada (nueva versión creada).'); cargar()
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const setP = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>Administración</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>Tarifas</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrirNueva()} sx={BTN_SX}>Nueva tarifa</Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && !modal && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ mb: 2, maxWidth: 280 }}>
        <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
          value={filtCliente} onChange={(_, v) => setFiltCliente(v)}
          renderInput={(params) => <TextField {...params} label="Filtrar por cliente" size="small" sx={darkField} />}
          sx={AC_SX} />
      </Box>

      <Card sx={CARD}>
        <CardContent sx={{ p: 2.5 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={TH}>Cliente</TableCell>
                <TableCell sx={TH}>Destino</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>3ero S/Semi</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 1</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 2</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 3</TableCell>
                <TableCell sx={TH}>Desde</TableCell>
                <TableCell sx={TH}>Ver.</TableCell>
                <TableCell sx={{ ...TH, width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={9} sx={{ textAlign: 'center', py: 4, border: 'none' }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></TableCell></TableRow>}
              {!loading && lista.length === 0 && <TableRow><TableCell colSpan={9} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>Sin tarifas activas.</TableCell></TableRow>}
              {lista.map((t) => (
                <TableRow key={t.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...TD, fontWeight: 500, color: '#fff' }}>{t.cliente_nombre}</TableCell>
                  <TableCell sx={TD}>{t.salida_descripcion}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(t.precio_cat_3ero_sin_semi)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(t.precio_cat_1)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(t.precio_cat_2)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(t.precio_cat_3)}</TableCell>
                  <TableCell sx={TD}>{fmtFecha(t.vigente_desde)}</TableCell>
                  <TableCell sx={{ ...TD, color: 'rgba(255,255,255,0.35)' }}>v{t.version}</TableCell>
                  <TableCell sx={TD}>
                    <IconButton size="small" onClick={() => abrirNueva(t)} title="Actualizar tarifa"
                      sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}>
                      <RefreshIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>
              {prefillTarifa ? 'Actualizar tarifa' : 'Nueva tarifa'}
            </Typography>
            {prefillTarifa && <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Se creará una nueva versión cerrando la actual</Typography>}
          </Box>
          <IconButton onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
                  value={form.cliente} onChange={(_, v) => setForm(f => ({ ...f, cliente: v, salida: null }))}
                  renderInput={(params) => <TextField {...params} label="Cliente" required size="small" sx={darkField} />}
                  sx={AC_SX} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete options={salidas} getOptionLabel={(o) => o.descripcion ?? ''}
                  value={form.salida} onChange={(_, v) => setForm(f => ({ ...f, salida: v }))}
                  disabled={!form.cliente}
                  noOptionsText={form.cliente ? 'Sin destinos' : 'Elegí un cliente'}
                  renderInput={(params) => <TextField {...params} label="Destino" required size="small" sx={{ ...darkField, opacity: form.cliente ? 1 : 0.5 }} />}
                  sx={AC_SX} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField label="Vigente desde" type="date" value={form.vigente_desde}
                  onChange={(e) => setForm(f => ({ ...f, vigente_desde: e.target.value }))}
                  fullWidth required size="small" sx={darkField}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              {PRECIOS.map((p) => (
                <Grid key={p.key} size={{ xs: 12, sm: 6 }}>
                  <TextField label={p.label} value={form[p.key]} onChange={setP(p.key)}
                    fullWidth size="small" type="number" sx={darkField}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>$</Typography></InputAdornment> } }} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ ...BTN_SX, px: 4, py: 1.2, fontSize: 14 }}>
                {saving ? 'Guardando...' : 'Guardar tarifa'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
