import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Search, Loader2, Package, Store,
  CalendarDays, ShoppingCart, Check, AlertCircle, Plus, PlusCircle
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

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

  // Empezar a buscar desde hoy inclusive hasta encontrar un martes
  while (candidate.getDay() !== 2) {
    candidate.setDate(candidate.getDate() + 1)
  }

  // Si la semana del candidato está ocupada, saltar de 7 en 7 hasta encontrar una libre
  while (occupiedWeeks.has(getWeekStart(candidate).toISOString())) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return candidate
}

export default function Catalog() {
  const navigate = useNavigate()
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [freqFilter, setFreqFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
  const [selected, setSelected]     = useState(new Map()) // ps_id -> quantity
  const [creating, setCreating]     = useState(false)
  const [adding, setAdding]         = useState(false)
  const [activeList, setActiveList] = useState(null)
  const [nextTuesday, setNextTuesday] = useState(null) // calculado tras cargar listas

  const nextTuesdayLabel = nextTuesday
    ? nextTuesday.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' })
    : '…'

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: products }, { data: lists }] = await Promise.all([
        api.get('/products/'),
        api.get('/lists/'),
      ])

      // Detectar lista activa
      const active = lists.find(l => l.status === 'active' || l.status === 'draft')
      setActiveList(active ?? null)

      // Calcular el siguiente martes disponible (saltando semanas con listas existentes)
      setNextTuesday(getNextAvailableTuesday(lists))

      // "Explotar" cada producto en filas por tienda
      const flat = []
      for (const p of products.filter(p => !p.is_deleted)) {
        for (const ps of p.product_stores.filter(ps => !ps.is_deleted)) {
          flat.push({
            ps_id:     ps.id,
            store_id:  ps.store_id,
            store:     ps.store?.name ?? '—',
            product:   p.name,
            frequency: p.frequency,
            price:     ps.price_catalog,
          })
        }
      }
      flat.sort((a, b) => a.store.localeCompare(b.store))
      setRows(flat)
    } catch {
      toast.error('Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = r.product.toLowerCase().includes(search.toLowerCase()) ||
                          r.store.toLowerCase().includes(search.toLowerCase())
      const matchFreq   = freqFilter === 'all' || r.frequency === freqFilter
      const matchStore  = storeFilter === 'all' || String(r.store_id) === storeFilter
      return matchSearch && matchFreq && matchStore
    })
  }, [rows, search, freqFilter, storeFilter])

  // Tiendas únicas para el filtro
  const storeOptions = useMemo(() => {
    const seen = new Map()
    rows.forEach(r => { if (!seen.has(r.store_id)) seen.set(r.store_id, r.store) })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [rows])

  // ── Selección ─────────────────────────────────────────────────────────────
  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.ps_id))
  const someSelected = selected.size > 0

  const toggleRow = (psId) =>
    setSelected(prev => {
      const next = new Map(prev)
      next.has(psId) ? next.delete(psId) : next.set(psId, 1)
      return next
    })

  const updateQuantity = (psId, delta) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (!next.has(psId)) return prev
      const newVal = Math.max(1, (next.get(psId) || 1) + delta)
      next.set(psId, newVal)
      return next
    })
  }

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => {
        const next = new Map(prev)
        filtered.forEach(r => next.delete(r.ps_id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Map(prev)
        filtered.forEach(r => {
          if (!next.has(r.ps_id)) next.set(r.ps_id, 1)
        })
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
        quantity
      }))
      const { data } = await api.post('/lists/', {
        name: `Lista del ${nextTuesdayLabel}`,
        date: nextTuesday.toISOString(),
        items: items,
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
        quantity
      }))
      await api.post(`/lists/${activeList.id}/items`, items)
      toast.success(`${selected.size} producto(s) agregado(s) a la lista activa`)
      setSelected(new Map())
      navigate(`/lists/${activeList.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al agregar productos')
    } finally {
      setAdding(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-400" />
            Catálogo de Productos
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {rows.length} combinación(es) producto-tienda disponibles
          </p>
        </div>

        {/* Acción crear lista — solo si no hay lista activa */}
        {!activeList && (
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={handleCreateList}
              disabled={!someSelected || creating}
              className="btn-primary flex-shrink-0"
            >
              {creating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ShoppingCart className="w-4 h-4" />
              }
              {someSelected
                ? `Crear lista (${selected.size} ítem${selected.size > 1 ? 's' : ''})`
                : 'Selecciona productos'
              }
            </button>
            {someSelected && (
              <p className="text-xs text-dark-500 flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                Fecha: <span className="text-primary-400 font-medium capitalize">{nextTuesdayLabel}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Banner: lista activa detectada */}
      {activeList && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Lista activa: <span className="text-emerald-300">{activeList.name}</span></p>
            <p className="text-xs text-dark-400 mt-0.5">Selecciona productos del catálogo y agrégalos directamente.</p>
          </div>
          {someSelected && (
            <button
              onClick={handleAddToActive}
              disabled={adding}
              className="btn-secondary shrink-0 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
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
        <div className="card flex items-start gap-4 border-amber-500/20 bg-amber-500/5">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">El catálogo está vacío</p>
            <p className="text-xs text-dark-400 mt-0.5">
              Ve a <strong>Productos</strong> y crea tus productos vinculándolos a una tienda para que aparezcan aquí.
            </p>
          </div>
        </div>
      )}

      {/* Tabla */}
      {(loading || rows.length > 0) && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-800 bg-dark-950/50">
                  {/* Checkbox cabecera */}
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      disabled={filtered.length === 0}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                        ${allFilteredSelected
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-dark-600 hover:border-primary-500'
                        }`}
                    >
                      {allFilteredSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5" />Tienda</span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Producto</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-dark-400 uppercase tracking-wider hidden sm:table-cell">
                    Precio Catálogo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider hidden md:table-cell">
                    Frecuencia
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    Cantidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-dark-800">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-8 bg-dark-800 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14 text-center">
                      <BookOpen className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                      <p className="text-dark-500 text-sm">No se encontraron productos con esos filtros.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => {
                    const isChecked = selected.has(row.ps_id)
                    const freq = FREQ_LABELS[row.frequency] ?? { label: row.frequency, cls: 'badge-purple' }
                    return (
                      <tr
                        key={row.ps_id}
                        onClick={() => toggleRow(row.ps_id)}
                        className={`border-b border-dark-800 cursor-pointer transition-colors
                          ${isChecked
                            ? 'bg-primary-600/10 hover:bg-primary-600/15'
                            : 'hover:bg-dark-800/50'
                          }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                              ${isChecked
                                ? 'bg-primary-600 border-primary-600'
                                : 'border-dark-600'
                              }`}
                          >
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </td>

                        {/* Tienda */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                              <Store className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <span className="text-sm text-dark-200">{row.store}</span>
                          </div>
                        </td>

                        {/* Producto */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-primary-600/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-3.5 h-3.5 text-primary-400" />
                            </div>
                            <span className="text-sm font-medium text-dark-100">{row.product}</span>
                          </div>
                        </td>

                        {/* Precio */}
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-sm font-mono text-dark-200">
                            ${row.price.toLocaleString('es-CO')}
                          </span>
                        </td>

                        {/* Frecuencia */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={freq.cls}>{freq.label}</span>
                        </td>

                        {/* Cantidad Selector */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className={`flex items-center justify-center gap-2 transition-opacity ${isChecked ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                            <button
                              onClick={() => updateQuantity(row.ps_id, -1)}
                              className="w-7 h-7 rounded-lg border border-dark-700 flex items-center justify-center hover:bg-dark-800 transition-colors text-dark-300"
                            >
                              <Plus className="w-3.5 h-3.5 rotate-45" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold text-white">
                              {selected.get(row.ps_id) || 1}
                            </span>
                            <button
                              onClick={() => updateQuantity(row.ps_id, 1)}
                              className="w-7 h-7 rounded-lg border border-dark-700 flex items-center justify-center hover:bg-dark-800 transition-colors text-dark-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer con resumen de selección */}
          {someSelected && (
            <div className="border-t border-dark-800 px-5 py-3 bg-dark-950/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-dark-300">
                <ShoppingCart className="w-4 h-4 text-primary-400" />
                <span><strong className="text-white">{selected.size}</strong> producto(s) seleccionado(s)</span>
                <span className="text-dark-600">·</span>
                <CalendarDays className="w-4 h-4 text-primary-400" />
                <span className="capitalize">{nextTuesdayLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Map())} className="btn-ghost text-xs py-1.5">
                  Limpiar
                </button>
                <button onClick={handleCreateList} disabled={creating} className="btn-primary text-sm py-2">
                  {creating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ShoppingCart className="w-4 h-4" />
                  }
                  Crear Lista
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
