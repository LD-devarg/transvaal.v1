import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  Add as AddIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandLess,
  ExpandMore,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Telegram as TelegramIcon,
} from '@mui/icons-material'

const CARD = { bgcolor: '#1e293b', borderRadius: 3, border: '1px solid rgba(255,255,255,0.07)', boxShadow: 'none' }
const TH = { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1, bgcolor: '#1e293b' }
const TD = { color: '#cbd5e1', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1 }
const BTN_SX = { fontWeight: 700, fontSize: 13, borderRadius: 2, px: 2.5, background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', boxShadow: '0 4px 14px rgba(59,130,246,0.35)', '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' }, '&.Mui-disabled': { background: 'rgba(59,130,246,0.2)', color: 'rgba(255,255,255,0.3)' } }
const darkField = {
  '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 13, bgcolor: 'rgba(255,255,255,0.03)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' }, '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 } },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  '& .MuiInputLabel-root.Mui-focused': { color: '#3b82f6' },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.4)' },
}

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'operaciones', label: 'Operaciones' },
  { value: 'contabilidad', label: 'Contabilidad' },
  { value: 'readonly', label: 'Empleado (solo lectura)' },
]

const ROL_COLORES = {
  admin: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  operaciones: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  contabilidad: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  readonly: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
}

const RolChip = ({ rol, label }) => {
  const cfg = ROL_COLORES[rol] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
  return <Box sx={{ display: 'inline-block', px: 1.2, py: 0.3, borderRadius: 1.5, bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: 11 }}>{label}</Box>
}

const INIT_CREATE = { email: '', first_name: '', last_name: '', rol: 'readonly', password: '', proveedor: '' }
const INIT_EDIT = { first_name: '', last_name: '', rol: 'readonly', proveedor: '' }
const INIT_TELEGRAM = { telefono: '', telegram_chat_id: '', telegram_activo: false }

