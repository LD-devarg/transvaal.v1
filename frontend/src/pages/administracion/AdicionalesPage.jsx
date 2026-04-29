import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
  Alert, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton, Grid, Autocomplete,
  InputAdornment, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material'

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

const PRECIOS = [
  { key: 'precio_cat_3ero_sin_semi', label: '3ero S/Semi' },
  { key: 'precio_cat_1', label: 'Cat. 1' },
  { key: 'precio_cat_2', label: 'Cat. 2' },
  { key: 'precio_cat_3', label: 'Cat. 3' },
]

const INIT = {
  nombre: '', cliente: null, tipo: 'por_tarifa',
  precio_cat_3ero_sin_semi: '', precio_cat_1: '', precio_cat_2: '', precio_cat_3: '',
  vigente_desde: new Date().toISOString().slice(0, 10),
}

export default function AdicionalesPage() {
  const [lista, setLista]       = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(INIT)
  const [editId, setEditId]     = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [filtCliente, setFiltCliente] = useState(null)

  useEffect(() => {
    client.get('/maestros/clientes/').then(r => setClientes(r.data))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtCliente ? `?activo=true&cliente=${filtCliente.id}` : '?activo=true'
      const r = await client.get('/maestros/adicionales/' + params)
      setLista(r.data)
    } finally { setLoading(false) }
  }, [filtCliente])
  useEffect(() => { cargar() }, [cargar])

  const abrir = (a = null) => {
    if (a) {
      setForm({
        nombre: a.nombre,
        cliente: clientes.find(c => c.id === a.cliente) || null,
        tipo: a.tipo || 'por_tarifa',
        precio_cat_3ero_sin_semi: a.precio_cat_3ero_sin_semi || '',
        precio_cat_1: a.precio_cat_1 || '',
        precio_cat_2: a.precio_cat_2 || '',
        precio_cat_3: a.precio_cat_3 || '',
        vigente_desde: a.vigente_desde || new Date().toISOString().slice(0, 10),
      })
      setEditId(a.id)
    } else {
      setForm(INIT); setEditId(null)
    }
    setError(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente && form.tipo === 'por_tarifa') { setError('Seleccioná un cliente.'); return }
    setSaving(true); setError('')
    const payload = { nombre: form.nombre, vigente_desde: form.vigente_desde, tipo: form.tipo }
    if (form.cliente) payload.cliente = form.cliente.id
    if (form.tipo === 'por_tarifa') {
      PRECIOS.forEach(p => { if (form[p.key] !== '') payload[p.key] = form[p.key] })
    }
    try {
      if (editId) await client.patch(`/maestros/adicionales/${editId}/`, payload)
      else await client.post('/maestros/adicionales/', payload)
      setModal(false); setSuccess(editId ? 'Adicional actualizado.' : 'Adicional creado.'); cargar()
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>Adicionales</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrir()} sx={BTN_SX}>Nuevo adicional</Button>
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
                <TableCell sx={TH}>Nombre</TableCell>
                <TableCell sx={TH}>Cliente</TableCell>
                <TableCell sx={TH}>Tipo</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>3ero S/Semi</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 1</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 2</TableCell>
                <TableCell sx={{ ...TH, textAlign: 'right' }}>Cat 3</TableCell>
                <TableCell sx={TH}>Desde</TableCell>
                <TableCell sx={{ ...TH, width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, border: 'none' }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></TableCell></TableRow>}
              {!loading && lista.length === 0 && <TableRow><TableCell colSpan={8} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>Sin adicionales.</TableCell></TableRow>}
              {lista.map((a) => (
                <TableRow key={a.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...TD, fontWeight: 500, color: '#fff' }}>{a.nombre}</TableCell>
                  <TableCell sx={TD}>{a.cliente_nombre || <Typography component="span" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Global</Typography>}</TableCell>
                  <TableCell sx={TD}>
                    {a.tipo === 'al_momento'
                      ? <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontWeight: 600, fontSize: 11 }}>Al momento</Box>
                      : <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,0.12)', color: '#60a5fa', fontWeight: 600, fontSize: 11 }}>Por tarifa</Box>}
                  </TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(a.precio_cat_3ero_sin_semi)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(a.precio_cat_1)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(a.precio_cat_2)}</TableCell>
                  <TableCell sx={{ ...TD, textAlign: 'right', color: '#60a5fa' }}>{fmtPeso(a.precio_cat_3)}</TableCell>
                  <TableCell sx={TD}>{a.vigente_desde ? new Date(a.vigente_desde + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</TableCell>
                  <TableCell sx={TD}>
                    <IconButton size="small" onClick={() => abrir(a)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
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
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{editId ? 'Editar adicional' : 'Nuevo adicional'}</Typography>
          <IconButton onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Nombre" value={form.nombre} onChange={setP('nombre')} fullWidth required size="small" sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
                  value={form.cliente} onChange={(_, v) => setForm(f => ({ ...f, cliente: v }))}
                  renderInput={(params) => <TextField {...params} label="Cliente" required={form.tipo === 'por_tarifa'} size="small" sx={darkField} />}
                  sx={AC_SX} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small" sx={darkField}>
                  <InputLabel>Tipo de adicional</InputLabel>
                  <Select value={form.tipo} label="Tipo de adicional"
                    onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))}
                    sx={{ color: '#fff' }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}>
                    <MenuItem value="por_tarifa">Por tarifa (tabla de precios)</MenuItem>
                    <MenuItem value="al_momento">Al momento (precio libre)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Vigente desde" type="date" value={form.vigente_desde}
                  onChange={(e) => setForm(f => ({ ...f, vigente_desde: e.target.value }))}
                  fullWidth required size="small" sx={darkField}
                  slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              {form.tipo === 'por_tarifa' && PRECIOS.map((p) => (
                <Grid key={p.key} size={{ xs: 12, sm: 6 }}>
                  <TextField label={p.label} value={form[p.key]} onChange={setP(p.key)}
                    fullWidth size="small" type="number" sx={darkField}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>$</Typography></InputAdornment> } }} />
                </Grid>
              ))}
              {form.tipo === 'al_momento' && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" variant="outlined"
                    sx={{ borderRadius: 2, fontSize: 12, py: 0.5, borderColor: 'rgba(59,130,246,0.3)', color: '#93c5fd', bgcolor: 'rgba(59,130,246,0.06)' }}>
                    El precio se ingresa en el momento de cargar el viaje.
                  </Alert>
                </Grid>
              )}
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ ...BTN_SX, px: 4, py: 1.2, fontSize: 14 }}>
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Crear'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
