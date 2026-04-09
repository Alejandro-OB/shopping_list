import { useEffect, useState } from 'react'
import {
  Package, Plus, Pencil, Trash2, X, Check, Search,
  Loader2, Store, Tag, Calendar, Link2, AlertCircle
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const FREQUENCY_LABELS = {
  weekly:     { label: 'Semanal',    cls: 'badge-purple' },
  biweekly:   { label: 'Quincenal',  cls: 'badge-blue'   },
  monthly:    { label: 'Mensual',    cls: 'badge-green'  },
  occasional: { label: 'Ocasional',  cls: 'badge-yellow' },
}

// ── Modal Crear/Editar Producto ───────────────────────────────────────────────
function ProductModal({ product, stores, onClose, onSaved }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    name: product?.name ?? '',
    frequency: product?.frequency ?? 'weekly',
    frequency_start_date: product?.frequency_start_date
      ? new Date(product.frequency_start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

  // Gestión de enlaces
  const [storeLinks, setStoreLinks] = useState(
    product?.product_stores?.filter(ps => !ps.is_deleted) ?? []
  )
  const [removedLinks, setRemovedLinks] = useState([])
  const [newLink, setNewLink] = useState({ store_id: '', price_catalog: '' })

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let savedProduct
      if (isEdit) {
        const { data } = await api.put(`/products/${product.id}`, form)
        savedProduct = data
        toast.success('Producto actualizado')
      } else {
        const { data } = await api.post('/products/', form)
        savedProduct = data
        toast.success('Producto creado')
      }

      const product_id = savedProduct.id

      // 1. Eliminar desvinculados
      if (removedLinks.length > 0) {
        await Promise.all(removedLinks.map(id => api.delete(`/stores/product-store/${id}`)))
      }

      // 2. Crear nuevos o actualizar precios de existentes
      await Promise.all(storeLinks.map(link => {
        if (!link.id) {
          // Es un vínculo NUEVO agregado en el modal
          return api.post('/stores/product-store', {
            product_id,
            store_id: link.store_id,
            price_catalog: Number(link.price_catalog),
          })
        } else {
          // Es un vínculo EXISTENTE: verificamos si el precio cambió
          const original = product.product_stores.find(ps => ps.id === link.id)
          if (original && Number(original.price_catalog) !== Number(link.price_catalog)) {
            return api.patch(`/stores/product-store/${link.id}`, {
              price_catalog: Number(link.price_catalog)
            })
          }
          return Promise.resolve()
        }
      }))

      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar producto')
    } finally {
      setLoading(false)
    }
  }

  const addLink = () => {
    if (!newLink.store_id || !newLink.price_catalog || parseFloat(newLink.price_catalog) < 0) {
      return toast.error('Selecciona una tienda y un precio válido')
    }
    const storeObj = stores.find(s => s.id === parseInt(newLink.store_id))
    // Evitar duplicados en el mismo modal si se intenta agregar la misma tienda
    if (storeLinks.some(l => l.store_id === parseInt(newLink.store_id))) {
      return toast.error('Esta tienda ya está en la lista')
    }

    setStoreLinks(prev => [...prev, {
      store_id: parseInt(newLink.store_id),
      store: { name: storeObj?.name }, // Para que se muestre el nombre
      price_catalog: parseFloat(newLink.price_catalog),
    }])
    setNewLink({ store_id: '', price_catalog: '' })
  }

  const removeLink = (index) => {
    const link = storeLinks[index]
    if (link.id) {
      setRemovedLinks(prev => [...prev, link.id])
    }
    setStoreLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdatePrice = (index, val) => {
    setStoreLinks(prev => {
      const next = [...prev]
      next[index] = { ...next[index], price_catalog: val }
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-primary-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-400" />
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre del producto <span className="text-primary-500">*</span></label>
            <input
              autoFocus required
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Leche entera, Arroz, Jabón..."
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frecuencia <span className="text-primary-500">*</span></label>
              <select name="frequency" value={form.frequency} onChange={handleChange} className="input">
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quincenal</option>
                <option value="monthly">Mensual</option>
                <option value="occasional">Ocasional</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha de inicio <span className="text-primary-500">*</span></label>
              <input
                required
                name="frequency_start_date"
                type="date"
                value={form.frequency_start_date}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="label flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5" /> Tiendas y Precios
            </label>

            {stores.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Crea al menos una tienda primero para poder vincularla.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {storeLinks.map((link, i) => (
                    <div key={i} className="flex items-center justify-between bg-dark-800 rounded-lg px-3 py-2 text-sm border border-dark-700/50">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-dark-200 truncate max-w-[150px]">{link.store?.name || link.store_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-500 text-[10px]">$</span>
                          <input
                            type="number"
                            value={link.price_catalog}
                            onChange={(e) => handleUpdatePrice(i, e.target.value)}
                            className="bg-dark-900 border border-dark-700 rounded px-5 py-1 w-24 text-right text-xs font-mono text-dark-100 focus:outline-none focus:border-primary-500 transition-colors"
                          />
                        </div>
                        <button type="button" onClick={() => removeLink(i)} className="text-dark-500 hover:text-red-400 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 bg-dark-950/30 p-2 rounded-xl border border-dark-800">
                  <select
                    value={newLink.store_id}
                    onChange={e => setNewLink(l => ({ ...l, store_id: e.target.value }))}
                    className="input flex-1 text-xs"
                  >
                    <option value="">Tienda...</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newLink.price_catalog}
                    onChange={e => setNewLink(l => ({ ...l, price_catalog: e.target.value }))}
                    placeholder="Precio $"
                    className="input w-24 text-xs"
                  />
                  <button type="button" onClick={addLink} className="btn-secondary px-3 py-1">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fila de Producto ──────────────────────────────────────────────────────────
function ProductRow({ product, stores, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const freq = FREQUENCY_LABELS[product.frequency] ?? { label: product.frequency, cls: 'badge-purple' }
  const activeStores = product.product_stores?.filter(ps => !ps.is_deleted) ?? []

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete(product.id) }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <tr className="border-b border-dark-800 hover:bg-dark-800/40 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600/10 flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-primary-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-dark-100">{product.name}</p>
            {activeStores.length > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Store className="w-2.5 h-2.5 text-dark-500" />
                <span className="text-xs text-dark-500">
                  {activeStores.map(ps => ps.store?.name).filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {activeStores.length > 0 ? (
          <div className="flex flex-col">
            <span className="text-sm font-mono text-primary-300">
              {activeStores.length > 1 ? 'Desde ' : ''}
              ${Math.min(...activeStores.map(ps => ps.price_catalog)).toLocaleString('es-CO')}
            </span>
          </div>
        ) : (
          <span className="text-xs text-dark-500 italic">Sin vincular</span>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <span className={freq.cls}>{freq.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(product)} className="btn-ghost p-1.5">
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
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost p-1.5 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Products() {
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [freqFilter, setFreqFilter] = useState('all')
  const [modal, setModal] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [prodRes, storeRes] = await Promise.all([
        api.get('/products/'),
        api.get('/stores/'),
      ])
      setProducts(Array.isArray(prodRes.data) ? prodRes.data.filter(p => !p.is_deleted) : [])
      setStores(Array.isArray(storeRes.data) ? storeRes.data.filter(s => !s.is_deleted) : [])
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`)
      toast.success('Producto eliminado')
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar producto')
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFreq = freqFilter === 'all' || p.frequency === freqFilter
    return matchSearch && matchFreq
  })

  return (
    <>
      {modal !== null && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          stores={stores}
          onClose={() => setModal(null)}
          onSaved={fetchAll}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-primary-400" />
              Productos
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">{products.length} producto(s) en tu catálogo</p>
          </div>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        </div>

        {/* Filters */}
        <div className="card flex flex-col sm:flex-row gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="input pl-9"
            />
          </div>
          <select
            value={freqFilter}
            onChange={e => setFreqFilter(e.target.value)}
            className="input w-full sm:w-auto"
          >
            <option value="all">Todas las frecuencias</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
            <option value="occasional">Ocasional</option>
          </select>
        </div>

        {/* Table */}
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800 bg-dark-950/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider hidden md:table-cell">Frecuencia</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-dark-800">
                      <td colSpan={3} className="px-4 py-3">
                        <div className="h-8 bg-dark-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-16 text-center">
                      <Package className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                      <p className="text-dark-500 text-sm">
                        {search || freqFilter !== 'all' ? 'No se encontraron productos.' : 'Aún no tienes productos registrados.'}
                      </p>
                      {!search && freqFilter === 'all' && (
                        <button onClick={() => setModal('create')} className="btn-primary mt-4 mx-auto">
                          <Plus className="w-4 h-4" /> Crear primer producto
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <ProductRow
                      key={p.id}
                      product={p}
                      stores={stores}
                      onEdit={p => setModal(p)}
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
