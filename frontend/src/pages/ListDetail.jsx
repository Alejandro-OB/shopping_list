import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, ShoppingCart, Store, CheckCircle2, Check, X,
  Circle, AlertCircle, Loader2, Sparkles, Pencil, Save,
  TrendingDown, TrendingUp, Minus, Plus, Trash2, FileText, Download,
  FileSpreadsheet, MessageSquare, Search, Filter
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

function ItemRow({ item, onCheck, onDelete, onUpdateQuantity, isDisabled }) {
  const [price, setPrice] = useState(item.price_real || '')
  const [loading, setLoading] = useState(false)
  const [updatingQty, setUpdatingQty] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const diff = item.checked ? (item.price_catalog_snapshot - item.price_real) * item.quantity : 0
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
    } finally {
      setLoading(false)
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
              <Store className="w-3 h-3 text-dark-500" />
              <span className="text-xs text-dark-500">{item.store_name}</span>
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  disabled={isDisabled || item.checked || updatingQty || item.quantity <= 1}
                  className="w-5 h-5 rounded bg-dark-800 text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[10px] bg-dark-800 text-dark-100 px-1.5 py-0.5 rounded font-bold min-w-[20px] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  disabled={isDisabled || item.checked || updatingQty}
                  className="w-5 h-5 rounded bg-dark-800 text-dark-400 hover:text-primary-400 hover:bg-dark-700 transition-colors disabled:opacity-30 flex items-center justify-center"
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
        <p className="text-sm text-dark-300">${item.price_catalog_snapshot.toLocaleString('es-CO')}</p>
        <p className="text-[10px] text-dark-600 mt-1 font-medium">
          Subtotal: ${(item.price_catalog_snapshot * item.quantity).toLocaleString('es-CO')}
        </p>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col items-end">
          <label className="text-[10px] text-dark-500 uppercase font-bold mb-1">Precio Real</label>
          <div className="relative max-w-[100px]">
             <span className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-500 text-sm">$</span>
             <input
               type="number"
               value={price}
               onChange={(e) => setPrice(e.target.value)}
               disabled={isDisabled || item.checked}
               placeholder="0"
               className="input pl-5 py-1.5 text-right text-sm"
             />
          </div>
          {price > 0 && (
            <div className={`mt-1 text-[10px] font-bold ${item.checked ? 'text-dark-500' : 'text-primary-400'}`}>
              Subtotal: ${ (parseFloat(price) * item.quantity).toLocaleString('es-CO') }
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        {item.checked ? (
          <div className="flex flex-col items-end">
            <p className="text-[10px] text-dark-500 uppercase font-bold mb-0.5">Ahorro</p>
            <div className={`flex items-center gap-1 text-sm font-bold ${isSaving ? 'text-emerald-400' : isExpensive ? 'text-red-400' : 'text-dark-400'}`}>
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
                    className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
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
                  className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [updatingName, setUpdatingName] = useState(false)
  
  const [isEditingDate, setIsEditingDate] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [updatingDate, setUpdatingDate] = useState(false)

  const [exporting, setExporting] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStore, setSelectedStore] = useState('all')

  useEffect(() => {
    fetchList()
  }, [id])

  const fetchList = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/lists/${id}`)
      // El backend no garantiza el orden, así que ordenamos por tienda en el frontend
      if (data.items) {
        data.items.sort((a, b) => a.store_name.localeCompare(b.store_name))
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
    try {
      await api.patch(`/lists/items/${itemId}/check`, {
        price_real: priceReal,
        checked: true
      })
      toast.success('¡Producto comprado!')
      fetchList() // Recargar para ver el cambio
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al actualizar ítem'
      toast.error(msg)
    }
  }

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/lists/items/${itemId}`)
      toast.success('Producto eliminado de la lista')
      fetchList()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar ítem')
    }
  }

  const handleUpdateQuantity = async (itemId, delta) => {
    const item = list.items.find(i => i.id === itemId)
    if (!item) return

    const newQty = Math.max(1, item.quantity + delta)
    if (newQty === item.quantity) return

    try {
      await api.patch(`/lists/items/${itemId}`, { quantity: newQty })
      setList(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i)
      }))
    } catch (err) {
      toast.error('No se pudo actualizar la cantidad')
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await api.post(`/lists/${id}/complete`)
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
      await api.patch(`/lists/${id}`, { name: newName.trim() })
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
      await api.patch(`/lists/${id}`, { date: newDate })
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
      const response = await api.get(`/lists/${id}/export`, {
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
      const response = await api.get(`/lists/${id}/export-excel`, {
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
    
    // Agrupar por tienda para el mensaje
    const itemsByStore = list.items.reduce((acc, item) => {
      if (!acc[item.store_name]) acc[item.store_name] = []
      acc[item.store_name].push(item)
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

    const totalE = list.items.reduce((acc, curr) => acc + (curr.price_catalog_snapshot * curr.quantity), 0)
    const totalR = list.items.reduce((acc, curr) => curr.checked ? acc + (curr.price_real * curr.quantity) : acc, 0)

    message += `💰 *Total Estimado:* $${totalE.toLocaleString('es-CO')}\n`
    if (totalR > 0) {
      message += `💸 *Total Pagado:* $${totalR.toLocaleString('es-CO')}\n`
    }
    
    message += `\n_Enviado desde ShopList Pro_ 🚀`

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

  const itemsBought = list.items.filter(i => i.checked).length
  const totalItems = list.items.length
  const progress = (itemsBought / totalItems) * 100
  
  const totalProjected = list.items.reduce((acc, curr) => {
    return acc + (curr.price_catalog_snapshot * curr.quantity)
  }, 0)

  const totalReal = list.items.reduce((acc, curr) => {
    if (!curr.checked) return acc
    return acc + (curr.price_real * curr.quantity)
  }, 0)

  const totalSaved = list.items.reduce((acc, curr) => {
    if (!curr.checked) return acc
    return acc + ((curr.price_catalog_snapshot - curr.price_real) * curr.quantity)
  }, 0)

  const isCompleted = list.status === 'completed'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/lists')}
          className="btn-ghost w-fit -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a listas
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2"
            title="Exportar a PDF"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="btn-secondary flex items-center gap-2 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400"
            title="Exportar a Excel"
          >
            {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span className="hidden sm:inline">Excel</span>
          </button>
          
          <button
            onClick={handleShareWhatsApp}
            className="btn-secondary flex items-center gap-2 border-green-500/30 hover:border-green-500/50 hover:bg-green-500/5 text-green-400"
            title="Compartir por WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          {!isCompleted && (
            <div className="relative">
              {showConfirm ? (
                <div className="flex items-center gap-2 bg-dark-800/80 border border-dark-700 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="text-xs text-dark-400 mr-1">¿Finalizar?</span>
                  <button
                    onClick={() => setShowConfirm(false)}
                    title="Cancelar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    title="Confirmar"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
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
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-600/10 text-primary-400'}`}>
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
                  <h1 className="text-xl font-bold text-white leading-tight">{list.name}</h1>
                  {!isCompleted && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-dark-500 hover:text-primary-400 transition-colors p-1"
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
                      className="input py-0.5 px-2 text-[10px] w-auto bg-dark-900 border-primary-500/50 focus:border-primary-500 text-white h-7"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateDate()
                        if (e.key === 'Escape') setIsEditingDate(false)
                      }}
                    />
                    <button 
                      onClick={handleUpdateDate} 
                      disabled={updatingDate}
                      className="text-primary-400 hover:text-primary-300 transition-colors"
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
                        className="ml-1 text-dark-500 hover:text-primary-400 transition-colors p-1"
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
            <div className="text-right">
              <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Progreso</p>
              <p className="text-lg font-bold text-white">{itemsBought} / {totalItems}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Valor Estimado</p>
              <p className="text-lg font-bold text-primary-400/50">${totalProjected.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-0.5">Total Pagado</p>
              <p className="text-lg font-bold text-emerald-400 font-mono tracking-tight">${totalReal.toLocaleString('es-CO')}</p>
            </div>
            <div className="text-right">
               <p className="text-[10px] text-dark-500 uppercase font-bold tracking-wider mb-0.5">Ahorro Total</p>
               <p className={`text-lg font-bold ${totalSaved >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                 ${totalSaved.toLocaleString('es-CO')}
               </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning for completed list */}
      {isCompleted && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white">¡Compra Finalizada!</p>
            <p className="text-xs text-emerald-400/80 mt-0.5">Los precios reales han sido registrados en tu historial para futuras sugerencias.</p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* Search Bar */}
        <div className="relative group flex-1 w-full sm:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-dark-500 group-focus-within:text-primary-400 transition-colors">
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
              className="absolute inset-y-0 right-3 flex items-center text-dark-500 hover:text-white"
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
            {Array.from(new Set(list.items.map(i => i.store_name))).sort().map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-dark-500">
            <Filter className="w-4 h-4" />
          </div>
        </div>
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
                                 className="text-xs text-primary-400 hover:text-primary-300 underline font-medium pt-2"
                               >
                                 Limpiar todos los filtros
                               </button>
                             )}
                           </div>
                         </td>
                       </tr>
                     );
                   }

                   return filteredItems.map(item => (
                     <ItemRow 
                       key={item.id} 
                       item={item} 
                       onCheck={handleCheckItem}
                       onDelete={handleDeleteItem}
                       onUpdateQuantity={handleUpdateQuantity}
                       isDisabled={isCompleted}
                     />
                   ));
                 })()
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
