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
  AppBar,
  Toolbar,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Receipt as LiquidacionesIcon,
  LocalShipping as LogisticaIcon,
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
  AddCircleOutlined as AdicionalesIcon,
  ManageAccounts as ConfigIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material'
import LogoTransvaal from '../../public/logo_transvaal.jpeg'


const SIDEBAR_WIDTH = 220

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

function SidebarItem({ item, collapsed, onNavigate }) {
  const [open, setOpen] = useState(false)

  if (item.children) {
    return (
      <>
        <ListItemButton
          onClick={() => setOpen((o) => !o)}
          sx={{
            borderRadius: 1.5,
            mx: 0.75,
            mb: 0.25,
            py: 0.75,
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          <ListItemIcon sx={{ color: '#fff', minWidth: 32 }}>
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 500, color: '#fff' } } }}
              />
              {open ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />}
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
                  onClick={onNavigate}
                >
                  {({ isActive }) => (
                    <ListItemButton
                      sx={{
                        borderRadius: 1.5,
                        mx: 0.75,
                        mb: 0.25,
                        py: 0.6,
                        pl: 3.5,
                        bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                        borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      <ListItemIcon sx={{ color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.75)', minWidth: 28 }}>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={child.label}
                        slotProps={{ primary: { sx: { fontSize: 12, color: isActive ? '#fff' : 'rgba(255,255,255,0.9)' } } }}
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
    <NavLink to={item.to} style={{ textDecoration: 'none' }} onClick={onNavigate}>
      {({ isActive }) => (
        <ListItemButton
          sx={{
            borderRadius: 1.5,
            mx: 0.75,
            mb: 0.25,
            py: 0.75,
            bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
            borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          <Tooltip title={collapsed ? item.label : ''} placement="right">
            <ListItemIcon sx={{ color: isActive ? '#60a5fa' : '#fff', minWidth: 32 }}>
              {item.icon}
            </ListItemIcon>
          </Tooltip>
          {!collapsed && (
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 500, color: '#fff' } } }}
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width:899px)')

  const sidebarWidth = collapsed ? 64 : SIDEBAR_WIDTH

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebarContent = (
    <>
      {/* Logo / Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1.5, gap: 1 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: 1.5,
            bgcolor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img src={LogoTransvaal} alt="Logo institucional Transvaal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </Box>
        {!collapsed && (
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
            Transvaal
          </Typography>
        )}
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            sx={{ ml: 'auto', color: 'rgba(255,255,255,0.5)', p: 0.5 }}
            size="small"
          >
            <MenuIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      {/* Nav items */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navItems.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            onNavigate={() => isMobile && setMobileOpen(false)}
          />
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />

      {/* User + Logout */}
      <Box sx={{ px: 1.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#3b82f6', fontSize: 12, flexShrink: 0 }}>
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </Avatar>
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 600, noWrap: true }}>
                {user?.username || 'Usuario'}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
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
    </>
  )

  const drawerSx = {
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    borderRight: 'none',
    boxShadow: 'none',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#0f172a' }}>

      {/* ── Desktop sidebar (permanent) ── */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              transition: 'width 0.25s ease',
              overflowX: 'hidden',
              ...drawerSx,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* ── Mobile drawer (temporary) ── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: SIDEBAR_WIDTH,
              boxSizing: 'border-box',
              ...drawerSx,
            },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* ── Contenido principal ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Top bar mobile */}
        {isMobile && (
          <AppBar
            position="static"
            elevation={0}
            sx={{
              bgcolor: '#0f172a',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Toolbar variant="dense" sx={{ px: 1.5, minHeight: 52 }}>
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ color: '#fff', mr: 1 }}
                size="medium"
              >
                <MenuIcon />
              </IconButton>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: 1,
                  bgcolor: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                }}
              >
                <LogisticaIcon sx={{ color: '#fff', fontSize: 14 }} />
              </Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                Transvaal
              </Typography>
              <Box sx={{ ml: 'auto' }}>
                <Tooltip title="Cerrar sesión">
                  <IconButton onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.5)' }} size="small">
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Box component="main" sx={{ flex: 1, p: { xs: 2, sm: 2.5 }, bgcolor: '#0f172a', minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
