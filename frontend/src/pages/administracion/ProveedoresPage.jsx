import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, Button, TextField, CircularProgress,
  Alert, Table, TableBody, TableCell, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, IconButton, Grid,
  Select, MenuItem, FormControl, InputLabel,
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

const CATEGORIAS = [
  { value: '3ero_sin_semi', label: '3ero SIN SEMI' },
  { value: '1', label: 'Categoría 1' },
  { value: '2', label: 'Categoría 2' },
  { value: '3', label: 'Categoría 3' },
]
const CAT_COLORS = {
  '3ero_sin_semi': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  '1': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  '2': { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  '3': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}
const CatChip = ({ cat, label }) => {
  const cfg = CAT_COLORS[cat] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }}>{label}</Box>
}

const INIT = { nombre: '', chofer: '', email: '', categoria: '3ero_sin_semi', carpeta_drive_id: '' }

export default function ProveedoresPage() {
  const [lista, setLista]     = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(INIT)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await client.get('/maestros/proveedores/'); setLista(r.data) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const abrir = (p = null) => {
    setForm(p ? { nombre: p.nombre, chofer: p.chofer || '', email: p.email || '', categoria: p.categoria, carpeta_drive_id: p.carpeta_drive_id || '' } : INIT)
    setEditId(p?.id ?? null); setError(''); setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (editId) await client.patch(`/maestros/proveedores/${editId}/`, form)
      else await client.post('/maestros/proveedores/', form)
      setModal(false); setSuccess(editId ? 'Proveedor actualizado.' : 'Proveedor creado.'); cargar()
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await client.delete(`/maestros/proveedores/${id}/`); setSuccess('Proveedor eliminado.'); cargar() }
    catch { setError('No se puede eliminar: tiene viajes o liquidaciones asociadas.') }
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>Administración</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>Proveedores</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => abrir()} sx={BTN_SX}>Nuevo proveedor</Button>
      </Box>

      {success && <Alert severity="success" sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && !modal && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Card sx={CARD}>
        <CardContent sx={{ p: 2.5 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={TH}>Nombre</TableCell>
                <TableCell sx={TH}>Chofer</TableCell>
                <TableCell sx={TH}>Categoría</TableCell>
                <TableCell sx={TH}>Email</TableCell>
                <TableCell sx={{ ...TH, width: 80 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, border: 'none' }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></TableCell></TableRow>}
              {!loading && lista.length === 0 && <TableRow><TableCell colSpan={5} sx={{ ...TD, textAlign: 'center', py: 4, color: 'rgba(255,255,255,0.2)' }}>Sin proveedores.</TableCell></TableRow>}
              {lista.map((p) => (
                <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                  <TableCell sx={{ ...TD, fontWeight: 500, color: '#fff' }}>{p.nombre}</TableCell>
                  <TableCell sx={TD}>{p.chofer || '-'}</TableCell>
                  <TableCell sx={TD}><CatChip cat={p.categoria} label={p.categoria_display} /></TableCell>
                  <TableCell sx={TD}>{p.email || '-'}</TableCell>
                  <TableCell sx={TD}>
                    <IconButton size="small" onClick={() => abrir(p)} sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#60a5fa' } }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(p.id)} sx={{ color: 'rgba(255,255,255,0.2)', '&:hover': { color: '#f87171' } }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
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
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{editId ? 'Editar proveedor' : 'Nuevo proveedor'}</Typography>
          <IconButton onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError('')}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField label="Nombre / Empresa" value={form.nombre} onChange={set('nombre')} fullWidth required size="small" sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Chofer" value={form.chofer} onChange={set('chofer')} fullWidth size="small" sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Email" type="email" value={form.email} onChange={set('email')} fullWidth size="small" sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small" sx={darkField}>
                  <InputLabel>Categoría</InputLabel>
                  <Select value={form.categoria} label="Categoría" onChange={set('categoria')}
                    sx={{ color: '#fff' }}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}>
                    {CATEGORIAS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="ID carpeta Google Drive (opcional)"
                  value={form.carpeta_drive_id}
                  onChange={set('carpeta_drive_id')}
                  fullWidth size="small" sx={darkField}
                  placeholder="Ej: 1A2B3C4D5E6F7G8H9I0J"
                  helperText="Pegá el ID de la carpeta de Drive de este proveedor"
                  slotProps={{ formHelperText: { sx: { color: 'rgba(255,255,255,0.25)', fontSize: 10 } } }}
                />
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