export default function ConfiguracionPage() {
  const [usuarios, setUsuarios] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(INIT_CREATE)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [telegramStatus, setTelegramStatus] = useState({ configured: false, bot_username: 'transvaal_bot', api_ok: false, api_username: '', webhook_url: '', pending_update_count: 0 })
  const [telegramModal, setTelegramModal] = useState(false)
  const [telegramProveedor, setTelegramProveedor] = useState(null)
  const [telegramForm, setTelegramForm] = useState(INIT_TELEGRAM)
  const [telegramSaving, setTelegramSaving] = useState(false)
  const [telegramTesting, setTelegramTesting] = useState(null)
  const [telegramChats, setTelegramChats] = useState([])
  const [telegramChatsLoading, setTelegramChatsLoading] = useState(false)
  const [telegramChatsLoaded, setTelegramChatsLoaded] = useState(false)
  const [telegramProvidersOpen, setTelegramProvidersOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [u, p, t] = await Promise.all([
        client.get('/auth/users/'),
        client.get('/maestros/proveedores/'),
        client.get('/maestros/telegram/status/').catch(() => ({ data: { configured: false, bot_username: 'transvaal_bot', api_ok: false, api_username: '', webhook_url: '', pending_update_count: 0 } })),
      ])
      setUsuarios(u.data)
      setProveedores(p.data)
      setTelegramStatus(t.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const abrirCrear = () => {
    setForm(INIT_CREATE)
    setEditId(null)
    setError('')
    setModal(true)
  }

  const abrirEditar = (u) => {
    setForm({ first_name: u.first_name, last_name: u.last_name, rol: u.rol, proveedor: u.proveedor ?? '' })
    setEditId(u.id)
    setError('')
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, proveedor: form.proveedor || null }
      if (editId) {
        const { password, email, ...editPayload } = payload
        await client.patch(`/auth/users/${editId}/`, editPayload)
        setSuccess('Usuario actualizado.')
      } else {
        await client.post('/auth/users/', payload)
        setSuccess('Usuario creado.')
      }
      setModal(false)
      cargar()
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este usuario?')) return
    try {
      await client.delete(`/auth/users/${id}/`)
      setSuccess('Usuario eliminado.')
      cargar()
    } catch {
      setError('No se pudo eliminar el usuario.')
    }
  }

  const abrirTelegram = (p) => {
    setTelegramProveedor(p)
    setTelegramForm({
      telefono: p.telefono || '',
      telegram_chat_id: p.telegram_chat_id || '',
      telegram_activo: Boolean(p.telegram_activo),
    })
    setError('')
    setTelegramModal(true)
  }

  const setTelegram = (k) => (e) => {
    const value = k === 'telegram_activo' ? e.target.checked : e.target.value
    setTelegramForm((f) => ({ ...f, [k]: value }))
  }

  const guardarTelegram = async (e) => {
    e.preventDefault()
    if (!telegramProveedor) return
    setTelegramSaving(true)
    setError('')
    try {
      await client.patch(`/maestros/proveedores/${telegramProveedor.id}/`, telegramForm)
      setSuccess('Configuracion de Telegram actualizada.')
      setTelegramModal(false)
      cargar()
    } catch (err) {
      const d = err.response?.data || {}
      setError(Object.values(d).flat().join(' ') || 'No se pudo guardar Telegram.')
    } finally {
      setTelegramSaving(false)
    }
  }

  const probarTelegram = async (p) => {
    setTelegramTesting(p.id)
    setError('')
    setSuccess('')
    try {
      await client.post(`/maestros/proveedores/${p.id}/telegram-test/`, {
        message: 'Mensaje de prueba de Transvaal. Si lo recibiste, Telegram quedo configurado correctamente.',
      })
      setSuccess(`Mensaje de prueba enviado a ${p.nombre}.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo enviar el mensaje de prueba.')
    } finally {
      setTelegramTesting(null)
    }
  }

  const cargarChatsTelegram = async () => {
    setTelegramChatsLoading(true)
    setError('')
    try {
      const { data } = await client.get('/maestros/telegram/updates/')
      setTelegramChats(data.chats || [])
      setTelegramChatsLoaded(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron consultar los chats recientes.')
    } finally {
      setTelegramChatsLoading(false)
    }
  }

  const copiarChatId = async (chatId) => {
    await navigator.clipboard.writeText(chatId)
    setSuccess(`chat_id ${chatId} copiado.`)
  }

  return (
    <Box>
      <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, mb: 3 }}>
        Configuracion
      </Typography>

      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ ...CARD, mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TelegramIcon />
              </Box>
              <Box>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Telegram</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, mt: 0.4 }}>
                  Canal de comunicacion con proveedores mediante @{telegramStatus.api_username || telegramStatus.bot_username || 'transvaal_bot'}.
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              label={telegramStatus.configured ? 'Bot configurado' : 'Falta token backend'}
              sx={{
                bgcolor: telegramStatus.configured ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                color: telegramStatus.configured ? '#86efac' : '#fca5a5',
                fontSize: 11,
              }}
            />
          </Box>

          <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(59,130,246,0.08)', color: '#bfdbfe', border: '1px solid rgba(59,130,246,0.18)' }}>
            Telegram no permite escribirle a un numero directamente desde un bot. El proveedor primero debe abrir el bot y enviar /start; despues se carga su chat_id aca.
          </Alert>

          {telegramStatus.configured && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                size="small"
                label={telegramStatus.api_ok ? `API OK @${telegramStatus.api_username}` : 'API sin validar'}
                sx={{ bgcolor: telegramStatus.api_ok ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)', color: telegramStatus.api_ok ? '#86efac' : '#fca5a5', fontSize: 11 }}
              />
              <Chip
                size="small"
                label={telegramStatus.webhook_url ? 'Webhook activo' : 'Sin webhook'}
                sx={{ bgcolor: telegramStatus.webhook_url ? 'rgba(245,158,11,0.12)' : 'rgba(148,163,184,0.1)', color: telegramStatus.webhook_url ? '#fbbf24' : '#94a3b8', fontSize: 11 }}
              />
              <Chip
                size="small"
                label={`Pendientes: ${telegramStatus.pending_update_count || 0}`}
                sx={{ bgcolor: 'rgba(148,163,184,0.1)', color: '#94a3b8', fontSize: 11 }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 2 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
              Chats recientes del bot
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={telegramChatsLoading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={cargarChatsTelegram}
              disabled={!telegramStatus.configured || telegramChatsLoading}
              sx={{ textTransform: 'none', borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)' }}
            >
              Buscar chats
            </Button>
          </Box>

          {telegramChats.length > 0 && (
            <Box sx={{ mb: 2, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH}>Nombre</TableCell>
                    <TableCell sx={TH}>Usuario</TableCell>
                    <TableCell sx={TH}>Chat ID</TableCell>
                    <TableCell sx={TH}>Ultimo mensaje</TableCell>
                    <TableCell sx={TH} align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {telegramChats.map((chat) => (
                    <TableRow key={chat.chat_id}>
                      <TableCell sx={TD}>{`${chat.first_name || ''} ${chat.last_name || ''}`.trim() || '-'}</TableCell>
                      <TableCell sx={TD}>{chat.username ? `@${chat.username}` : '-'}</TableCell>
                      <TableCell sx={{ ...TD, color: '#93c5fd' }}>{chat.chat_id}</TableCell>
                      <TableCell sx={TD}>{chat.last_text || '-'}</TableCell>
                      <TableCell sx={TD} align="right">
                        <IconButton size="small" onClick={() => copiarChatId(chat.chat_id)} sx={{ color: '#60a5fa' }}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {telegramChatsLoaded && telegramChats.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Telegram no devolvio chats recientes. Verifica que el /start haya sido enviado al bot que figura como API OK y que no haya un webhook activo consumiendo los updates.
            </Alert>
          )}

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />

          <Button
            fullWidth
            onClick={() => setTelegramProvidersOpen((open) => !open)}
            sx={{
              justifyContent: 'space-between',
              px: 1.5,
              py: 1,
              mb: telegramProvidersOpen ? 1.5 : 0,
              borderRadius: 1.5,
              color: '#fff',
              bgcolor: telegramProvidersOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              textTransform: 'none',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TelegramIcon sx={{ fontSize: 18, color: '#60a5fa' }} />
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Proveedores configurados</Typography>
              <Chip size="small" label={proveedores.length} sx={{ height: 20, bgcolor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', fontSize: 11 }} />
            </Box>
            {telegramProvidersOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.55)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.55)' }} />}
          </Button>

          <Collapse in={telegramProvidersOpen} timeout="auto" unmountOnExit>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={28} sx={{ color: '#3b82f6' }} />
              </Box>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={TH}>Proveedor</TableCell>
                    <TableCell sx={TH}>Telefono</TableCell>
                    <TableCell sx={TH}>Chat ID</TableCell>
                    <TableCell sx={TH}>Estado</TableCell>
                    <TableCell sx={TH} align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {proveedores.map((p) => (
                    <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                      <TableCell sx={{ ...TD, color: '#fff', fontWeight: 600 }}>{p.nombre}</TableCell>
                      <TableCell sx={TD}>{p.telefono || '-'}</TableCell>
                      <TableCell sx={{ ...TD, color: p.telegram_chat_id ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}>
                        {p.telegram_chat_id || 'Sin vincular'}
                      </TableCell>
                      <TableCell sx={TD}>
                        <Chip
                          size="small"
                          label={p.telegram_activo ? 'Activo' : 'Inactivo'}
                          sx={{
                            bgcolor: p.telegram_activo ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)',
                            color: p.telegram_activo ? '#86efac' : '#94a3b8',
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={TD} align="right">
                        <IconButton size="small" onClick={() => abrirTelegram(p)} sx={{ color: '#3b82f6' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={!telegramStatus.configured || !p.telegram_chat_id || telegramTesting === p.id}
                          onClick={() => probarTelegram(p)}
                          sx={{ color: '#22c55e', '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)' } }}
                        >
                          {telegramTesting === p.id ? <CircularProgress size={16} sx={{ color: '#22c55e' }} /> : <SendIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Collapse>
        </CardContent>
      </Card>

      <Typography sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: 17, mb: 2 }}>
        Usuarios
      </Typography>

      <Card sx={CARD}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={BTN_SX} onClick={abrirCrear}>
              Nuevo usuario
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#3b82f6' }} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={TH}>Nombre</TableCell>
                  <TableCell sx={TH}>Email</TableCell>
                  <TableCell sx={TH}>Rol</TableCell>
                  <TableCell sx={TH}>Proveedor vinculado</TableCell>
                  <TableCell sx={TH} align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={TD}>{u.first_name} {u.last_name}</TableCell>
                    <TableCell sx={TD}>{u.email}</TableCell>
                    <TableCell sx={TD}><RolChip rol={u.rol} label={u.rol_display} /></TableCell>
                    <TableCell sx={{ ...TD, color: u.proveedor_nombre ? '#cbd5e1' : 'rgba(255,255,255,0.2)' }}>
                      {u.proveedor_nombre || '-'}
                    </TableCell>
                    <TableCell sx={TD} align="right">
                      <IconButton size="small" onClick={() => abrirEditar(u)} sx={{ color: '#3b82f6' }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => handleDelete(u.id)} sx={{ color: '#ef4444' }}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modal} onClose={() => setModal(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>{editId ? 'Editar usuario' : 'Nuevo usuario'}</Typography>
          <IconButton onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Nombre" value={form.first_name} onChange={set('first_name')} sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth size="small" label="Apellido" value={form.last_name} onChange={set('last_name')} sx={darkField} />
              </Grid>
              {!editId && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Email" type="email" required value={form.email} onChange={set('email')} sx={darkField} />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth size="small" label="Contrasena" type="password" required value={form.password} onChange={set('password')} sx={darkField} />
                  </Grid>
                </>
              )}
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small" sx={darkField}>
                  <InputLabel>Rol</InputLabel>
                  <Select value={form.rol} label="Rol" onChange={set('rol')}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}>
                    {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth size="small" sx={darkField}>
                  <InputLabel>Proveedor vinculado</InputLabel>
                  <Select value={form.proveedor} label="Proveedor vinculado" onChange={set('proveedor')}
                    MenuProps={{ PaperProps: { sx: { bgcolor: '#1e293b', color: '#cbd5e1' } } }}>
                    <MenuItem value="">Sin vinculacion</MenuItem>
                    {proveedores.map((p) => <MenuItem key={p.id} value={p.id}>{p.nombre} - {p.chofer}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button onClick={() => setModal(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={saving} sx={BTN_SX}>
                  {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : editId ? 'Guardar' : 'Crear'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={telegramModal} onClose={() => setTelegramModal(false)} maxWidth="sm" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 } } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>Telegram</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{telegramProveedor?.nombre}</Typography>
          </Box>
          <IconButton onClick={() => setTelegramModal(false)} sx={{ color: 'rgba(255,255,255,0.4)' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box component="form" onSubmit={guardarTelegram}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Telefono proveedor" value={telegramForm.telefono} onChange={setTelegram('telefono')} sx={darkField} placeholder="+549..." />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth size="small" label="Telegram chat_id" value={telegramForm.telegram_chat_id} onChange={setTelegram('telegram_chat_id')} sx={darkField} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Box>
                    <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Habilitar comunicaciones</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Solo enviar mensajes si el chat_id esta validado.</Typography>
                  </Box>
                  <Switch checked={telegramForm.telegram_activo} onChange={setTelegram('telegram_activo')} />
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button onClick={() => setTelegramModal(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={telegramSaving} sx={BTN_SX}>
                  {telegramSaving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Guardar'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
