import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NAV_ITEMS } from '../navItems'

// Los 4 destinos de más uso en un viaje de compras. El resto (Precios,
// Sistema, Configuración, Cerrar sesión) queda detrás de "Más", que abre
// el mismo overlay del hamburguesa — sin overlay/modal nuevo.
const PRIMARY_LABELS = ['Dashboard', 'Listas', 'Catálogo', 'Tiendas']
const primaryItems = NAV_ITEMS.filter(i => PRIMARY_LABELS.includes(i.label))

export default function BottomTabBar({ onMoreClick }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 safe-bottom bg-dark-900 border-t border-dark-800">
      <div className="grid grid-cols-5">
        {primaryItems.map(({ label, icon, to }) => {
          const Icon = icon
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `tap-target flex-col gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-primary-600' : 'text-dark-400'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          )
        })}
        <button
          onClick={onMoreClick}
          className="tap-target flex-col gap-0.5 py-2 text-[10px] font-medium text-dark-400"
        >
          <Menu className="w-5 h-5" />
          Más
        </button>
      </div>
    </nav>
  )
}
