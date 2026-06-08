import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ShoppingCart, Store, CheckCircle2, Check, X,
  Circle, AlertCircle, Loader2, Sparkles, Pencil, Save,
  TrendingDown, TrendingUp, Minus, Plus, Trash2, FileText, Download,
  FileSpreadsheet, MessageSquare, Search, Filter, Tag, RefreshCw, PackagePlus, ChevronDown,
  BookmarkPlus, Scale,
} from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import toast from 'react-hot-toast'
import ProductModal from '../components/ProductModal'

// ── Modal: Comparar tiendas ────────────────────────────────────────────────────
function StoreComparisonModal({ listId, onClose }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [expanded, setExpanded] = useState(new Set()) // store_ids con missing expandido

  useEffect(() => {
    api.get(`/lists/${listId}/store-comparison/`)
      .then(({ data }) => setData(data))
      .catch(() => toast.error('No se pudo calcular la comparación'))
      .finally(() => setLoading(false))
  }, [listId])

  const toggleExpanded = (storeId) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(storeId) ? next.delete(storeId) : next.add(storeId)
    return next
  })

  const cheapest = data?.stores?.[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-dark-800">
          <h2 className="text-sm font-bold text-dark-200 flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary-600" />
            Comparar tiendas
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : !data || data.stores.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Store className="w-10 h-10 text-dark-700 mx-auto" />
              <p className="text-dark-500 text-sm">No hay tiendas para comparar.</p>
              <p className="text-dark-600 text-xs">Vincula tus productos a varias tiendas en el Catálogo.</p>
            </div>
          ) : (
            <>
              {data.stores.map((s) => {
                const isCheapest = s.store_id === cheapest.store_id
                const fullCoverage = s.missing_count === 0
                return (
                  <div
                    key={s.store_id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isCheapest
                        ? 'border-primary-500/50 bg-primary-600/8'
                        : 'border-dark-800 bg-dark-950/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCheapest ? 'bg-primary-500/20' : 'bg-amber-500/10'
                        }`}>
                          <Store className={`w-4 h-4 ${isCheapest ? 'text-primary-500' : 'text-amber-600'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-dark-100 truncate">{s.store_name}</p>
                            {isCheapest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-500 font-bold uppercase tracking-wider">
                                Recomendado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-dark-500">
                            {s.available_count} de {s.available_count + s.missing_count} productos
                            {fullCoverage && <span className="text-emerald-500 font-medium"> · completo</span>}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-base font-bold font-mono ${isCheapest ? 'text-primary-500' : 'text-dark-200'}`}>
                          ${s.subtotal.toLocaleString('es-CO')}
                        </p>
                        {!isCheapest && cheapest && (
                          <p className="text-[10px] text-dark-500">
                            +${(s.subtotal - cheapest.subtotal).toLocaleString('es-CO')}
                          </p>
                        )}
                      </div>
                    </div>

                    {s.missing_count > 0 && (
                      <button
                        onClick={() => toggleExpanded(s.store_id)}
                        className="mt-3 text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Te faltarían {s.missing_count}
                        <ChevronDown className={`w-3 h-3 transition-transform ${expanded.has(s.store_id) ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {expanded.has(s.store_id) && s.missing_product_names.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-dark-400 pl-4">
                        {s.missing_product_names.map((name, i) => (
                          <li key={i} className="list-disc">{name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}

              {data.free_items_total > 0 && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-dark-950/50 border border-dark-800 text-xs text-dark-400 flex items-center justify-between">
                  <span>+ Productos libres (suman a cualquier tienda)</span>
                  <span className="font-mono font-bold text-dark-300">
                    ${data.free_items_total.toLocaleString('es-CO')}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal: Agregar productos a la lista ────────────────────────────────────────
function AddItemsModal({ listId, existingItems, onClose, onAdded }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState({}) // { product_store_id: quantity }
  const [saving, setSaving] = useState(false)

  // Producto libre
  const [showFreeForm, setShowFreeForm] = useState(false)
  const [freeItems, setFreeItems] = useState([]) // [{ free_name, quantity, price }]
  const [freeName, setFreeName] = useState('')
  const [freeQty, setFreeQty] = useState(1)
  const [freePrice, setFreePrice] = useState('')

  const addFreeItem = () => {
    if (!freeName.trim()) return toast.error('Escribe el nombre del producto')
    setFreeItems(prev => [...prev, {
      free_name: freeName.trim(),
      quantity: Math.max(1, parseInt(freeQty) || 1),
      price: freePrice ? parseFloat(freePrice) : null,
    }])
    setFreeName('')
    setFreeQty(1)
    setFreePrice('')
  }

  const removeFreeItem = (i) =>
    setFreeItems(prev => prev.filter((_, idx) => idx !== i))

  useEffect(() => {
    const cached = apiCache.get('/products/')
    if (cached) { setProducts(cached); setLoading(false); return }
    api.get('/products/')
      .then(({ data }) => {
        const prods = Array.isArray(data) ? data.filter(p => !p.is_deleted) : []
        apiCache.set('/products/', prods)
        setProducts(prods)
      })
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false))
  }, [])

  const existingPsIds = new Set(existingItems.map(i => i.product_store_id))

  const flatItems = products.flatMap(p =>
    p.product_stores
      .filter(ps => !ps.is_deleted)
      .map(ps => ({
        product_store_id: ps.id,
        product_name: p.name,
        store_name: ps.store?.name ?? '—',
        price: ps.price_catalog,
        already_in_list: existingPsIds.has(ps.id),
      }))
  )

  const filtered = flatItems.filter(item =>
    item.product_name.toLowerCase().includes(search.toLowerCase()) ||
    item.store_name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (psId) => {
    setSelected(prev => {
      if (prev[psId]) { const next = { ...prev }; delete next[psId]; return next }
      return { ...prev, [psId]: 1 }
    })
  }

  const updateQty = (psId, delta) => {
    setSelected(prev => ({ ...prev, [psId]: Math.max(1, (prev[psId] || 1) + delta) }))
  }

  const handleAdd = async () => {
    const linkedItems = Object.entries(selected).map(([id, qty]) => ({
      product_store_id: parseInt(id),
      quantity: qty,
    }))
    const freePayload = freeItems.map(it => ({
      free_name: it.free_name,
      quantity: it.quantity,
      price: it.price,
    }))
    const items = [...linkedItems, ...freePayload]
    if (!items.length) return
    setSaving(true)
    try {
      await api.post(`/lists/${listId}/items/`, items)
      apiCache.invalidate('/lists/')
      toast.success(`${items.length} producto(s) agregado(s)`)
      onAdded()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al agregar productos')
    } finally {
      setSaving(false)
    }
  }

  const selectedCount = Object.keys(selected).length + freeItems.length

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-900 border border-dark-700 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-dark-800">
          <h2 className="text-sm font-bold text-dark-200 flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-primary-600" />
            Agregar productos a la lista
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-dark-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto o tienda..."
              className="input pl-9 py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Producto libre */}
        <div className="px-3 py-2 border-b border-dark-800 bg-dark-950/30">
          <button
            onClick={() => setShowFreeForm(v => !v)}
            className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-500 transition-colors font-medium"
          >
            <Plus className={`w-3 h-3 transition-transform ${showFreeForm ? 'rotate-45' : ''}`} />
            Producto libre
          </button>
          {showFreeForm && (
            <div className="mt-2 space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={freeName}
                  onChange={e => setFreeName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeItem() } }}
                  placeholder="Nombre"
                  className="input flex-1 py-1.5 text-xs"
                />
                <input
                  type="number"
                  min="1"
                  value={freeQty}
                  onChange={e => setFreeQty(e.target.value)}
                  placeholder="Cant."
                  className="input w-14 py-1.5 text-xs text-center"
                />
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={freePrice}
                  onChange={e => setFreePrice(e.target.value)}
                  placeholder="Precio $"
                  className="input w-20 py-1.5 text-xs"
                />
                <button
                  onClick={addFreeItem}
                  className="btn-primary py-1.5 px-2.5 text-xs"
                  title="Agregar a la selección"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {freeItems.length > 0 && (
                <div className="space-y-1">
                  {freeItems.map((it, i) => (
                    <div key={i} className="flex items-center gap-2 bg-dark-800/60 rounded px-2 py-1 text-xs">
                      <span className="flex-1 text-dark-200 truncate">
                        <span className="text-primary-600 font-bold mr-1">{it.quantity}x</span>
                        {it.free_name}
                        {it.price ? <span className="text-dark-500 ml-1">· ${it.price.toLocaleString('es-CO')}</span> : null}
                      </span>
                      <button
                        onClick={() => removeFreeItem(i)}
                        className="text-dark-500 hover:text-red-600 p-0.5"
                        title="Quitar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <PackagePlus className="w-8 h-8 text-dark-700 mx-auto mb-2" />
              <p className="text-dark-500 text-sm">No se encontraron productos.</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-800/50">
              {filtered.map(item => {
                const isSelected = !!selected[item.product_store_id]
                const qty = selected[item.product_store_id] || 1

                return (
                  <div
                    key={item.product_store_id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      item.already_in_list
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'bg-primary-600/8'
                          : 'hover:bg-dark-800/40 cursor-pointer'
                    }`}
                    onClick={() => !item.already_in_list && toggle(item.product_store_id)}
                  >
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-dark-600 bg-dark-800'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-100 truncate">{item.product_name}</p>
                      <p className="text-xs text-dark-500 flex items-center gap-1 mt-0.5">
                        <Store className="w-3 h-3" />
                        {item.store_name}
                        {item.already_in_list && (
                          <span className="ml-1 text-primary-600 font-medium">· ya en lista</span>
                        )}
                      </p>
                    </div>

                    {/* Precio + cantidad */}
                    <div className="flex-shrink-0 text-right" onClick={e => e.stopPropagation()}>
                      <p className="text-sm font-bold text-dark-300">
                        ${item.price.toLocaleString('es-CO')}
                      </p>
                      {isSelected && (
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <button
                            onClick={() => updateQty(item.product_store_id, -1)}
                            className="w-5 h-5 rounded bg-dark-700 text-dark-400 hover:text-primary-600 hover:bg-dark-600 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-xs font-bold text-dark-200 w-5 text-center">{qty}</span>
                          <button
                            onClick={() => updateQty(item.product_store_id, 1)}
                            className="w-5 h-5 rounded bg-dark-700 text-dark-400 hover:text-primary-600 hover:bg-dark-600 flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-dark-800 flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleAdd}
            disabled={selectedCount === 0 || saving}
            className="btn-primary flex-1"
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Agregando...</>
              : <><Plus className="w-4 h-4" /> {selectedCount > 0 ? `Agregar (${selectedCount})` : 'Agregar'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemRow({ item, listId, onCheck, onDelete, onUpdateQuantity, onPromoteToProduct, isDisabled }) {
  // Persistir el precio digitado en localStorage para no perderlo al refrescar
  const storageKey = `pendingPrice:${listId}:${item.id}`
  const [price, setPrice] = useState(() => {
    if (item.checked) return item.price_real || ''
    // 1. Borrador en localStorage tiene la máxima prioridad
    const cached = localStorage.getItem(storageKey)
    if (cached !== null) return cached
    // 2. Sugerencia inteligente: último precio_real pagado para este product_store
    if (item.last_price_real) return String(item.last_price_real)
    // 3. Fallback: lo que venga del backend (suele ser 0)
    return item.price_real || ''
  })
  const updatePrice = (val) => {
    setPrice(val)
    if (val === '' || val === null) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, val)
    }
  }
  const [loading, setLoading] = useState(false)
  const [updatingQty, setUpdatingQty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [updatingCatalog, setUpdatingCatalog] = useState(false)

  const isFree = item.is_free || !item.product_store_id
  const catalogPrice = item.price_catalog_snapshot ?? 0
  const diff = item.checked ? (catalogPrice - item.price_real) * item.quantity : 0
  const isSaving = diff > 0
  const isExpensive = diff < 0

  const handleCheck = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error('Ingresa un precio válido antes de marcar')
      return
    }
    setLoading(true)
    try {
      await onCheck(item.id, parseFloat(price))
      // Tras éxito (sin throw), el item queda confirmado en backend — limpiar borrador local
      localStorage.removeItem(storageKey)
    } finally {
      setLoading(false)
    }
  }

  // Rellena el input con el precio del catálogo (cuando el precio no cambió)
  const handleFillFromCatalog = () => {
    updatePrice(String(item.price_catalog_snapshot))
  }

  // Actualiza el precio de referencia del catálogo con el precio ingresado
  const handleUpdateCatalogPrice = async () => {
    const newPrice = parseFloat(price)
    if (!newPrice || newPrice <= 0) return
    setUpdatingCatalog(true)
    try {
      await api.patch(`/stores/product-store/${item.product_store_id}/`, { price_catalog: newPrice })
      apiCache.invalidate('/products/')
      toast.success('Precio de referencia actualizado')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo actualizar el precio')
    } finally {
      setUpdatingCatalog(false)
    }
  }

  return (
    <tr className={`border-b border-dark-800 transition-colors ${item.checked ? 'bg-dark-900/30' : 'hover:bg-dark-800/40'}`}>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCheck}
            disabled={isDisabled || item.checked || loading}
            className={`flex-shrink-0 transition-transform active:scale-90 ${item.checked ? 'text-emerald-500' : 'text-dark-600 hover:text-primary-500'}`}
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : item.checked ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <Circle className="w-6 h-6" />
            )}
          </button>
          <div className="min-w-0">
            <p className={`text-sm font-medium transition-all ${item.checked ? 'text-dark-500 line-through' : 'text-dark-100'}`}>
              {item.product_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {isFree ? (
                <span className="text-[10px] bg-primary-600/15 text-primary-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Libre
                </span>
              ) : (
                <>
                  <Store className="w-3 h-3 text-dark-500" />
                  <span className="text-xs text-dark-500">{item.store_name}</span>
                </>
              )}
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  disabled={isDisabled || item.checked || updatingQty || item.quantity <= 1}
                  className="w-5 h-5 rounded bg-dark-800 text-dark-400 hover:text-primary-600 hover:bg-dark-700 transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[10px] bg-dark-800 text-dark-100 px-1.5 py-0.5 rounded font-bold min-w-[20px] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  disabled={isDisabled || item.checked || updatingQty}
                  className="w-5 h-5 rounded bg-dark-800 text-dark-400 hover:text-primary-600 hover:bg-dark-700 transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-right hidden sm:table-cell">
        <p className="text-xs text-dark-500 font-bold uppercase tracking-wider mb-1">Catálogo</p>
        {item.price_catalog_snapshot != null ? (
          <>
            <p className="text-sm text-dark-300">${catalogPrice.toLocaleString('es-CO')}</p>
            <p className="text-[10px] text-dark-600 mt-1 font-medium">
              Subtotal: ${(catalogPrice * item.quantity).toLocaleString('es-CO')}
            </p>
          </>
        ) : (
          <p className="text-sm text-dark-600">—</p>
        )}
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col items-end">
          <label className="text-[10px] text-dark-500 uppercase font-bold mb-1">Precio Real</label>
          <div className="relative max-w-[100px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => updatePrice(e.target.value)}
              onFocus={(e) => e.target.select()}
              disabled={isDisabled || item.checked}
              placeholder="0"
              className="input pl-5 py-1.5 text-right text-sm"
            />
          </div>
          {price > 0 && (
            <div className={`mt-1 text-[10px] font-bold ${item.checked ? 'text-dark-500' : 'text-primary-600'}`}>
              Subtotal: ${(parseFloat(price) * item.quantity).toLocaleString('es-CO')}
            </div>
          )}
          {/* Acciones rápidas de precio — solo cuando el ítem no está marcado */}
          {!item.checked && !isDisabled && (
            <div className="flex gap-1 mt-1.5 flex-wrap justify-end">
              {!isFree && item.price_catalog_snapshot != null && (
                <button
                  onClick={handleFillFromCatalog}
                  title="Usar el precio del catálogo como precio real"
                  className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 hover:text-primary-600 hover:bg-primary-600/10 transition-colors"
                >
                  <Tag className="w-2.5 h-2.5" />
                  = Catálogo
                </button>
              )}
              {!isFree && price > 0 && parseFloat(price) !== item.price_catalog_snapshot && (
                <button
                  onClick={handleUpdateCatalogPrice}
                  disabled={updatingCatalog}
                  title="Guardar este precio como nuevo precio de referencia del producto"
                  className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 hover:text-amber-600 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                >
                  {updatingCatalog
                    ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    : <RefreshCw className="w-2.5 h-2.5" />}
                  Act. catálogo
                </button>
              )}
              {isFree && (
                <button
                  onClick={() => onPromoteToProduct?.(item.product_name)}
                  title="Guardar este producto en el catálogo"
                  className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-dark-400 hover:text-primary-600 hover:bg-primary-600/10 transition-colors"
                >
                  <BookmarkPlus className="w-2.5 h-2.5" />
                  Guardar como producto
                </button>
              )}
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        {item.checked ? (
          <div className="flex flex-col items-end">
            <p className="text-[10px] text-dark-500 uppercase font-bold mb-0.5">Ahorro</p>
            <div className={`flex items-center gap-1 text-sm font-bold ${isSaving ? 'text-emerald-600' : isExpensive ? 'text-red-600' : 'text-dark-400'}`}>
              {isSaving ? <TrendingDown className="w-3 h-3" /> : isExpensive ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              ${Math.abs(diff).toLocaleString('es-CO')}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs text-dark-600 font-medium italic">Pendiente</span>
            {!isDisabled && (
              showConfirm ? (
                <div className="flex items-center gap-1">
                  <button 
                    onClick={async () => {
                      setDeleting(true)
                      await onDelete(item.id)
                      setDeleting(false)
                      setShowConfirm(false)
                    }}
                    title="Confirmar eliminación" 
                    className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    disabled={deleting}
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setShowConfirm(false)}
                    title="Cancelar" 
                    className="p-1.5 text-dark-400 hover:text-dark-200 hover:bg-dark-800 rounded transition-colors"
                    disabled={deleting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="p-1.5 text-dark-500 hover:text-red-600 hover:bg-red-500/10 rounded transition-colors"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

export default function ListDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCompareModal, setShowCompareModal] = useState(false)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [updatingName, setUpdatingName] = useState(false)
  
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [updatingDate, setUpdatingDate] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStore, setSelectedStore] = useState('all')
  const [groupByCategory, setGroupByCategory] = useState(false)

  // Modal para guardar producto libre como producto en BD
  const [productModalInitial, setProductModalInitial] = useState(null) // string | null
  const [stores, setStores] = useState([])

  useEffect(() => {
    fetchList()
  }, [id])

  useEffect(() => {
    // Cargar stores con cache para el ProductModal
    const cached = apiCache.get('/stores/')
    if (cached) { setStores(cached.filter(s => !s.is_deleted)); return }
    api.get('/stores/').then(({ data }) => {
      const valid = Array.isArray(data) ? data.filter(s => !s.is_deleted) : []
      apiCache.set('/stores/', data)
      setStores(valid)
    }).catch(() => {})
  }, [])

  // Refrescar la lista cuando la cola offline termina de drenar:
  // si alguna mutación se descartó o si se aplicaron varias, los datos del
  // backend pueden divergir del estado optimista local.
  useEffect(() => {
    const onDrained = (e) => {
      const { processed = 0, discarded = 0 } = e.detail || {}
      if (processed > 0 || discarded > 0) {
        fetchList()
      }
    }
    window.addEventListener('cy-queue-drained', onDrained)
    return () => window.removeEventListener('cy-queue-drained', onDrained)
  }, [])

  // Desglose por tienda — agrupa items por store_name, suma estimado y pagado.
  // Items libres (store_name=null) caen en "Sin tienda".
  // IMPORTANTE: este useMemo debe estar antes de cualquier return condicional
  // para no romper la regla de hooks (mismo orden en cada render).
  const storeBreakdown = useMemo(() => {
    const items = list?.items || []
    const map = new Map()
    for (const it of items) {
      const key = it.store_name || 'Sin tienda'
      const isFree = !it.store_name
      const bucket = map.get(key) || { storeName: key, isFree, count: 0, checkedCount: 0, estimated: 0, paid: 0 }
      bucket.count += 1
      bucket.estimated += (it.price_catalog_snapshot || 0) * it.quantity
      if (it.checked) {
        bucket.checkedCount += 1
        bucket.paid += (it.price_real || 0) * it.quantity
      }
      map.set(key, bucket)
    }
    return [...map.values()].sort((a, b) => {
      if (a.isFree) return 1
      if (b.isFree) return -1
      return b.estimated - a.estimated
    })
  }, [list?.items])

  const fetchList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/lists/${id}/`)
      // El backend no garantiza el orden, así que ordenamos por tienda en el frontend.
      // Items libres (store_name === null) van al final.
      if (data.items) {
        data.items.sort((a, b) =>
          (a.store_name || 'zzz_libre').localeCompare(b.store_name || 'zzz_libre')
        )
      }
      setList(data)
      setNewName(data.name)
      if (data.date) {
        setNewDate(data.date.split('T')[0])
      }
    } catch (err) {
      toast.error('No se pudo cargar la lista')
      navigate('/lists')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckItem = async (itemId, priceReal) => {
    // Snapshot previo para rollback en caso de error real (no offline)
    const prevItem = list.items.find(i => i.id === itemId)
    // Optimistic update
    setList(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, checked: true, price_real: priceReal } : i
      ),
    }))
    try {
      const res = await api.patch(`/lists/items/${itemId}/check/`, {
        price_real: priceReal,
        checked: true,
      })
      if (res?.data?._queued) {
        toast.success('Marcado offline — se sincronizará al volver la conexión', { icon: '📥' })
      } else {
        toast.success('¡Producto comprado!')
        fetchList() // Recargar para ver totals + cambios del backend
      }
    } catch (err) {
      // Rollback solo si fue error con response (4xx/5xx real)
      if (prevItem) {
        setList(prev => ({
          ...prev,
          items: prev.items.map(i => (i.id === itemId ? prevItem : i)),
        }))
      }
      const msg = err.response?.data?.detail || 'Error al actualizar ítem'
      toast.error(msg)
      throw err  // re-lanzar para que ItemRow no limpie el borrador local
    }
  }

  const handleDeleteItem = async (itemId) => {
    const prevItem = list.items.find(i => i.id === itemId)
    // Optimistic remove
    setList(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }))
    try {
      const res = await api.delete(`/lists/items/${itemId}/`)
      localStorage.removeItem(`pendingPrice:${id}:${itemId}`)
      if (res?.data?._queued) {
        toast.success('Eliminación pendiente — se aplicará al volver la conexión', { icon: '📥' })
      } else {
        toast.success('Producto eliminado de la lista')
        fetchList()
      }
    } catch (err) {
      // Rollback
      if (prevItem) {
        setList(prev => ({
          ...prev,
          items: [...prev.items, prevItem].sort((a, b) =>
            (a.store_name || 'zzz_libre').localeCompare(b.store_name || 'zzz_libre')
          ),
        }))
      }
      toast.error(err.response?.data?.detail || 'Error al eliminar ítem')
    }
  }

  const handleUpdateQuantity = async (itemId, delta) => {
    const item = list.items.find(i => i.id === itemId)
    if (!item) return

    const newQty = Math.max(1, item.quantity + delta)
    if (newQty === item.quantity) return

    // Optimistic update (igual que antes, pero ANTES del await)
    setList(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i),
    }))
    try {
      const res = await api.patch(`/lists/items/${itemId}/`, { quantity: newQty })
      if (res?.data?._queued) {
        toast.success('Cantidad guardada offline', { icon: '📥', duration: 2000 })
      }
    } catch (err) {
      // Rollback cantidad
      setList(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, quantity: item.quantity } : i),
      }))
      toast.error('No se pudo actualizar la cantidad')
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await api.post(`/lists/${id}/complete/`)
      toast.success('¡Compra finalizada con éxito!', {
        icon: '🚀',
        duration: 5000
      })
      setShowConfirm(false)
      fetchList()
    } catch (err) {
      console.error("Error al finalizar lista:", err)
      const msg = err.response?.data?.detail || 'No se pudo finalizar la compra. Verifica tu conexión.'
      toast.error(msg)
    } finally {
      setCompleting(false)
    }
  }

   const handleUpdateName = async () => {
    if (!newName.trim() || newName === list.name) {
      setIsEditingName(false)
      setNewName(list.name)
      return
    }

    setUpdatingName(true)
    try {
      await api.patch(`/lists/${id}/`, { name: newName.trim() })
      toast.success('Nombre de la lista actualizado')
      setList(prev => ({ ...prev, name: newName.trim() }))
      setIsEditingName(false)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al actualizar el nombre'
      toast.error(msg)
    } finally {
      setUpdatingName(false)
    }
  }

  const handleUpdateDate = async () => {
    if (!newDate || newDate === list.date.split('T')[0]) {
      setIsEditingDate(false)
      return
    }

    setUpdatingDate(true)
    try {
      await api.patch(`/lists/${id}/`, { date: newDate })
      toast.success('Fecha de la lista actualizada')
      setList(prev => ({ ...prev, date: newDate }))
      setIsEditingDate(false)
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al actualizar la fecha'
      toast.error(msg)
    } finally {
      setUpdatingDate(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const response = await api.get(`/lists/${id}/export/`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const fileName = `lista_${list.date.split('T')[0]}.pdf`

      // Intentar usar la API de File System Access para "Guardar como"
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Documento PDF',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success('Archivo guardado con éxito')
        } catch (err) {
          // Si el usuario cancela el diálogo, no hacemos nada
          if (err.name !== 'AbortError') throw err
        }
      } else {
        // Fallback tradicional para navegadores que no soportan showSaveFilePicker
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        toast.success('Descarga iniciada')
      }
    } catch (err) {
      console.error('Error al exportar:', err)
      toast.error('Error al generar el PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setExportingExcel(true)
    try {
      const response = await api.get(`/lists/${id}/export-excel/`, {
        responseType: 'blob'
      })
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const fileName = `lista_${list.date.split('T')[0]}.xlsx`

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'Libro de Excel',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
            }],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          toast.success('Excel guardado con éxito')
        } catch (err) {
          if (err.name !== 'AbortError') throw err
        }
      } else {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        toast.success('Descarga de Excel iniciada')
      }
    } catch (err) {
      console.error('Error al exportar Excel:', err)
      toast.error('Error al generar el Excel')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleShareWhatsApp = () => {
    if (!list) return

    const formattedDate = new Date(list.date).toLocaleDateString('es-CO', { 
      day: '2-digit', 
      month: 'long' 
    })

    let message = `🛒 *Lista de Compras: ${list.name}*\n`
    message += `📅 Fecha: ${formattedDate}\n\n`
    
    // Agrupar por tienda para el mensaje. Items libres → "Sin tienda".
    const itemsByStore = list.items.reduce((acc, item) => {
      const key = item.store_name || 'Sin tienda'
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

    Object.entries(itemsByStore).forEach(([store, items]) => {
      message += `🏪 *${store.toUpperCase()}*\n`
      items.forEach(item => {
        const checkbox = item.checked ? '✅' : '⬜'
        message += `${checkbox} ${item.quantity}x ${item.product_name}\n`
      })
      message += `\n`
    })

    const totalE = list.items.reduce((acc, curr) => acc + ((curr.price_catalog_snapshot || 0) * curr.quantity), 0)
    const totalR = list.items.reduce((acc, curr) => curr.checked ? acc + (curr.price_real * curr.quantity) : acc, 0)

    message += `💰 *Total Estimado:* $${totalE.toLocaleString('es-CO')}\n`
    if (totalR > 0) {
      message += `💸 *Total Pagado:* $${totalR.toLocaleString('es-CO')}\n`
    }
    
    message += `\n_Enviado desde CompraYa_ 🚀`

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedMessage}`
    
    // Usar un enlace temporal para asegurar la máxima compatibilidad de codificación
    const link = document.createElement('a')
    link.href = whatsappUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-dark-400 animate-pulse font-medium">Cargando detalles de la compra...</p>
      </div>
    )
  }

  // Si la carga falló (CORS, red, 5xx) el catch de fetchList navega fuera pero
  // el componente puede intentar renderizar antes — guardamos contra null.
  if (!list || !list.items) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <p className="text-dark-300 font-medium">No se pudo cargar la lista.</p>
        <button onClick={() => navigate('/lists')} className="btn-secondary text-sm">
          Volver a listas
        </button>
      </div>
    )
  }

  const itemsBought = list.items.filter(i => i.checked).length
  const totalItems = list.items.length
  const progress = (itemsBought / totalItems) * 100
  
  const totalProjected = list.items.reduce((acc, curr) => {
    return acc + ((curr.price_catalog_snapshot || 0) * curr.quantity)
  }, 0)

  const totalReal = list.items.reduce((acc, curr) => {
    if (!curr.checked) return acc
    return acc + (curr.price_real * curr.quantity)
  }, 0)

  const totalSaved = list.items.reduce((acc, curr) => {
    if (!curr.checked) return acc
    return acc + (((curr.price_catalog_snapshot || 0) - curr.price_real) * curr.quantity)
  }, 0)

  const isCompleted = list.status === 'completed'

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {showAddModal && (
        <AddItemsModal
          listId={id}
          existingItems={list.items}
          onClose={() => setShowAddModal(false)}
          onAdded={fetchList}
        />
      )}

      {showCompareModal && (
        <StoreComparisonModal
          listId={id}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {productModalInitial !== null && (
        <ProductModal
          product={null}
          initialName={productModalInitial}
          stores={stores}
          onClose={() => setProductModalInitial(null)}
          onSaved={() => { apiCache.invalidate('/products/'); setProductModalInitial(null) }}
        />
      )}

      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/lists')}
          className="btn-ghost w-fit -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a listas
        </button>

        <div className="flex items-center gap-2 self-center sm:self-auto">
          {/* Dropdown compartir/exportar */}
          <div className="relative">
            <div className="flex">
              <button
                onClick={handleShareWhatsApp}
                className="btn-secondary flex items-center gap-2 rounded-r-none border-r-0 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
              <button
                onClick={() => setShowExportMenu(v => !v)}
                className="btn-secondary px-2 rounded-l-none border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-600"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1 z-20 bg-dark-900 border border-dark-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => { handleShareWhatsApp(); setShowExportMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => { handleExportPDF(); setShowExportMenu(false) }}
                    disabled={exporting}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors disabled:opacity-50"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-500" />}
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => { handleExportExcel(); setShowExportMenu(false) }}
                    disabled={exportingExcel}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors disabled:opacity-50"
                  >
                    {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-500" />}
                    Descargar Excel
                  </button>
                </div>
              </>
            )}
          </div>
          {!isCompleted && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="btn-secondary flex items-center gap-2"
              title="Comparar tiendas para esta lista"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Comparar</span>
            </button>
          )}
          {!isCompleted && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
              title="Agregar productos a la lista"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Agregar</span>
            </button>
          )}
          {!isCompleted && (
            <div className="relative">
              {showConfirm ? (
                <div className="flex items-center gap-2 bg-dark-800/80 border border-dark-700 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="text-xs text-dark-400 mr-1">¿Finalizar?</span>
                  <button
                    onClick={() => setShowConfirm(false)}
                    title="Cancelar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    title="Confirmar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                  >
                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={completing || itemsBought === 0}
                  title={itemsBought === 0 ? 'Debes marcar al menos un producto antes de finalizar' : ''}
                  className="btn-primary"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Finalizar Compra
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header Card */}
      <div className="card overflow-hidden relative">
        {/* Progress Bar Background */}
        <div className="absolute top-0 left-0 h-1 bg-primary-600/20 w-full" />
        <div 
          className="absolute top-0 left-0 h-1 bg-primary-500 transition-all duration-700 shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
          style={{ width: `${progress}%` }} 
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary-600/10 text-primary-600'}`}>
              {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <ShoppingCart className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              {!isCompleted && isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input py-1 px-2 text-lg font-bold w-full bg-dark-900 border-primary-500/50 focus:border-primary-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName()
                      if (e.key === 'Escape') {
                        setIsEditingName(false)
                        setNewName(list.name)
                      }
                    }}
                  />
                  <button 
                    onClick={handleUpdateName} 
                    disabled={updatingName}
                    className="btn-primary-sm shrink-0 px-2.5 py-1.5"
                  >
                    {updatingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditingName(false)
                      setNewName(list.name)
                    }}
                    disabled={updatingName}
                    className="btn-ghost shrink-0 p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-dark-200 leading-tight">{list.name}</h1>
                  {!isCompleted && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-dark-500 hover:text-primary-600 transition-colors p-1"
                      title="Editar nombre"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
               <div className="flex items-center gap-3 mt-1.5">
                <span className={`badge-purple ${isCompleted ? 'badge-green' : 'badge-yellow'}`}>
                  {isCompleted ? 'Completada' : 'En curso'}
                </span>
                
                {!isCompleted && isEditingDate ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="input py-0.5 px-2 text-[10px] w-auto bg-dark-900 border-primary-500/50 focus:border-primary-500 text-dark-200 h-7"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateDate()
                        if (e.key === 'Escape') setIsEditingDate(false)
                      }}
                    />
                    <button 
                      onClick={handleUpdateDate} 
                      disabled={updatingDate}
                      className="text-primary-600 hover:text-primary-700 transition-colors"
                    >
                       {updatingDate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => setIsEditingDate(false)}
                      className="text-dark-500 hover:text-dark-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-dark-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-700" />
                    {new Date(list.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })}
                    {!isCompleted && (
                      <button 
                        onClick={() => setIsEditingDate(true)} 
                        className="ml-1 text-dark-500 hover:text-primary-600 transition-colors p-1"
                        title="Editar fecha"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:flex md:items-center md:gap-8 border-t border-dark-800 md:border-0 pt-4 md:pt-0">
            <div className="text-center md:text-right">
              <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Progreso</p>
              <p className="text-lg font-bold text-dark-200">{itemsBought} / {totalItems}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Valor Estimado</p>
              <p className="text-lg font-bold text-primary-600/50">${totalProjected.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-0.5">Total Pagado</p>
              <p className="text-lg font-bold text-emerald-600 font-mono tracking-tight">${totalReal.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-center md:text-right">
               <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Ahorro Total</p>
               <p className={`text-lg font-bold ${totalSaved >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                 ${totalSaved.toLocaleString('es-CO')}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for completed list */}
      {isCompleted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-dark-200">¡Compra Finalizada!</p>
            <p className="text-xs text-emerald-600/80 mt-0.5">Los precios reales han sido registrados en tu historial para futuras sugerencias.</p>
          </div>
        </div>
      )}

      {/* Desglose por tienda — útil para saber cuánto vas a gastar en cada lugar */}
      {storeBreakdown.length > 1 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-dark-800 bg-dark-950/50 flex items-center justify-between">
            <p className="text-xs font-bold text-dark-400 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-3.5 h-3.5 text-primary-600" />
              Desglose por tienda
            </p>
            <span className="text-[10px] text-dark-500">{storeBreakdown.length} tiendas</span>
          </div>
          <div className="divide-y divide-dark-800/60">
            {storeBreakdown.map((s) => (
              <div key={s.storeName} className="flex items-center justify-between px-4 py-2.5 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    s.isFree ? 'bg-primary-500/10' : 'bg-amber-500/10'
                  }`}>
                    {s.isFree
                      ? <Tag className="w-3.5 h-3.5 text-primary-500" />
                      : <Store className="w-3.5 h-3.5 text-amber-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark-100 truncate">{s.storeName}</p>
                    <p className="text-[10px] text-dark-500">
                      {s.checkedCount > 0 ? `${s.checkedCount}/${s.count}` : `${s.count}`} item{s.count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold font-mono text-dark-200">
                    ${s.estimated.toLocaleString('es-CO')}
                  </p>
                  {s.paid > 0 && (
                    <p className="text-[10px] font-mono text-emerald-600">
                      Pagado: ${s.paid.toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search Bar */}
        <div className="relative group flex-1 w-full sm:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-dark-500 group-focus-within:text-primary-600 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder="Buscar por producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-11 py-3 bg-dark-900 border-dark-800 focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/5 w-full"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3 flex items-center text-dark-500 hover:text-dark-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Store Filter */}
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-dark-500">
            <Store className="w-5 h-5" />
          </div>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="input pl-11 py-3 bg-dark-900 border-dark-800 focus:border-primary-500/50 focus:ring-4 focus:ring-primary-500/5 w-full appearance-none pr-10"
          >
            <option value="all">Todas las tiendas</option>
            {Array.from(new Set(list.items.filter(i => i.store_name).map(i => i.store_name))).sort().map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-dark-500">
            <Filter className="w-4 h-4" />
          </div>
        </div>

        {/* Toggle agrupar por categoría */}
        <button
          onClick={() => setGroupByCategory(v => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            groupByCategory
              ? 'bg-primary-600/15 text-primary-500 border border-primary-500/30'
              : 'bg-dark-900 text-dark-400 border border-dark-800 hover:text-dark-200 hover:border-dark-700'
          }`}
          title="Agrupar items por categoría (pasillos)"
        >
          <Tag className="w-4 h-4" />
          <span className="hidden sm:inline">{groupByCategory ? 'Agrupado' : 'Agrupar'}</span>
        </button>
      </div>

      {/* Items Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-dark-950/50 border-b border-dark-800">
               <tr>
                 <th className="px-4 py-3 text-xs font-bold text-dark-500 uppercase tracking-wider">Producto / Tienda</th>
                 <th className="px-4 py-3 text-xs font-bold text-dark-500 uppercase tracking-wider text-right hidden sm:table-cell">Referencia</th>
                 <th className="px-4 py-3 text-xs font-bold text-dark-500 uppercase tracking-wider text-right">Monto Pagado</th>
                 <th className="px-4 py-3 text-xs font-bold text-dark-500 uppercase tracking-wider text-right">Detalle</th>
               </tr>
             </thead>
             <tbody>
               {list.items.length === 0 ? (
                 <tr>
                   <td colSpan={4} className="px-4 py-12 text-center">
                     <AlertCircle className="w-8 h-8 text-dark-700 mx-auto mb-2" />
                     <p className="text-dark-500 text-sm">Esta lista no tiene productos registrados.</p>
                   </td>
                 </tr>
               ) : (
                 (() => {
                   const filteredItems = list.items.filter(item => {
                     const matchesSearch = item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         item.store_name.toLowerCase().includes(searchTerm.toLowerCase());
                     const matchesStore = selectedStore === 'all' || item.store_name === selectedStore;
                     return matchesSearch && matchesStore;
                   });
                   
                   if (filteredItems.length === 0) {
                     return (
                       <tr>
                         <td colSpan={4} className="px-4 py-12 text-center">
                           <div className="flex flex-col items-center justify-center space-y-2">
                             {selectedStore !== 'all' ? <Store className="w-8 h-8 text-dark-700" /> : <Search className="w-8 h-8 text-dark-700" />}
                             <p className="text-dark-500 text-sm italic">
                               No se encontraron productos {selectedStore !== 'all' ? `en "${selectedStore}"` : ''} 
                               {searchTerm ? ` que coincidan con "${searchTerm}"` : ''}
                             </p>
                             {(searchTerm || selectedStore !== 'all') && (
                               <button 
                                 onClick={() => { setSearchTerm(''); setSelectedStore('all'); }}
                                 className="text-xs text-primary-600 hover:text-primary-700 underline font-medium pt-2"
                               >
                                 Limpiar todos los filtros
                               </button>
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                   }

                   if (!groupByCategory) {
                     return filteredItems.map(item => (
                       <ItemRow
                         key={item.id}
                         item={item}
                         listId={id}
                         onCheck={handleCheckItem}
                         onDelete={handleDeleteItem}
                         onUpdateQuantity={handleUpdateQuantity}
                         onPromoteToProduct={(name) => setProductModalInitial(name)}
                         isDisabled={isCompleted}
                       />
                     ));
                   }

                   // Agrupar por categoría — items sin categoría van al final
                   const buckets = new Map()
                   filteredItems.forEach(item => {
                     const key = item.category || 'Sin categoría'
                     if (!buckets.has(key)) buckets.set(key, [])
                     buckets.get(key).push(item)
                   })
                   const sortedCategories = [...buckets.keys()].sort((a, b) => {
                     if (a === 'Sin categoría') return 1
                     if (b === 'Sin categoría') return -1
                     return a.localeCompare(b)
                   })

                   return sortedCategories.flatMap(cat => [
                     <tr key={`hdr-${cat}`} className="bg-dark-950/70 border-b border-dark-800">
                       <td colSpan={4} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-500 flex items-center gap-1.5">
                         <Tag className="w-3 h-3" />
                         {cat}
                         <span className="ml-1 text-dark-500 font-normal normal-case">· {buckets.get(cat).length}</span>
                       </td>
                     </tr>,
                     ...buckets.get(cat).map(item => (
                       <ItemRow
                         key={item.id}
                         item={item}
                         listId={id}
                         onCheck={handleCheckItem}
                         onDelete={handleDeleteItem}
                         onUpdateQuantity={handleUpdateQuantity}
                         onPromoteToProduct={(name) => setProductModalInitial(name)}
                         isDisabled={isCompleted}
                       />
                     )),
                   ]);
                 })()
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
