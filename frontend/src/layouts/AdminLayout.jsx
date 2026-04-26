import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  LocalShipping as LogisticaIcon,
  Receipt as LiquidacionesIcon,
  Settings as AdminIcon,
  ExpandLess,
  ExpandMore,
  DirectionsCar as ViajesIcon,
  AttachMoney as GastosIcon,
  ListAlt as PreliquidacionesIcon,
  AccountBalance as LiquidacionIcon,
  Folder as DocIcon,
  People as ClientesIcon,
  LocalShipping as ProveedoresIcon,
  AltRoute as SalidasIcon,
  PriceChange as TarifasIcon,
  AddCircleOutline as AdicionalesIcon,
  ManageAccounts as ConfigIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'

const SIDEBAR_WIDTH = 260

const navItems = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    to: '/',
  },
  {
    label: 'Logística',
    icon: <LogisticaIcon />,
    children: [
      { label: 'Viajes', icon: <ViajesIcon />, to: '/logistica/viajes' },
      { label: 'Gastos', icon: <GastosIcon />, to: '/logistica/gastos' },
    ],
  },
  {
    label: 'Liquidaciones',
    icon: <LiquidacionesIcon />,
    children: [
      { label: 'Preliquidaciones', icon: <PreliquidacionesIcon />, to: '/liquidaciones/preliquidaciones' },
      { label: 'Liquidaciones', icon: <LiquidacionIcon />, to: '/liquidaciones/liquidaciones' },
    ],
  },
  {
    label: 'Administración',
    icon: <AdminIcon />,
    children: [
      { label: 'Documentación', icon: <DocIcon />, to: '/administracion/documentacion' },
      { label: 'Clientes', icon: <ClientesIcon />, to: '/administracion/clientes' },
      { label: 'Proveedores', icon: <ProveedoresIcon />, to: '/administracion/proveedores' },
      { label: 'Salidas', icon: <SalidasIcon />, to: '/administracion/salidas' },
      { label: 'Tarifas', icon: <TarifasIcon />, to: '/administracion/tarifas' },
      { label: 'Adicionales', icon: <AdicionalesIcon />, to: '/administracion/adicionales' },
    ],
  },
  {
    label: 'Configuración',
    icon: <ConfigIcon />,
    to: '/configuracion',
  },
]

function SidebarItem({ item, collapsed }) {
  const [open, setOpen] = useState(false)

  if (item.children) {
    return (
      <>
        <ListItemButton
          onClick={() => setOpen((o) => !o)}
          sx={{
            borderRadius: 2,
            mx: 1,
            mb: 0.5,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          <ListItemIcon sx={{ color: 'rgba(255,255,255,0.7)', minWidth: 36 }}>
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}
              />
              {open ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
            </>
          )}
        </ListItemButton>
        {!collapsed && (
          <Collapse in={open} timeout="auto">
            <List disablePadding>
              {item.children.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  style={{ textDecoration: 'none' }}
                >
                  {({ isActive }) => (
                    <ListItemButton
                      sx={{
                        borderRadius: 2,
                        mx: 1,
                        mb: 0.5,
                        pl: 4,
                        bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                        borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.5)', minWidth: 32 }}>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={child.label}
                        primaryTypographyProps={{
                          fontSize: 13,
                          color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                        }}
                      />
                    </ListItemButton>
                  )}
                </NavLink>
              ))}
            </List>
          </Collapse>
        )}
      </>
    )
  }

  return (
    <NavLink to={item.to} style={{ textDecoration: 'none' }}>
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
          <Tooltip title={collapsed ? item.label : ''} placement="right">
            <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.7)', minWidth: 36 }}>
              {item.icon}
            </ListItemIcon>
          </Tooltip>
          {!collapsed && (
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
              }}
            />
          )}
        </ListItemButton>
      )}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const sidebarWidth = collapsed ? 64 : SIDEBAR_WIDTH

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
          width: sidebarWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            borderRight: 'none',
            transition: 'width 0.25s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo / Header */}
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
              flexShrink: 0,
            }}
          >
            <LogisticaIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          {!collapsed && (
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px' }}>
              Transvaal
            </Typography>
          )}
          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            sx={{ ml: 'auto', color: 'rgba(255,255,255,0.5)', p: 0.5 }}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

        {/* Nav items */}
        <List sx={{ flex: 1, pt: 1.5 }}>
          {navItems.map((item) => (
            <SidebarItem key={item.label} item={item} collapsed={collapsed} />
          ))}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

        {/* User + Logout */}
        <Box sx={{ px: 1.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#3b82f6', fontSize: 14, flexShrink: 0 }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          {!collapsed && (
            <>
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 600, noWrap: true }}>
                  {user?.username || 'Usuario'}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                  {user?.email || ''}
                </Typography>
              </Box>
              <Tooltip title="Cerrar sesión">
                <IconButton onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#f87171' } }} size="small">
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box
          component="main"
          sx={{
            flex: 1,
            p: 3,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
