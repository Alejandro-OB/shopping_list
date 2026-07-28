import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Search, Loader2, Package, Store,
  CalendarDays, ShoppingCart, Check, AlertCircle, Plus, PlusCircle,
  Pencil, Trash2, X, Link2,
} from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import toast from 'react-hot-toast'
import ProductModal from '../components/ProductModal'

const FREQ_LABELS = {
  weekly:     { label: 'Semanal',   cls: 'badge-purple' },
  biweekly:   { label: 'Quincenal', cls: 'badge-blue'   },
  monthly:    { label: 'Mensual',   cls: 'badge-green'  },
  occasional: { label: 'Ocasional', cls: 'badge-yellow' },
}

/** Semana ISO: lunes de la semana que contiene `date` */
function getWeekStart(date) {
  const d = new Date(date)
  const iso = d.getDay() === 0 ? 7 : d.getDay() // 1=lun…7=dom
  d.setDate(d.getDate() - (iso - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Devuelve el próximo martes que caiga en una semana sin lista existente.
 * Itera semana a semana hasta encontrar una libre.
 */
function getNextAvailableTuesday(existingLists) {
  const occupiedWeeks = new Set(
    existingLists.map(l => getWeekStart(new Date(l.date)).toISOString())
  )
  let candidate = new Date()
  candidate.setHours(0, 0, 0, 0)
  while (candidate.getDay() !== 2) candidate.setDate(candidate.getDate() + 1)
  while (occupiedWeeks.has(getWeekStart(candidate).toISOString()))
    candidate.setDate(candidate.getDate() + 7)
  return candidate
}

// Mismo template de columnas para el header (hidden sm:grid) y cada CatalogRow.
const CATALOG_GRID_COLS = 'sm:grid-cols-[minmax(0,1fr)_140px_140px_100px]'

// ── Fila: selección para lista + acciones CRUD ───────────────────────────────
function CatalogRow({ row, productObj, isChecked, quantity, onToggle, onQuantityChange, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const freq = FREQ_LABELS[row.frequency] ?? { label: row.frequency, cls: 'badge-purple' }

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete(row.product_id) }
    finally { setDeleting(false); setConfirmDelete(false) }
  }

  const unlinked = row.unlinked

  return (
    <div
      onClick={() => (unlinked ? onEdit(productObj) : onToggle(row.ps_id))}
      className={`grid grid-cols-1 ${CATALOG_GRID_COLS} sm:items-center gap-y-2 sm:gap-y-0 px-4 py-3 border-b border-dark-800 cursor-pointer transition-colors group
        ${unlinked ? 'opacity-70' : ''}
        ${isChecked ? 'bg-primary-600/10 hover:bg-primary-600/15' : 'hover:bg-dark-800/50'}`}
    >
      {/* Grupo 1: checkbox + tienda + producto (+ precio/frecuencia inline en mobile) */}
      <div className="flex items-center gap-3">
        {unlinked ? (
          <div className="tap-target -m-2.5 flex-shrink-0" title="Vincula una tienda para poder agregarlo a una lista">
            <div className="w-5 h-5 rounded border-2 border-dark-700 flex items-center justify-center">
              <AlertCircle className="w-3 h-3 text-fuchsia-600" />
            </div>
          </div>
        ) : (
          <div className="tap-target -m-2.5 flex-shrink-0">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
              ${isChecked ? 'bg-primary-600 border-primary-600' : 'border-dark-600'}`}>
              {isChecked && <Check className="w-3 h-3 text-white" />}
            </div>
          </div>
        )}
        <div className="w-7 h-7 rounded-md bg-primary-600/10 flex items-center justify-center flex-shrink-0">
          <Package className="w-3.5 h-3.5 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dark-100 truncate">{row.product}</p>
          {unlinked ? (
            <button
              onClick={e => { e.stopPropagation(); onEdit(productObj) }}
              className="flex items-center gap-1.5 text-xs text-fuchsia-500 hover:text-fuchsia-400 transition-colors mt-0.5"
            >
              <Link2 className="w-3.5 h-3.5" /> Vincular tienda
            </button>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Store className="w-3 h-3 text-dark-400" />
              <span className="text-xs text-dark-400">{row.store}</span>
            </div>
          )}
          {/* Precio + frecuencia — solo mobile (desktop los muestra en columnas separadas) */}
          <div className="sm:hidden flex items-center gap-2 mt-1">
            <span className="text-xs font-mono text-dark-300">
              {unlinked ? '—' : `$${row.price.toLocaleString('es-CO')}`}
            </span>
            <span className={freq.cls}>{freq.label}</span>
          </div>
        </div>
      </div>

      {/* Grupo 2: Precio + Frecuencia — solo desde sm: */}
      <div className="hidden sm:flex flex-col items-end gap-1">
        <span className="text-sm font-mono text-dark-200">
          {unlinked ? '—' : `$${row.price.toLocaleString('es-CO')}`}
        </span>
        <span className={freq.cls}>{freq.label}</span>
      </div>

      {/* Grupo 3: Cantidad */}
      <div onClick={e => e.stopPropagation()} className="flex sm:justify-center">
        {!unlinked && (
          <div className={`flex items-center gap-2 transition-opacity
            ${isChecked ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <button
              onClick={() => onQuantityChange(row.ps_id, -1)}
              className="tap-target rounded-lg border border-dark-700 hover:bg-dark-800 transition-colors text-dark-300"
            >
              <Plus className="w-3.5 h-3.5 rotate-45" />
            </button>
            <span className="w-6 text-center text-sm font-bold text-dark-200">{quantity}</span>
            <button
              onClick={() => onQuantityChange(row.ps_id, 1)}
              className="tap-target rounded-lg border border-dark-700 hover:bg-dark-800 transition-colors text-dark-300"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Grupo 4: Acciones CRUD */}
      <div onClick={e => e.stopPropagation()} className="flex items-center justify-end gap-1">
        {!confirmDelete && (
          <button
            onClick={() => onEdit(productObj)}
            className="tap-target btn-ghost"
            title="Editar producto"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={handleDelete} disabled={deleting} className="tap-target btn-ghost text-red-600 hover:text-red-600">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="tap-target btn-ghost">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="tap-target btn-ghost hover:text-red-600" title="Eliminar producto">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────────────────────
export default function Catalog() {
  const navigate = useNavigate()

  const [rows, setRows]               = useState([])
  const [productsRaw, setProductsRaw] = useState([])
  const [stores, setStores]           = useState([])
  const [loading, setLoading]         = useState(true)

  const [search, setSearch]           = useState('')
  const [freqFilter, setFreqFilter]   = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')

  const [selected, setSelected]       = useState(new Map()) // ps_id -> quantity
  const [creating, setCreating]       = useState(false)
  const [adding, setAdding]           = useState(false)
  const [activeList, setActiveList]   = useState(null)
  const [nextTuesday, setNextTuesday] = useState(null)

  const [modal, setModal] = useState(null) // null | 'create' | objeto-producto

  const nextTuesdayLabel = nextTuesday
    ? nextTuesday.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' })
    : '…'

  useEffect(() => { fetchData() }, [])

  const fetchData = async (force = false, { silent = false } = {}) => {
    // silent: refetch en background sin spinner. Mantiene la tabla visible
    // con los datos viejos para preservar el scroll del usuario.
    if (!silent) setLoading(true)
    try {
      const cachedProds  = !force && apiCache.get('/products/')
      const cachedStores = !force && apiCache.get('/stores/')

      const [{ data: lists }, products, storesRes] = await Promise.all([
        api.get('/lists/'),
        cachedProds
          ? Promise.resolve(cachedProds)
          : api.get('/products/?limit=1000').then(r => { apiCache.set('/products/', r.data); return r.data }),
        cachedStores
          ? Promise.resolve(cachedStores)
          : api.get('/stores/').then(r => { apiCache.set('/stores/', r.data); return r.data }),
      ])

      const active = lists.find(l => l.status === 'active' || l.status === 'draft')
      setActiveList(active ?? null)
      setNextTuesday(getNextAvailableTuesday(lists))

      const validProducts = (Array.isArray(products) ? products : []).filter(p => !p.is_deleted)
      const validStores   = (Array.isArray(storesRes) ? storesRes : []).filter(s => !s.is_deleted)

      setProductsRaw(validProducts)
      setStores(validStores)

      // Aplanar productos en filas producto×tienda. Los productos sin ninguna
      // tienda vinculada aún deben aparecer (fila "sin tienda"), para que no
      // desaparezcan silenciosamente del catálogo.
      const flat = []
      for (const p of validProducts) {
        const links = (p.product_stores ?? []).filter(ps => !ps.is_deleted)
        if (links.length === 0) {
          flat.push({
            ps_id:      null,
            product_id: p.id,
            store_id:   null,
            store:      null,
            product:    p.name,
            frequency:  p.frequency,
            price:      null,
            unlinked:   true,
          })
          continue
        }
        for (const ps of links) {
          flat.push({
            ps_id:      ps.id,
            product_id: p.id,
            store_id:   ps.store_id,
            store:      ps.store?.name ?? '—',
            product:    p.name,
            frequency:  p.frequency,
            price:      ps.price_catalog,
          })
        }
      }
      flat.sort((a, b) => (a.store ?? '').localeCompare(b.store ?? ''))
      setRows(flat)
    } catch {
      toast.error('Error al cargar el catálogo')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Lookup producto completo por id (para editar)
  const productMap = useMemo(() => new Map(productsRaw.map(p => [p.id, p])), [productsRaw])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const q = search.toLowerCase()
      const matchSearch = r.product.toLowerCase().includes(q) || (r.store ?? '').toLowerCase().includes(q)
      const matchFreq   = freqFilter === 'all' || r.frequency === freqFilter
      const matchStore  = storeFilter === 'all' || String(r.store_id) === storeFilter
      return matchSearch && matchFreq && matchStore
    })
  }, [rows, search, freqFilter, storeFilter])

  const unlinkedCount = useMemo(() => rows.filter(r => r.unlinked).length, [rows])

  const storeOptions = useMemo(() => {
    const seen = new Map()
    rows.forEach(r => { if (r.store_id != null && !seen.has(r.store_id)) seen.set(r.store_id, r.store) })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [rows])

  // ── Selección (las filas sin tienda vinculada no son seleccionables: no
  // tienen product_store_id, que es lo que requiere el backend para agregarlas
  // a una lista) ────────────────────────────────────────────────────────────
  const selectableFiltered = useMemo(() => filtered.filter(r => r.ps_id != null), [filtered])
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(r => selected.has(r.ps_id))
  const someSelected = selected.size > 0

  const toggleRow = (psId) => {
    if (psId == null) return
    setSelected(prev => {
      const next = new Map(prev)
      next.has(psId) ? next.delete(psId) : next.set(psId, 1)
      return next
    })
  }

  const updateQuantity = (psId, delta) =>
    setSelected(prev => {
      const next = new Map(prev)
      if (!next.has(psId)) return prev
      next.set(psId, Math.max(1, (next.get(psId) || 1) + delta))
      return next
    })

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Map(prev)
        selectableFiltered.forEach(r => next.delete(r.ps_id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Map(prev)
        selectableFiltered.forEach(r => { if (!next.has(r.ps_id)) next.set(r.ps_id, 1) })
        return next
      })
    }
  }

  // ── Crear lista nueva ─────────────────────────────────────────────────────
  const handleCreateList = async () => {
    if (selected.size === 0) return
    setCreating(true)
    try {
      const items = Array.from(selected.entries()).map(([ps_id, quantity]) => ({
        product_store_id: ps_id,
        quantity,
      }))
      const { data } = await api.post('/lists/', {
        name: `Lista del ${nextTuesdayLabel}`,
        date: nextTuesday.toISOString(),
        items,
      })
      toast.success(`¡Lista creada con ${selected.size} producto(s)!`)
      setSelected(new Map())
      navigate(`/lists/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la lista')
    } finally {
      setCreating(false)
    }
  }

  // ── Agregar a lista activa ────────────────────────────────────────────────
  const handleAddToActive = async () => {
    if (selected.size === 0 || !activeList) return
    setAdding(true)
    try {
      const items = Array.from(selected.entries()).map(([ps_id, quantity]) => ({
        product_store_id: ps_id,
        quantity,
      }))
      await api.post(`/lists/${activeList.id}/items/`, items)
      toast.success(`${selected.size} producto(s) agregado(s) a la lista activa`)
      setSelected(new Map())
      navigate(`/lists/${activeList.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al agregar productos')
    } finally {
      setAdding(false)
    }
  }

  // ── Eliminar producto ─────────────────────────────────────────────────────
  const handleDelete = async (productId) => {
    try {
      await api.delete(`/products/${productId}/`)
      toast.success('Producto eliminado')
      apiCache.invalidate('/products/')
      const psIdsToRemove = rows.filter(r => r.product_id === productId).map(r => r.ps_id)
      setRows(prev => prev.filter(r => r.product_id !== productId))
      setProductsRaw(prev => prev.filter(p => p.id !== productId))
      setSelected(prev => {
        const next = new Map(prev)
        psIdsToRemove.forEach(id => next.delete(id))
        return next
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar producto')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {modal !== null && (
        <ProductModal
          product={modal === 'create' ? null : modal}
          stores={stores}
          onClose={() => setModal(null)}
          onSaved={() => { setSelected(new Map()); fetchData(true, { silent: true }) }}
        />
      )}

      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-dark-200 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" />
              Catálogo de Productos
            </h1>
            <p className="text-dark-400 text-sm mt-0.5">
              {rows.length - unlinkedCount} combinación(es) producto-tienda disponibles
              {unlinkedCount > 0 && ` · ${unlinkedCount} sin tienda vinculada`}
            </p>
          </div>

          <div className="flex items-start gap-3">
            {/* Crear lista — solo si no hay lista activa y hay productos seleccionados */}
            {!activeList && someSelected && (
              <div className="flex flex-col items-end gap-1.5">
                <button
                  onClick={handleCreateList}
                  disabled={creating}
                  className="btn-secondary flex-shrink-0"
                >
                  {creating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ShoppingCart className="w-4 h-4" />
                  }
                  Crear lista ({selected.size})
                </button>
                <p className="text-xs text-dark-500 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Fecha: <span className="text-primary-600 font-medium capitalize">{nextTuesdayLabel}</span>
                </p>
              </div>
            )}

            <button onClick={() => setModal('create')} className="btn-primary flex-shrink-0">
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          </div>
        </div>

        {/* Banner: lista activa */}
        {activeList && (
          <div className="flex items-center gap-3 rounded-xl bg-teal-500/10 border border-teal-500/20 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark-200">Lista activa: <span className="text-teal-700">{activeList.name}</span></p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-dark-400">Selecciona productos del catálogo y agrégalos directamente.</p>
                <button
                  onClick={() => navigate(`/lists/${activeList.id}`)}
                  className="text-xs text-teal-600 underline underline-offset-2 hover:text-teal-500 transition-colors shrink-0"
                >
                  Ver
                </button>
              </div>
            </div>
            {someSelected && (
              <button
                onClick={handleAddToActive}
                disabled={adding}
                className="btn-secondary shrink-0 border-teal-500/30 text-teal-700 hover:bg-teal-500/10"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                Agregar ({selected.size})
              </button>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="card flex flex-col sm:flex-row gap-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar producto o tienda..."
              className="input pl-9"
            />
          </div>
          <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)} className="input w-full sm:w-44">
            <option value="all">Todas las tiendas</option>
            {storeOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} className="input w-full sm:w-44">
            <option value="all">Todas las frecuencias</option>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
            <option value="occasional">Ocasional</option>
          </select>
        </div>

        {/* Aviso sin catálogo */}
        {!loading && rows.length === 0 && (
          <div className="card flex items-start gap-4 border-fuchsia-500/20 bg-fuchsia-500/5">
            <AlertCircle className="w-5 h-5 text-fuchsia-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-dark-200">El catálogo está vacío</p>
              <p className="text-xs text-dark-400 mt-0.5">
                Crea un producto con el botón <strong>Nuevo Producto</strong> para empezar.
              </p>
            </div>
          </div>
        )}

        {/* Catálogo — grid responsive: apilado en mobile, columnas desde sm: */}
        {(loading || rows.length > 0) && (
          <div className="card p-0 overflow-hidden">
            <div className={`hidden sm:grid ${CATALOG_GRID_COLS} sm:items-center border-b border-dark-800 bg-dark-950/50`}>
              <div className="px-4 py-3 flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  disabled={selectableFiltered.length === 0}
                  className={`tap-target -m-2.5 rounded border-2 transition-all flex-shrink-0
                    ${allFilteredSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-dark-600 hover:border-primary-500'
                    }`}
                >
                  {allFilteredSelected && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                  <Package className="w-3.5 h-3.5" />Producto
                </span>
              </div>
              <span className="px-4 py-3 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider">
                Precio / Frecuencia
              </span>
              <span className="px-4 py-3 text-center text-xs font-semibold text-dark-400 uppercase tracking-wider">
                Cantidad
              </span>
              <span className="px-4 py-3" />
            </div>
            {/* Seleccionar todos — solo mobile (desktop lo tiene en el header de arriba) */}
            {!loading && filtered.length > 0 && (
              <button
                onClick={toggleAll}
                disabled={selectableFiltered.length === 0}
                className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 border-b border-dark-800 bg-dark-950/50 text-xs font-semibold text-dark-400 uppercase tracking-wider"
              >
                <span className={`tap-target -m-2.5 rounded border-2 transition-all flex-shrink-0
                  ${allFilteredSelected
                    ? 'bg-primary-600 border-primary-600'
                    : 'border-dark-600'
                  }`}>
                  {allFilteredSelected && <Check className="w-3 h-3 text-white" />}
                </span>
                Seleccionar todos
              </button>
            )}
            <div>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="px-4 py-3 border-b border-dark-800">
                    <div className="h-8 bg-dark-800 rounded animate-pulse" />
                  </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <BookOpen className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                  <p className="text-dark-500 text-sm">No se encontraron productos con esos filtros.</p>
                </div>
              ) : (
                filtered.map(row => (
                  <CatalogRow
                    key={row.ps_id ?? `unlinked-${row.product_id}`}
                    row={row}
                    productObj={productMap.get(row.product_id)}
                    isChecked={selected.has(row.ps_id)}
                    quantity={selected.get(row.ps_id) || 1}
                    onToggle={toggleRow}
                    onQuantityChange={updateQuantity}
                    onEdit={p => setModal(p)}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>

            {/* Footer con resumen */}
            {someSelected && (
              <div className="border-t border-dark-800 px-5 py-3 bg-dark-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <ShoppingCart className="w-4 h-4 text-primary-600" />
                  <span><strong className="text-dark-200">{selected.size}</strong> producto(s) seleccionado(s)</span>
                  {!activeList && (
                    <>
                      <span className="text-dark-600">·</span>
                      <CalendarDays className="w-4 h-4 text-primary-600" />
                      <span className="capitalize">{nextTuesdayLabel}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(new Map())} className="btn-ghost text-xs py-1.5">
                    Limpiar
                  </button>
                  {activeList ? (
                    <button onClick={handleAddToActive} disabled={adding} className="btn-primary text-sm py-2">
                      {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      Agregar a lista activa
                    </button>
                  ) : (
                    <button onClick={handleCreateList} disabled={creating} className="btn-primary text-sm py-2">
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      Crear Lista
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
