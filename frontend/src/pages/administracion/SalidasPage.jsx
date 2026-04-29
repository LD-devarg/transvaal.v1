import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
  Alert, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton, Grid, Autocomplete,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material'

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

const INIT = { cliente: null, ida: '', vuelta: '' }

export default function SalidasPage() {
  const [lista, setLista]         = useState([])
  const [clientes, setClientes]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(INIT)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [filtCliente, setFiltCliente] = useState(null)

  useEffect(() => {
    client.get('/maestros/clientes/').then(r => setClientes(r.data))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = filtCliente ? `?cliente=${filtCliente.id}` : ''
      const r = await client.get('/maestros/salidas/' + params)
      setLista(r.data)
    } finally { setLoading(false) }
  }, [filtCliente])
  useEffect(() => { cargar() }, [cargar])

  const abrir = (s = null) => {
    setForm(s ? { cliente: clientes.find(c => c.id === s.cliente) || null, ida: s.ida, vuelta: s.vuelta } : INIT)
    setEditId(s?.id ?? null); setError(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.cliente) { setError('Seleccioná un cliente.'); return }
    setSaving(true); setError('')
    const payload = { cliente: form.cliente.id, ida: form.ida, vuelta: form.vuelta }
    try {
      if (editId) await client.patch(`/maestros/salidas/${editId}/`, payload)
      else await client.post('/maestros/salidas/', payload)
      setModal(false); setSuccess(editId ? 'Salida actualizada.' : 'Salida creada.'); cargar()
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await client.delete(`/maestros/salidas/${id}/`); setSuccess('Salida eliminada.'); cargar() }
    catch { setError('No se puede eliminar: tiene tarifas o viajes asociados.') }
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>Administración</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>Salidas / Destinos</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrir()} sx={BTN_SX}>Nueva salida</Button>
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
                <TableCell sx={TH}>Destino (ida - vuelta)</TableCell>
                <TableCell sx={TH}>Cliente</TableCell>
                <TableCell sx={{ ...TH, width: 80 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, border: 'none' }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></TableCell></TableRow>}
              {!loading && lista.length === 0 && <TableRow><TableCell colSpan={3} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>Sin salidas.</TableCell></TableRow>}
              {lista.map((s) => (
                <TableRow key={s.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...TD, fontWeight: 500, color: '#fff' }}>{s.ida} — {s.vuelta}</TableCell>
                  <TableCell sx={TD}>{s.cliente_nombre}</TableCell>
                  <TableCell sx={TD}>
                    <IconButton size="small" onClick={() => abrir(s)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(s.id)} sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: '#f87171' } }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
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
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{editId ? 'Editar salida' : 'Nueva salida'}</Typography>
          <IconButton onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Autocomplete options={clientes} getOptionLabel={(o) => o.nombre ?? ''}
                  value={form.cliente} onChange={(_, v) => setForm(f => ({ ...f, cliente: v }))}
                  renderInput={(params) => <TextField {...params} label="Cliente" required size="small" sx={darkField} />}
                  sx={AC_SX} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Ida (origen)" value={form.ida} onChange={(e) => setForm(f => ({ ...f, ida: e.target.value }))}
                  fullWidth required size="small" sx={darkField} placeholder="ej: Buenos Aires" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Vuelta (destino)" value={form.vuelta} onChange={(e) => setForm(f => ({ ...f, vuelta: e.target.value }))}
                  fullWidth required size="small" sx={darkField} placeholder="ej: Córdoba" />
              </Grid>
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
