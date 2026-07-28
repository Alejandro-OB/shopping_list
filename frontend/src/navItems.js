import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Store,
  Server,
  Settings,
  TrendingUp,
} from 'lucide-react'

// Compartido entre Sidebar (menú completo) y BottomTabBar (subconjunto
// curado) — en su propio módulo para no romper Fast Refresh al exportar
// una constante junto a un componente.
export const NAV_ITEMS = [
  { label: 'Dashboard',         icon: LayoutDashboard, to: '/' },
  { label: 'Listas',            icon: ShoppingCart,    to: '/lists' },
  { label: 'Catálogo',          icon: BookOpen,        to: '/catalog' },
  { label: 'Tiendas',           icon: Store,           to: '/stores' },
  { label: 'Precios',           icon: TrendingUp,      to: '/price-evolution' },
  { label: 'Sistema',           icon: Server,          to: '/system-info' },
  { label: 'Configuración',     icon: Settings,        to: '/settings' },
]
