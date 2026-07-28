import { useState } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import { Menu, ShoppingCart } from 'lucide-react'
import Sidebar from './Sidebar'
import OfflineBanner from './OfflineBanner'
import BottomTabBar from './BottomTabBar'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  // El detalle de lista tiene su propia StickyActionBar abajo — la tab-bar
  // global no se muestra ahí para no competir por el mismo espacio.
  const isListDetail = useMatch('/lists/:id')

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Banner offline / cambios pendientes */}
        <OfflineBanner />

        {/* Top bar (mobile) */}
        <header className="lg:hidden relative flex items-center justify-center px-4 py-3 bg-dark-900 border-b border-dark-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn-ghost p-2 absolute left-4"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary-600" />
            <p className="text-sm font-semibold text-dark-200">CompraYa</p>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto p-4 lg:p-6 ${!isListDetail ? 'pb-20 lg:pb-6' : ''}`}>
          <Outlet />
        </main>

        {!isListDetail && <BottomTabBar onMoreClick={() => setMobileOpen(true)} />}
      </div>
    </div>
  )
}
