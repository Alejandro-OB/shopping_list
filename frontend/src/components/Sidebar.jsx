import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Store,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Sparkles,
  X,
  BookOpen,
  Server,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/' },
  { label: 'Listas',         icon: ShoppingCart,    to: '/lists' },
  { label: 'Catálogo',       icon: BookOpen,        to: '/catalog' },
  { label: 'Productos',      icon: Package,         to: '/products' },
  { label: 'Tiendas',        icon: Store,           to: '/stores' },
  { label: 'Sistema',        icon: Server,          to: '/system-info' },
  { label: 'Configuración',  icon: Settings,        to: '/settings' },
]

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Sesión cerrada')
    navigate('/login')
  }

  // ── Contenido del sidebar ─────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-dark-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">ShopList</p>
            <p className="text-xs text-primary-400 truncate">Smart Shopping</p>
          </div>
        )}
        {/* Close btn on mobile */}
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden text-dark-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onMobileClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-dark-800 p-3 space-y-1">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-lg bg-dark-800 mt-2">
            <p className="text-xs font-medium text-dark-200 truncate">{user.name}</p>
            <p className="text-xs text-dark-500 truncate">{user.email}</p>
          </div>
        )}
      </div>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex border-t border-dark-800 p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="btn-ghost w-full justify-center"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-full bg-dark-900 border-r border-dark-800
                    transition-all duration-300 flex-shrink-0
                    ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative flex flex-col w-64 h-full bg-dark-900 border-r border-dark-800 animate-slide-in">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
