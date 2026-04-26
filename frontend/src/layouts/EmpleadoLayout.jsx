import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  DirectionsCar as ViajesIcon,
  Folder as DocIcon,
  AccountBalance as LiquidacionIcon,
  Person as PerfilIcon,
  Logout as LogoutIcon,
  LocalShipping as LogoIcon,
} from '@mui/icons-material'

const SIDEBAR_WIDTH = 240

const navItems = [
  { label: 'Mis Viajes', icon: <ViajesIcon />, to: '/empleado/viajes' },
  { label: 'Documentación', icon: <DocIcon />, to: '/empleado/documentacion' },
  { label: 'Mis Liquidaciones', icon: <LiquidacionIcon />, to: '/empleado/liquidaciones' },
  { label: 'Mi Perfil', icon: <PerfilIcon />, to: '/empleado/perfil' },
]

export default function EmpleadoLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRight: 'none',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2.5, gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogoIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
            Transvaal
          </Typography>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

        {/* Nav */}
        <List sx={{ flex: 1, pt: 1.5 }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItemButton
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    mb: 0.5,
                    bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)', minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                    }}
                  />
                </ListItemButton>
              )}
            </NavLink>
          ))}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

        {/* User + Logout */}
        <Box sx={{ px: 1.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#3b82f6', fontSize: 14 }}>
            {user?.username?.[0]?.toUpperCase() || 'E'}
          </Avatar>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {user?.username || 'Empleado'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {user?.email || ''}
            </Typography>
          </Box>
          <Tooltip title="Cerrar sesión">
            <IconButton
              onClick={handleLogout}
              sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#f87171' } }}
              size="small"
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
