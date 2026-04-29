import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, MenuItem, Select, FormControl, InputLabel,
} from '@mui/material'

const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH   = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD   = { color: '#cbd5e1', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1.2 }

const ESTADO_COLORES = {
  pendiente:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  habilitado:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  preliquidado: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  liquidado:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}

const EstadoChip = ({ estado }) => {
  const cfg = ESTADO_COLORES[estado] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</Box>
}

const darkField = {
  '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 13, bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
}

export default function MisViajesPage() {
  const [viajes, setViajes]   = useState([])
  const [loading, setLoading] = useState(false)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')
  const [estado, setEstado]   = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta
      if (estado) params.estado = estado
      const r = await client.get('/operaciones/mis-viajes/', { params })
      setViajes(r.data)
    } finally { setLoading(false) }
  }, [desde, hasta, estado])

  useEffect(() => { cargar() }, [cargar])

  return (
    <Box>
      <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, mb: 3 }}>Mis Viajes</Typography>
      <Card sx={{ ...CARD, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Desde" type="date" size="small" value={desde} onChange={e => setDesde(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...darkField, width: 160 }} />
            <TextField label="Hasta" type="date" size="small" value={hasta} onChange={e => setHasta(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...darkField, width: 160 }} />
            <FormControl size="small" sx={{ ...darkField, width: 160 }}>
              <InputLabel>Estado</InputLabel>
              <Select value={estado} label="Estado" onChange={e => setEstado(e.target.value)} MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}>
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="pendiente">Pendiente</MenuItem>
                <MenuItem value="habilitado">Habilitado</MenuItem>
                <MenuItem value="preliquidado">Preliquidado</MenuItem>
                <MenuItem value="liquidado">Liquidado</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>
      <Card sx={CARD}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={32} sx={{ color: '#3b82f6' }} /></Box>
          ) : viajes.length === 0 ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', py: 6 }}>No hay viajes para mostrar.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TH}>Fecha</TableCell>
                  <TableCell sx={TH}>Salida</TableCell>
                  <TableCell sx={TH}>Cliente</TableCell>
                  <TableCell sx={TH}>Remito</TableCell>
                  <TableCell sx={TH}>Importe</TableCell>
                  <TableCell sx={TH}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viajes.map(v => (
                  <TableRow key={v.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={TD}>{v.fecha}</TableCell>
                    <TableCell sx={TD}>{v.salida_descripcion}</TableCell>
                    <TableCell sx={TD}>{v.cliente_nombre}</TableCell>
                    <TableCell sx={{ ...TD, color: v.remito ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}>{v.remito || '—'}</TableCell>
                    <TableCell sx={{ ...TD, fontWeight: 600, color: '#f1f5f9' }}>${Number(v.precio_tarifa).toLocaleString('es-AR')}</TableCell>
                    <TableCell sx={TD}><EstadoChip estado={v.estado} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
