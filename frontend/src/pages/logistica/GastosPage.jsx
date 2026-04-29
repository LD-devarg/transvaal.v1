import { useState, useEffect } from 'react'
import client from '../../api/client'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Autocomplete,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as TruckIcon,
  LocalGasStation as CombIcon,
  ReceiptLong as RemitoIcon,
  AttachMoney as MoneyIcon,
  PlaylistAdd as VariosIcon,
  CheckCircleOutlined as CheckIcon,
} from '@mui/icons-material'

const fmtPeso = (val) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val || 0)

const INITIAL_FORM = {
  fecha_gasto: new Date().toISOString().slice(0, 10),
  proveedor: null,
  lts_comb: '',
  precio_lts_comb: '',
  remito_combustible: '',
  adelanto_otros: '',
  varios: [],
}

export default function GastosPage() {
  const [proveedores, setProveedores] = useState([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/maestros/proveedores/').then((r) => setProveedores(r.data))
  }, [])

  const totalComb = (() => {
    const lts = parseFloat(form.lts_comb) || 0
    const precio = parseFloat(form.precio_lts_comb) || 0
    return lts * precio
  })()

  const totalCombConDescuento = totalComb * 0.8
  const totalVarios = form.varios.reduce((s, v) => s + (parseFloat(v.monto) || 0), 0)
  const totalAdelanto = parseFloat(form.adelanto_otros) || 0
  const totalGasto = totalCombConDescuento + totalVarios + totalAdelanto

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

  const addVario = () =>
    setForm((f) => ({ ...f, varios: [...f.varios, { descripcion: '', monto: '' }] }))

  const removeVario = (idx) =>
    setForm((f) => ({ ...f, varios: f.varios.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.proveedor) {
      setError('Seleccioná un proveedor.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const payload = {
        fecha_gasto: form.fecha_gasto,
        proveedor: form.proveedor.id,
        adelanto_otros: form.adelanto_otros || '0',
        remito_combustible: form.remito_combustible || '',
        varios: form.varios
          .filter((v) => v.descripcion.trim())
          .map((v) => ({ descripcion: v.descripcion.trim(), monto: parseFloat(v.monto) || 0 })),
        combustible:
          form.lts_comb
            ? {
                lts_comb: parseFloat(form.lts_comb),
                precio_lts_comb: parseFloat(form.precio_lts_comb) || 0,
                precio_total_comb: totalComb,
              }
            : {},
      }
      await client.post('/operaciones/gastos/', payload)
      setSuccess(true)
      setForm(INITIAL_FORM)
    } catch (err) {
      const data = err.response?.data || {}
      setError(Object.values(data).flat().join(' ') || 'Error al guardar el gasto.')
    } finally {
      setLoading(false)
    }
  }

  const darkField = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      fontSize: 13,
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

  const SectionLabel = ({ children }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, mt: 0.5 }}>
      <Box sx={{ width: 3, height: 16, borderRadius: 4, bgcolor: '#3b82f6' }} />
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
        {children}
      </Typography>
    </Box>
  )

  const ResumenRow = ({ label, value, highlight }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#60a5fa' : '#fff', fontSize: highlight ? 15 : 13 }}>
        {fmtPeso(value)}
      </Typography>
    </Box>
  )

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
          Logística
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mt: 0.5 }}>
          Nuevo gasto
        </Typography>
      </Box>

      {success && (
        <Alert
          severity="success"
          icon={<CheckIcon />}
          sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#86efac' }}
          onClose={() => setSuccess(false)}
        >
          Gasto registrado correctamente.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 280px' },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Card principal */}
        <Card sx={CARD}>
          <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>

            {/* Identificación */}
            <SectionLabel>Identificación</SectionLabel>
            <Grid container spacing={2} sx={{ mb: 3.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Fecha"
                  type="date"
                  name="fecha_gasto"
                  value={form.fecha_gasto}
                  onChange={handleChange}
                  fullWidth required size="small"
                  sx={darkField}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: <InputAdornment position="start"><CalendarIcon /></InputAdornment>,
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={proveedores}
                  getOptionLabel={(opt) => opt.nombre ?? ''}
                  value={form.proveedor}
                  onChange={(_, val) => setForm((f) => ({ ...f, proveedor: val }))}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Proveedor"
                      required size="small" sx={darkField}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <><InputAdornment position="start"><TruckIcon /></InputAdornment>{params.InputProps?.startAdornment}</>
                        ),
                      }}
                    />
                  )}
                  sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.4)' }, '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.4)' } }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

            {/* Combustible */}
            <SectionLabel>Combustible</SectionLabel>
            <Grid container spacing={2} sx={{ mb: 3.5 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Litros cargados"
                  type="number"
                  name="lts_comb"
                  value={form.lts_comb}
                  onChange={handleChange}
                  fullWidth size="small" sx={darkField}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><CombIcon /></InputAdornment>,
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Precio por litro"
                  type="number"
                  name="precio_lts_comb"
                  value={form.precio_lts_comb}
                  onChange={handleChange}
                  fullWidth size="small" sx={darkField}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment>,
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Remito combustible"
                  name="remito_combustible"
                  value={form.remito_combustible}
                  onChange={handleChange}
                  fullWidth size="small" sx={darkField}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><RemitoIcon /></InputAdornment>,
                    },
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

            {/* Varios */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 3, height: 16, borderRadius: 4, bgcolor: '#3b82f6' }} />
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', fontSize: 11 }}>
                  Varios
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<VariosIcon sx={{ fontSize: 16 }} />}
                onClick={addVario}
                sx={{ color: '#60a5fa', fontSize: 12, textTransform: 'none', py: 0.3 }}
              >
                Agregar ítem
              </Button>
            </Box>

            {form.varios.length === 0 && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, mb: 2 }}>
                Sin ítems varios. Usá el botón para agregar.
              </Typography>
            )}

            {form.varios.map((v, idx) => (
              <Grid container spacing={1.5} key={idx} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <TextField
                    label="Descripción"
                    value={v.descripcion}
                    onChange={(e) => handleVarioChange(idx, 'descripcion', e.target.value)}
                    fullWidth size="small" sx={darkField}
                  />
                </Grid>
                <Grid size={{ xs: 9, sm: 4 }}>
                  <TextField
                    label="Monto"
                    type="number"
                    value={v.monto}
                    onChange={(e) => handleVarioChange(idx, 'monto', e.target.value)}
                    fullWidth size="small" sx={darkField}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 3, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton onClick={() => removeVario(idx)} size="small" sx={{ color: 'rgba(248,113,113,0.7)', '&:hover': { color: '#f87171' } }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3, mt: form.varios.length > 0 ? 1 : 0 }} />

            {/* Adelanto / Otros */}
            <SectionLabel>Adelanto / Otros</SectionLabel>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Monto adelanto / otros"
                  type="number"
                  name="adelanto_otros"
                  value={form.adelanto_otros}
                  onChange={handleChange}
                  fullWidth size="small" sx={darkField}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><MoneyIcon /></InputAdornment>,
                    },
                  }}
                />
              </Grid>
            </Grid>

          </CardContent>
        </Card>

        {/* Panel lateral */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card sx={{
            ...CARD,
            border: totalGasto > 0 ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(255,255,255,0.07)',
            transition: 'border-color 0.3s',
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#fff', letterSpacing: 0.3 }}>
                Resumen
              </Typography>

              <ResumenRow label="Combustible (bruto)" value={totalComb} />
              <ResumenRow label="Combustible (−20%)" value={totalCombConDescuento} />

              {form.varios.filter((v) => v.descripcion).map((v, idx) => (
                <ResumenRow key={idx} label={v.descripcion || `Ítem ${idx + 1}`} value={parseFloat(v.monto) || 0} />
              ))}

              {totalAdelanto > 0 && <ResumenRow label="Adelanto / Otros" value={totalAdelanto} />}

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

              <Box sx={{ bgcolor: 'rgba(59,130,246,0.08)', borderRadius: 2, px: 1.5, py: 1 }}>
                <ResumenRow label="Total gasto" value={totalGasto} highlight />
              </Box>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AddIcon />}
            sx={{
              borderRadius: 2,
              py: 1.6,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 0.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                boxShadow: '0 4px 24px rgba(59,130,246,0.5)',
              },
              '&.Mui-disabled': {
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            {loading ? 'Guardando...' : 'Guardar gasto'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

