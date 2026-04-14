import { useEffect, useState } from 'react'
import {
  Store, Plus, Pencil, Trash2, X, Check, Search,
  Loader2, Package, Tag
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

// ── Modal de Crear/Editar Tienda ──────────────────────────────────────────────
function StoreModal({ store, onClose, onSaved }) {
  const isEdit = !!store
  const [name, setName] = useState(store?.name ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/stores/${store.id}/`, { name })
        toast.success('Tienda actualizada')
      } else {
        await api.post('/stores/', { name })
        toast.success('Tienda creada')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar tienda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-primary-400" />
            {isEdit ? 'Editar Tienda' : 'Nueva Tienda'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre de la tienda <span className="text-primary-500">*</span></label>
            <input
              autoFocus
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Éxito, Jumbo, D1..."
              className="input"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fila de Tienda ─────────────────────────────────────────────────────────────
function StoreRow({ store, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(store.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <tr className="border-b border-dark-800 hover:bg-dark-800/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm font-medium text-dark-100">{store.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(store)} className="btn-ghost p-1.5 text-xs">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDelete} disabled={deleting} className="btn-ghost p-1.5 text-red-400 hover:text-red-300">
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost p-1.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost p-1.5 text-xs hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Stores() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | store object

  useEffect(() => { fetchStores() }, [])

  const fetchStores = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/stores/')
      setStores(Array.isArray(data) ? data.filter(s => !s.is_deleted) : [])
    } catch {
      toast.error('Error al cargar tiendas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/stores/${id}/`)
      toast.success('Tienda eliminada')
      setStores(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar tienda')
    }
  }

  const filtered = stores.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      {modal !== null && (
        <StoreModal
          store={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={fetchStores}
        />
      )}

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-400" />
              Tiendas
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">{stores.length} tienda(s) registrada(s)</p>
          </div>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva Tienda
          </button>
        </div>

        {/* Search */}
        <div className="card py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tienda..."
              className="input pl-9"
            />
          </div>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800 bg-dark-950/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Tienda</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-dark-800">
                      <td colSpan={2} className="px-4 py-3">
                        <div className="h-8 bg-dark-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-16 text-center">
                      <Store className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                      <p className="text-dark-500 text-sm">
                        {search ? 'No se encontraron tiendas.' : 'Aún no tienes tiendas registradas.'}
                      </p>
                      {!search && (
                        <button onClick={() => setModal('create')} className="btn-primary mt-4 mx-auto">
                          <Plus className="w-4 h-4" /> Crear primera tienda
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <StoreRow
                      key={s.id}
                      store={s}
                      onEdit={(s) => setModal(s)}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
