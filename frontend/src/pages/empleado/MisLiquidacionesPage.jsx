import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import {
  Box, Typography, Card, CardContent, CircularProgress,
  Table, TableBody, TableCell, TableHead, TableRow, Collapse, IconButton,
} from '@mui/material'
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material'

const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH   = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD   = { color: '#cbd5e1', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1.2 }
const TH2  = { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.04)', py: 0.8, bgcolor: '#0f172a' }
const TD2  = { color: '#94a3b8', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.03)', py: 0.8 }

function FilaLiquidacion({ liq }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <TableRow sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
        <TableCell sx={{ ...TD, width: 40, pr: 0 }}>
          <IconButton size="small" onClick={() => setOpen(o => !o)} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {open ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
          </IconButton>
        </TableCell>
        <TableCell sx={TD}>{liq.fecha}</TableCell>
        <TableCell sx={TD}>{liq.periodo_desde} / {liq.periodo_hasta}</TableCell>
        <TableCell sx={{ ...TD, fontWeight: 600, color: '#f1f5f9' }}>
          ${Number(liq.total_con_iva).toLocaleString('es-AR')}
        </TableCell>
        <TableCell sx={{ ...TD, color: '#22c55e', fontWeight: 600 }}>
          ${Number(liq.adeudado_final).toLocaleString('es-AR')}
        </TableCell>
        <TableCell sx={{ ...TD, color: 'rgba(255,255,255,0.3)' }}>{liq.factura || '—'}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
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
                  {liq.detalles.map(d => (
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

export default function MisLiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState([])
  const [loading, setLoading]             = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await client.get('/operaciones/mis-liquidaciones/')
      setLiquidaciones(r.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <Box>
      <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, mb: 3 }}>
        Mis Liquidaciones
      </Typography>
      <Card sx={CARD}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#3b82f6' }} />
            </Box>
          ) : liquidaciones.length === 0 ? (
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', py: 6 }}>
              No hay liquidaciones aún.
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
                  <TableCell sx={TH}>Factura</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liquidaciones.map(l => <FilaLiquidacion key={l.id} liq={l} />)}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
