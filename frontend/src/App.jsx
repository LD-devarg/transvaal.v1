import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

// Layouts
import AdminLayout from './layouts/AdminLayout'
import EmpleadoLayout from './layouts/EmpleadoLayout'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin pages
import DashboardPage from './pages/dashboard/DashboardPage'
import ViajesPage from './pages/logistica/ViajesPage'
import GastosPage from './pages/logistica/GastosPage'
import PreliquidacionesPage from './pages/liquidaciones/PreliquidacionesPage'
import LiquidacionesPage from './pages/liquidaciones/LiquidacionesPage'
import DocumentacionPage from './pages/administracion/DocumentacionPage'
import ClientesPage from './pages/administracion/ClientesPage'
import ProveedoresPage from './pages/administracion/ProveedoresPage'
import SalidasPage from './pages/administracion/SalidasPage'
import TarifasPage from './pages/administracion/TarifasPage'
import AdicionalesPage from './pages/administracion/AdicionalesPage'
import ConfiguracionPage from './pages/administracion/ConfiguracionPage'

// Empleado pages
import MisViajesPage from './pages/empleado/MisViajesPage'
import MisPreliquidacionesPage from './pages/empleado/MisPreliquidacionesPage'
import MiDocumentacionPage from './pages/empleado/MiDocumentacionPage'
import MisLiquidacionesPage from './pages/empleado/MisLiquidacionesPage'
import MiPerfilPage from './pages/empleado/MiPerfilPage'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin / Contable / Superusuario */}
          <Route
            element={
              <PrivateRoute>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="logistica/viajes" element={<ViajesPage />} />
            <Route path="logistica/gastos" element={<GastosPage />} />
            <Route path="liquidaciones/preliquidaciones" element={<PreliquidacionesPage />} />
            <Route path="liquidaciones/liquidaciones" element={<LiquidacionesPage />} />
            <Route path="administracion/documentacion" element={<DocumentacionPage />} />
            <Route path="administracion/clientes" element={<ClientesPage />} />
            <Route path="administracion/proveedores" element={<ProveedoresPage />} />
            <Route path="administracion/salidas" element={<SalidasPage />} />
            <Route path="administracion/tarifas" element={<TarifasPage />} />
            <Route path="administracion/adicionales" element={<AdicionalesPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
          </Route>

          {/* Empleado */}
          <Route
            path="empleado"
            element={
              <PrivateRoute>
                <EmpleadoLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="viajes" replace />} />
            <Route path="viajes" element={<MisViajesPage />} />
            <Route path="preliquidaciones" element={<MisPreliquidacionesPage />} />
            <Route path="liquidaciones" element={<MisLiquidacionesPage />} />
            <Route path="documentacion" element={<MiDocumentacionPage />} />
            <Route path="perfil" element={<MiPerfilPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
