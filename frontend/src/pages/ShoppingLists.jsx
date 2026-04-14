import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Trash2, Eye, Filter, Loader2, Search, Check, X } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const STATUS_MAP = {
  draft:     { label: 'Borrador',   cls: 'badge-yellow' },
  active:    { label: 'Activa',     cls: 'badge-purple' },
  completed: { label: 'Completada', cls: 'badge-green'  },
}

function ListRow({ list, onView, onDelete }) {
  const s = STATUS_MAP[list.status] || { label: list.status, cls: 'badge-purple' }
  const date = new Date(list.date).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isCompleted = list.status === 'completed'

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
    <tr className="border-b border-dark-800 hover:bg-dark-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-3.5 h-3.5 text-primary-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-dark-100 truncate max-w-[220px]">{list.name}</p>
            {list.is_auto_generated && (
              <p className="text-xs text-primary-500">Auto-generada</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-dark-400 hidden sm:table-cell">{date}</td>
      <td className="px-4 py-3">
        <span className={s.cls}>{s.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onView(list)}
            className="btn-ghost text-xs px-2 py-1"
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
                  className="w-6 h-6 flex items-center justify-center text-dark-400 hover:text-dark-200 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Confirmar eliminación"
                  className="w-6 h-6 flex items-center justify-center text-dark-400 hover:text-red-400 rounded transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Eliminar lista"
                className="btn-ghost text-xs px-2 py-1 text-dark-500 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )
          )}
        </div>
      </td>
    </tr>
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

  const fetchLists = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/lists/')
      setLists(Array.isArray(data) ? data : [])
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
      setLists(prev => prev.filter(l => l.id !== listId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar la lista')
    }
  }

  const filtered = lists.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || l.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-400" />
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

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800 bg-dark-950/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Lista</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-dark-800">
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-8 bg-dark-800 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <ShoppingCart className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                    <p className="text-dark-500 text-sm">No se encontraron listas.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <ListRow key={l.id} list={l} onView={(l) => navigate(`/lists/${l.id}`)} onDelete={handleDeleteList} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
