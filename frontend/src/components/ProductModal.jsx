import { useState } from 'react'
import {
  Package, Plus, X, Check, Loader2, Store, Link2, AlertCircle, Tag, Boxes,
} from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import toast from 'react-hot-toast'

// Categorías predefinidas (orden típico de pasillos de supermercado en Colombia)
const PRODUCT_CATEGORIES = [
  'Frutas y verduras',
  'Carnes y embutidos',
  'Lácteos',
  'Panadería',
  'Granos y abarrotes',
  'Congelados',
  'Bebidas',
  'Snacks',
  'Aseo personal',
  'Aseo del hogar',
  'Mascotas',
  'Otros',
]

export default function ProductModal({ product, stores, onClose, onSaved, initialName }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    name: product?.name ?? initialName ?? '',
    category: product?.category ?? '',
    frequency: product?.frequency ?? 'weekly',
    frequency_start_date: product?.frequency_start_date
      ? new Date(product.frequency_start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })
  const [loading, setLoading] = useState(false)

  // Inventario. Se guarda aparte del resto del formulario porque su interruptor
  // decide si los campos viajan o no: con el inventario apagado, stock va nulo,
  // que es lo que el backend entiende por "de este producto no se lleva
  // cuenta", y el producto se sigue generando por calendario.
  const [tracksStock, setTracksStock] = useState(product?.stock != null)
  const [stockForm, setStockForm] = useState({
    stock: product?.stock ?? 0,
    stock_min: product?.stock_min ?? 0,
    units_per_purchase: product?.units_per_purchase ?? 1,
  })
  const handleStockChange = (e) =>
    setStockForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const [localStores, setLocalStores] = useState(stores)
  const [creatingStore, setCreatingStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [savingStore, setSavingStore] = useState(false)

  const [storeLinks, setStoreLinks] = useState(
    product?.product_stores?.filter(ps => !ps.is_deleted) ?? []
  )
  const [removedLinks, setRemovedLinks] = useState([])
  const [newLink, setNewLink] = useState({ store_id: '', price_catalog: '' })

  const handleCreateStore = async () => {
    if (!newStoreName.trim()) return
    setSavingStore(true)
    try {
      const { data } = await api.post('/stores/', { name: newStoreName.trim() })
      setLocalStores(prev => [...prev, data])
      apiCache.invalidate('/stores/')
      setNewLink(l => ({ ...l, store_id: data.id }))
      setCreatingStore(false)
      setNewStoreName('')
      toast.success(`Tienda "${data.name}" creada`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear tienda')
    } finally {
      setSavingStore(false)
    }
  }

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Construye un link a partir de los campos sueltos de "Tienda..."/"Precio $".
  // Se usa tanto al presionar "+" como como red de seguridad al enviar el
  // formulario (ver handleSubmit).
  const buildLinkFromInput = (store_id, price_catalog) => {
    if (!store_id || !price_catalog || parseFloat(price_catalog) < 0) return null
    const storeObj = localStores.find(s => s.id === parseInt(store_id))
    return {
      store_id: parseInt(store_id),
      store: { name: storeObj?.name },
      price_catalog: parseFloat(price_catalog),
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Red de seguridad: si el usuario seleccionó tienda/precio pero olvidó
      // presionar "+", no lo perdemos silenciosamente — lo agregamos aquí, o
      // avisamos si quedó a medio llenar.
      let finalStoreLinks = storeLinks
      if (newLink.store_id || newLink.price_catalog) {
        const pending = buildLinkFromInput(newLink.store_id, newLink.price_catalog)
        if (!pending) {
          toast.error('Tienes una tienda o precio sin completar en "Tiendas y Precios". Complétalo o bórralo antes de guardar.')
          setLoading(false)
          return
        }
        if (finalStoreLinks.some(l => l.store_id === pending.store_id)) {
          toast.error('La tienda que seleccionaste ya está en la lista de abajo.')
          setLoading(false)
          return
        }
        finalStoreLinks = [...finalStoreLinks, pending]
      }

      // Normalizar payload: enviar category=null si está vacío (en vez de "")
      const payload = {
        ...form,
        category: form.category || null,
        stock: tracksStock ? Number(stockForm.stock) || 0 : null,
        stock_min: tracksStock ? Number(stockForm.stock_min) || 0 : 0,
        units_per_purchase: tracksStock ? Number(stockForm.units_per_purchase) || 1 : 1,
      }
      let savedProduct
      if (isEdit) {
        const { data } = await api.put(`/products/${product.id}/`, payload)
        savedProduct = data
        toast.success('Producto actualizado')
      } else {
        const { data } = await api.post('/products/', payload)
        savedProduct = data
        toast.success('Producto creado')
      }

      const product_id = savedProduct.id

      if (removedLinks.length > 0)
        await Promise.all(removedLinks.map(id => api.delete(`/stores/product-store/${id}/`)))

      await Promise.all(finalStoreLinks.map(link => {
        if (!link.id) {
          return api.post('/stores/product-store/', {
            product_id,
            store_id: link.store_id,
            price_catalog: Number(link.price_catalog),
          })
        }
        const original = product?.product_stores?.find(ps => ps.id === link.id)
        if (original && Number(original.price_catalog) !== Number(link.price_catalog)) {
          return api.patch(`/stores/product-store/${link.id}/`, {
            price_catalog: Number(link.price_catalog),
          })
        }
        return Promise.resolve()
      }))

      apiCache.invalidate('/products/')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar producto')
    } finally {
      setLoading(false)
    }
  }

  const addLink = () => {
    const link = buildLinkFromInput(newLink.store_id, newLink.price_catalog)
    if (!link) return toast.error('Selecciona una tienda y un precio válido')
    if (storeLinks.some(l => l.store_id === link.store_id))
      return toast.error('Esta tienda ya está en la lista')
    setStoreLinks(prev => [...prev, link])
    setNewLink({ store_id: '', price_catalog: '' })
  }

  const removeLink = (index) => {
    const link = storeLinks[index]
    if (link.id) setRemovedLinks(prev => [...prev, link.id])
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-dark-200 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-600" />
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre del producto <span className="text-primary-500">*</span></label>
            <input
              autoFocus required
              name="name" type="text"
              value={form.name} onChange={handleChange}
              placeholder="Ej: Leche entera, Arroz, Jabón..."
              className="input"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-dark-500" />
              Categoría
              <span className="text-dark-400 font-normal text-[10px] ml-1">(opcional, para agrupar por pasillo)</span>
            </label>
            <select name="category" value={form.category} onChange={handleChange} className="input">
              <option value="">— Sin categoría —</option>
              {PRODUCT_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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
                required name="frequency_start_date" type="date"
                value={form.frequency_start_date} onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          {/* Inventario. Apagado, el producto entra en las listas por
              calendario, como siempre. Encendido, manda lo que haya en casa. */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setTracksStock(v => !v)}
              className="flex items-center gap-2 text-left w-full"
            >
              <span className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${tracksStock ? 'bg-primary-600' : 'bg-dark-700'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${tracksStock ? 'left-4' : 'left-0.5'}`} />
              </span>
              <span className="label mb-0 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> Llevar inventario
              </span>
            </button>

            {tracksStock ? (
              <>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="label">Tengo</label>
                    <input
                      name="stock" type="number" min="0" step="1"
                      value={stockForm.stock} onChange={handleStockChange}
                      className="input" />
                  </div>
                  <div>
                    <label className="label">Reponer en</label>
                    <input
                      name="stock_min" type="number" min="0" step="1"
                      value={stockForm.stock_min} onChange={handleStockChange}
                      className="input" />
                  </div>
                  <div>
                    <label className="label">Trae por compra</label>
                    <input
                      name="units_per_purchase" type="number" min="1" step="1"
                      value={stockForm.units_per_purchase} onChange={handleStockChange}
                      className="input" />
                  </div>
                </div>
                <p className="text-[11px] text-dark-500 mt-2 leading-relaxed">
                  Se cuenta en lo que consumes, no en lo que compras: si un pollo
                  da 8 presas, pon 8 en «trae por compra» y lleva la cuenta en
                  presas. Entra en la lista al llegar a «reponer en», sin esperar
                  a la fecha, y se salta mientras quede algo.
                </p>
              </>
            ) : (
              <p className="text-[11px] text-dark-500 mt-2 leading-relaxed">
                Sin inventario, este producto entra en las listas según su
                frecuencia y fecha de inicio.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="label flex items-center gap-2 mb-0">
                <Link2 className="w-3.5 h-3.5" /> Tiendas y Precios
              </label>
              <button
                type="button"
                onClick={() => { setCreatingStore(v => !v); setNewStoreName('') }}
                className="flex items-center gap-1 text-[11px] text-dark-500 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-3 h-3" /> Nueva tienda
              </button>
            </div>

            {creatingStore && (
              <div className="flex gap-2 items-center bg-dark-950/50 border border-primary-500/50 rounded-lg px-3 py-2 ring-1 ring-primary-500/20">
                <Store className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                <input
                  autoFocus type="text"
                  value={newStoreName} onChange={e => setNewStoreName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleCreateStore() }
                    if (e.key === 'Escape') setCreatingStore(false)
                  }}
                  placeholder="Nombre de la tienda..."
                  className="flex-1 bg-transparent text-sm text-dark-100 placeholder-dark-600 focus:outline-none focus:ring-0"
                />
                <button type="button" onClick={handleCreateStore} disabled={savingStore || !newStoreName.trim()} className="text-primary-600 hover:text-primary-500 disabled:opacity-40 transition-colors">
                  {savingStore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => setCreatingStore(false)} className="text-dark-400 hover:text-dark-200 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {localStores.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 p-3 text-xs text-fuchsia-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Crea al menos una tienda para poder vincularla.
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {storeLinks.map((link, i) => (
                    <div key={i} className="flex items-center justify-between bg-dark-800 rounded-lg px-3 py-2 text-sm border border-dark-700/50">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-fuchsia-600" />
                        <span className="text-dark-200 truncate max-w-[150px]">{link.store?.name || link.store_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-400 text-[10px]">$</span>
                          <input
                            type="number" value={link.price_catalog}
                            onChange={e => handleUpdatePrice(i, e.target.value)}
                            className="bg-dark-900 border border-dark-700 rounded px-5 py-1 w-24 text-right text-xs font-mono text-dark-100 focus:outline-none focus:border-primary-500 transition-colors"
                          />
                        </div>
                        <button type="button" onClick={() => removeLink(i)} className="text-dark-500 hover:text-red-600 p-1">
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
                    {localStores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input
                    type="number" min="0" step="50"
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
