import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material'
import {
  AttachFile as FileIcon,
  CheckCircle as OkIcon,
  CloudUpload as DriveIcon,
  Error as ErrIcon,
  UploadFile as UploadIcon,
} from '@mui/icons-material'
import client from '../../api/client'
import { useAuth } from '../../context/AuthContext'

const GAS_URL = import.meta.env.VITE_GAS_URL

const DOC_TYPES = [
  { key: 'vtv', label: 'VTV' },
  { key: 'dni', label: 'DNI' },
  { key: 'carnet', label: 'Carnet de Conducir' },
  { key: 'seguro', label: 'Seguro' },
  { key: 'cedula', label: 'Cedula Verde' },
]

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function normNombre(nombre) {
  return (nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function docFilename(label, proveedorNombre, fileName) {
  const ext = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : 'bin'
  return `${docBaseName(label, proveedorNombre)}.${ext}`
}

function docBaseName(label, proveedorNombre) {
  return `${label.replace(/\s+/g, '-').toUpperCase()}-${normNombre(proveedorNombre)}`
}

export default function MiDocumentacionPage() {
  const { user } = useAuth()
  const [proveedor, setProveedor] = useState(null)
  const [loadingProveedor, setLoadingProveedor] = useState(false)
  const [archivos, setArchivos] = useState({})
  const [estados, setEstados] = useState({})
  const [errores, setErrores] = useState({})
  const [saving, setSaving] = useState(false)
  const [globalErr, setGlobalErr] = useState('')
  const [globalOk, setGlobalOk] = useState('')
  const inputRefs = useRef({})

  useEffect(() => {
    if (!user?.proveedor) {
      setProveedor(null)
      return
    }

    let alive = true
    setLoadingProveedor(true)
    client.get(`/maestros/proveedores/${user.proveedor}/`)
      .then((r) => { if (alive) setProveedor(r.data) })
      .catch(() => { if (alive) setGlobalErr('No se pudo obtener la configuracion del proveedor.') })
      .finally(() => { if (alive) setLoadingProveedor(false) })

    return () => { alive = false }
  }, [user?.proveedor])

  const handleFile = (key, file) => {
    setArchivos((a) => {
      const next = { ...a }
      if (file) next[key] = file
      else delete next[key]
      return next
    })
    setEstados((s) => ({ ...s, [key]: 'idle' }))
    setErrores((e) => ({ ...e, [key]: '' }))
    setGlobalErr('')
    setGlobalOk('')
  }

  const handleGuardar = async () => {
    if (!GAS_URL) {
      setGlobalErr('VITE_GAS_URL no esta configurado.')
      return
    }
    if (!user?.proveedor) {
      setGlobalErr('Tu usuario no tiene un proveedor asociado.')
      return
    }
    if (!proveedor?.carpeta_drive_id) {
      setGlobalErr('Tu proveedor no tiene carpeta de Drive configurada. Contacta a administracion.')
      return
    }

    const keys = DOC_TYPES.map((d) => d.key).filter((k) => archivos[k])
    if (keys.length === 0) {
      setGlobalErr('Selecciona al menos un archivo.')
      return
    }

    setGlobalErr('')
    setGlobalOk('')
    setSaving(true)

    const newEstados = { ...estados }
    const newErrores = { ...errores }

    for (const key of keys) {
      const file = archivos[key]
      const label = DOC_TYPES.find((d) => d.key === key).label
      const filename = docFilename(label, proveedor.nombre, file.name)
      const replacePrefix = docBaseName(label, proveedor.nombre)

      newEstados[key] = 'uploading'
      setEstados({ ...newEstados })

      try {
        const b64 = await fileToBase64(file)
        const res = await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({
            file_b64: b64,
            mime_type: file.type || 'application/octet-stream',
            filename,
            replace_prefix: replacePrefix,
            folder_id: proveedor.carpeta_drive_id,
          }),
        })
        const data = await res.json()
        if (data.ok) {
          newEstados[key] = 'ok'
        } else {
          newEstados[key] = 'error'
          newErrores[key] = data.error || 'Error al subir.'
        }
      } catch (err) {
        newEstados[key] = 'error'
        newErrores[key] = err.message || 'Error de red.'
      }

      setEstados({ ...newEstados })
      setErrores({ ...newErrores })
    }

    setSaving(false)
    const allOk = keys.every((k) => newEstados[k] === 'ok')
    const someOk = keys.some((k) => newEstados[k] === 'ok')
    if (allOk) setGlobalOk('Todos los archivos se subieron correctamente.')
    else if (someOk) setGlobalOk('Algunos archivos se subieron. Revisa los errores.')
    else setGlobalErr('No se pudo subir ningun archivo.')
  }

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>
        Mi Documentacion
      </Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, mb: 3 }}>
        Carga tus documentos para enviarlos directamente a la carpeta de Drive asignada.
      </Typography>

      {globalErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGlobalErr('')}>{globalErr}</Alert>}
      {globalOk && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setGlobalOk('')}>{globalOk}</Alert>}

      {loadingProveedor && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'rgba(255,255,255,0.55)' }}>
          <CircularProgress size={18} sx={{ color: '#60a5fa' }} />
          <Typography sx={{ fontSize: 13 }}>Cargando configuracion...</Typography>
        </Box>
      )}

      {proveedor && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{proveedor.nombre}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
            {proveedor.chofer || 'Sin chofer cargado'} · {proveedor.email || 'Sin email'}
          </Typography>
        </Box>
      )}

      {!loadingProveedor && !user?.proveedor && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tu usuario no tiene un proveedor asociado.
        </Alert>
      )}

      {proveedor && !proveedor.carpeta_drive_id && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Tu proveedor no tiene carpeta de Drive configurada. Contacta a administracion.
        </Alert>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 3 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {DOC_TYPES.map(({ key, label }) => {
          const file = archivos[key]
          const estado = estados[key] || 'idle'
          const error = errores[key] || ''

          return (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: `1px solid ${estado === 'error' ? 'rgba(239,68,68,0.4)' : estado === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 2,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 600, width: 170, flexShrink: 0 }}>
                {label}
              </Typography>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {file ? (
                  <Chip
                    icon={<FileIcon sx={{ fontSize: 14 }} />}
                    label={file.name}
                    size="small"
                    onDelete={() => handleFile(key, null)}
                    sx={{
                      bgcolor: 'rgba(59,130,246,0.15)',
                      color: '#93c5fd',
                      fontSize: 11,
                      maxWidth: '100%',
                      '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.4)' },
                    }}
                  />
                ) : (
                  <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontStyle: 'italic' }}>
                    Sin archivo
                  </Typography>
                )}
                {error && <Typography sx={{ color: '#f87171', fontSize: 11, mt: 0.3 }}>{error}</Typography>}
              </Box>

              {estado === 'uploading' && <CircularProgress size={18} sx={{ color: '#60a5fa', flexShrink: 0 }} />}
              {estado === 'ok' && <OkIcon sx={{ color: '#4ade80', fontSize: 20, flexShrink: 0 }} />}
              {estado === 'error' && <ErrIcon sx={{ color: '#f87171', fontSize: 20, flexShrink: 0 }} />}

              <input
                ref={(el) => { inputRefs.current[key] = el }}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) handleFile(key, e.target.files[0])
                  e.target.value = ''
                }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={() => inputRefs.current[key]?.click()}
                startIcon={<UploadIcon sx={{ fontSize: 15 }} />}
                disabled={saving || !proveedor?.carpeta_drive_id}
                sx={{
                  flexShrink: 0,
                  textTransform: 'none',
                  fontSize: 12,
                  borderColor: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)',
                  '&:hover': { borderColor: '#60a5fa', color: '#60a5fa' },
                }}
              >
                Elegir
              </Button>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={saving || !proveedor?.carpeta_drive_id}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <DriveIcon />}
          sx={{
            bgcolor: '#2563eb',
            '&:hover': { bgcolor: '#1d4ed8' },
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
          }}
        >
          {saving ? 'Subiendo...' : 'Guardar en Drive'}
        </Button>
      </Box>
    </Box>
  )
}
