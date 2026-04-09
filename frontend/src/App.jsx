import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import ListDetail from './pages/ListDetail'
import Dashboard from './pages/Dashboard'
import Catalog from './pages/Catalog'
import ShoppingLists from './pages/ShoppingLists'
import Products from './pages/Products'
import Stores from './pages/Stores'
import SystemInfo from './pages/SystemInfo'
import SettingsPage from './pages/Settings'
import PendingVerification from './pages/PendingVerification'
import VerifyEmail from './pages/VerifyEmail'
import ResetPassword from './pages/ResetPassword'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* Toast global */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#a855f7', secondary: '#1e293b' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
            },
          }}
        />

        <Routes>
          {/* Rutas Públicas */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pending-verification" element={<PendingVerification />} />

          {/* Rutas Protegidas (Requieren Login + Verificación) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/lists"     element={<ShoppingLists />} />
              <Route path="/lists/:id" element={<ListDetail />} />
              <Route path="/catalog"   element={<Catalog />} />
              <Route path="/products"  element={<Products />} />
              <Route path="/stores"    element={<Stores />} />
              <Route path="/system-info" element={<SystemInfo />} />
              <Route path="/settings"  element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
