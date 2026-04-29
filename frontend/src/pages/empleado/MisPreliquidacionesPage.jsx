import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Button, Alert,
  Collapse, IconButton,
} from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp, CheckCircle, Flag } from '@mui/icons-material'

const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH   = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD   = { color: '#cbd5e1', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1.2 }
const TH2  = { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', py: 0.8, bgcolor: '#0f172a' }
const TD2  = { color: '#94a3b8', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.03)', py: 0.8 }

const ESTADO_CFG = {
  pendiente:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Pendiente' },
  enviada:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Enviada' },
  para_revisar: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Para revisar' },
  confirmada:   { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Confirmada' },
  liquidada:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', label: 'Liquidada' },
}

const EstadoChip = ({ estado }) => {
  const cfg = ESTADO_CFG[estado] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: estado }
  return <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }}>{cfg.label}</Box>
}

function FilaPreliq({ preliq, onResponder }) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)

  const responder = async (accion) => {
    setLoading(true)
    try { await onResponder(preliq.id, accion) }
    finally { setLoading(false) }
  }

  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
        <TableCell sx={{ ...TD, width: 40, pr: 0 }}>
          <IconButton size="small" onClick={() => setOpen(o => !o)} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={TD}>{preliq.fecha}</TableCell>
        <TableCell sx={TD}>{preliq.periodo_desde} / {preliq.periodo_hasta}</TableCell>
        <TableCell sx={{ ...TD, fontWeight: 600, color: '#f1f5f9' }}>
          ${Number(preliq.total_con_iva).toLocaleString('es-AR')}
        </TableCell>
        <TableCell sx={{ ...TD, color: '#22c55e', fontWeight: 600 }}>
          ${Number(preliq.adeudado_final).toLocaleString('es-AR')}
        </TableCell>
        <TableCell sx={TD}><EstadoChip estado={preliq.estado} /></TableCell>
        <TableCell sx={TD} align="right">
          {preliq.estado === 'enviada' && (
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                size="small" variant="contained" disabled={loading}
                startIcon={<CheckCircle fontSize="small" />}
                onClick={() => responder('confirmar')}
                sx={{ fontSize: 11, fontWeight: 700, borderRadius: 1.5, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}
              >
                Aceptar
              </Button>
              <Button
                size="small" variant="outlined" disabled={loading}
                startIcon={<Flag fontSize="small" />}
                onClick={() => responder('revisar')}
                sx={{ fontSize: 11, fontWeight: 700, borderRadius: 1.5, color: '#ef4444', borderColor: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.08)', borderColor: '#ef4444' } }}
              >
                Revisar
              </Button>
            </Box>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ bgcolor: '#0f172a', px: 3, py: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH2}>Fecha</TableCell>
                    <TableCell sx={TH2}>Salida</TableCell>
                    <TableCell sx={TH2}>Cliente</TableCell>
                    <TableCell sx={TH2}>Remito</TableCell>
                    <TableCell sx={TH2}>Importe c/IVA</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preliq.detalles.map(d => (
                    <TableRow key={d.id}>
                      <TableCell sx={TD2}>{d.fecha_viaje}</TableCell>
                      <TableCell sx={TD2}>{d.salida_snapshot}</TableCell>
                      <TableCell sx={TD2}>{d.cliente_snapshot}</TableCell>
                      <TableCell sx={{ ...TD2, color: d.remito_snapshot ? '#94a3b8' : 'rgba(255,255,255,0.2)' }}>
                        {d.remito_snapshot || '—'}
                      </TableCell>
                      <TableCell sx={TD2}>${Number(d.tarifa_con_iva).toLocaleString('es-AR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

export default function MisPreliquidacionesPage() {
  const [preliquidaciones, setPreliquidaciones] = useState([])
  const [loading, setLoading]                   = useState(false)
  const [success, setSuccess]                   = useState('')
  const [error, setError]                       = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await client.get('/operaciones/mis-preliquidaciones/')
      setPreliquidaciones(r.data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleResponder = async (id, accion) => {
    try {
      await client.post(`/operaciones/mis-preliquidaciones/${id}/responder/`, { accion })
      setSuccess(accion === 'confirmar' ? 'Preliquidación aceptada.' : 'Marcada para revisión.')
      cargar()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al responder.')
    }
  }

  return (
    <Box>
      <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, mb: 3 }}>
        Mis Preliquidaciones
      </Typography>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {error   && <Alert severity="error"   onClose={() => setError('')}   sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={CARD}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#3b82f6' }} />
            </Box>
          ) : preliquidaciones.length === 0 ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', py: 6 }}>
              No hay preliquidaciones aún.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...TH, width: 40 }} />
                  <TableCell sx={TH}>Fecha</TableCell>
                  <TableCell sx={TH}>Período</TableCell>
                  <TableCell sx={TH}>Total c/IVA</TableCell>
                  <TableCell sx={TH}>A cobrar</TableCell>
                  <TableCell sx={TH}>Estado</TableCell>
                  <TableCell sx={TH} align="right">Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preliquidaciones.map(p => (
                  <FilaPreliq key={p.id} preliq={p} onResponder={handleResponder} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
