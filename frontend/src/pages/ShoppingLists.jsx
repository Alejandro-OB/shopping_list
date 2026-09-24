import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Eye, Filter, Loader2, Search, Check, X } from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import { autoListDate, listTitle } from '../listLabels'
import toast from 'react-hot-toast'

const LISTS_TTL = 5 * 60 * 1000 // 5 minutos (listas cambian más seguido que productos)

const STATUS_MAP = {
  draft:     { label: 'Borrador',   cls: 'badge-yellow' },
  active:    { label: 'Activa',     cls: 'badge-purple' },
  completed: { label: 'Completada', cls: 'badge-green'  },
}

// Mismo template de columnas para el header (hidden sm:grid) y cada ListRow.
// La tabla anterior desbordaba el ancho del teléfono: el estado quedaba
// cortado contra el borde y los botones de ver y eliminar caían fuera de la
// pantalla, sin forma de alcanzarlos. El mismo cambio que ya se hizo en el
// catálogo (CatalogRow): rejilla que se apila en mobile y sin scroll lateral.
const LIST_GRID_COLS = 'sm:grid-cols-[minmax(0,1fr)_160px_130px_110px]'

function ListRow({ list, onView, onDelete }) {
  const s = STATUS_MAP[list.status] || { label: list.status, cls: 'badge-purple' }
  const date = new Date(list.date).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isCompleted = list.status === 'completed'
  // En las automáticas el título ya es la fecha, así que repetirla en mobile
  // parte el renglón en dos y no añade nada. En las demás sí informa.
  const titleHasDate = autoListDate(list) !== null

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(list.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    // En mobile son dos columnas —contenido y acciones— y no una pila: las
    // celdas de fecha y estado están ocultas ahí, así que no ocupan lugar en la
    // rejilla y los botones suben a la misma línea del nombre.
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] ${LIST_GRID_COLS} items-center gap-x-2 px-4 py-3 border-b border-dark-800 last:border-0 hover:bg-dark-800/50 transition-colors cursor-pointer`}
      onClick={() => onView(list)}
    >
      {/* Grupo 1: icono + nombre (+ fecha y estado inline en mobile) */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
          <ShoppingCart className="w-3.5 h-3.5 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dark-100 truncate">{listTitle(list)}</p>
          {list.is_auto_generated && (
            <p className="text-xs text-primary-500">Auto-generada</p>
          )}
          {/* Fecha + estado — solo mobile (desktop los muestra en columnas) */}
          <div className="sm:hidden flex items-center gap-2 mt-1">
            {!titleHasDate && <span className="text-xs text-dark-400">{date}</span>}
            <span className={s.cls}>{s.label}</span>
          </div>
        </div>
      </div>

      {/* Grupo 2: Fecha — solo desde sm: */}
      <span className="hidden sm:block text-sm text-dark-400">{date}</span>

      {/* Grupo 3: Estado — solo desde sm: */}
      <span className="hidden sm:block">
        <span className={s.cls}>{s.label}</span>
      </span>

      {/* Grupo 4: Acciones */}
      <div onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(list)}
            className="tap-target btn-ghost text-xs px-2 py-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver</span>
          </button>

          {/* Botón eliminar: solo en listas activas/draft */}
          {!isCompleted && (
            confirmDelete ? (
              <div className="flex items-center gap-1 bg-dark-800 border border-dark-700 rounded-lg px-2 py-1">
                <span className="text-xs text-dark-400 mr-1">¿Eliminar?</span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  title="Cancelar"
                  className="tap-target text-dark-400 hover:text-dark-200 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Confirmar eliminación"
                  className="tap-target text-dark-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Eliminar lista"
                className="tap-target btn-ghost text-xs px-2 py-1 text-dark-500 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShoppingLists() {
  const navigate = useNavigate()
  const [lists, setLists]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState('all')

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async (force = false) => {
    if (!force) {
      const cached = apiCache.get('/lists/')
      if (cached) { setLists(cached); setLoading(false); return }
    }
    setLoading(true)
    try {
      const { data } = await api.get('/lists/')
      const lists = Array.isArray(data) ? data : []
      apiCache.set('/lists/', lists, LISTS_TTL)
      setLists(lists)
    } catch {
      toast.error('Error al cargar las listas')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteList = async (listId) => {
    try {
      await api.delete(`/lists/${listId}/`)
      toast.success('Lista eliminada')
      apiCache.invalidate('/lists/')
      setLists(prev => prev.filter(l => l.id !== listId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar la lista')
    }
  }

  const filtered = lists.filter((l) => {
    // Se busca contra los dos textos a propósito: el título que el usuario ve
    // ("Lista del 22 de sept") y el nombre guardado, que en las automáticas
    // trae la fecha ISO y es la única forma de buscar por "2026-09".
    const needle = search.toLowerCase()
    const matchSearch =
      l.name.toLowerCase().includes(needle) || listTitle(l).toLowerCase().includes(needle)
    const matchFilter = filter === 'all' || l.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-dark-200 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            Listas de Compras
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">{lists.length} lista(s) en total</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lista..."
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-dark-500 flex-shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Todos</option>
            <option value="draft">Borrador</option>
            <option value="active">Activa</option>
            <option value="completed">Completada</option>
          </select>
        </div>
      </div>

      {/* Listado — grid responsive: apilado en mobile, columnas desde sm: */}
      <div className="card p-0 overflow-hidden">
        <div className={`hidden sm:grid ${LIST_GRID_COLS} sm:items-center px-4 py-3 border-b border-dark-800 bg-dark-950/50`}>
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Lista</span>
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Fecha</span>
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider">Estado</span>
          <span />
        </div>
        <div>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-dark-800">
                <div className="h-8 bg-dark-800 rounded animate-pulse" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <ShoppingCart className="w-10 h-10 text-dark-700 mx-auto mb-3" />
              <p className="text-dark-500 text-sm">No se encontraron listas.</p>
            </div>
          ) : (
            filtered.map((l) => (
              <ListRow key={l.id} list={l} onView={(l) => navigate(`/lists/${l.id}`)} onDelete={handleDeleteList} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
