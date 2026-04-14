import { useEffect, useState } from 'react'
import { 
  BarChart3, TrendingUp, TrendingDown, Wallet, Calendar, 
  Package, ShoppingCart, Loader2, AlertCircle, RefreshCw,
  Search, ChevronLeft, ChevronRight
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function Metrics() {
  const [summary, setSummary] = useState(null)
  const [mostBought, setMostBought] = useState([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  
  // Para la consulta mensual
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [monthlyDetail, setMonthlyDetail] = useState(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const fetchData = async (isRefetch = false) => {
    if (isRefetch) setRefetching(true)
    else setLoading(true)
    
    try {
      const [summaryRes, mostBoughtRes] = await Promise.all([
        api.get('/metrics/summary/'),
        api.get('/metrics/most-bought/?limit=5')
      ])
      
      setSummary(summaryRes.data)
      setMostBought(mostBoughtRes.data)
      
      // Si aún no tenemos el detalle mensual, lo buscamos
      if (!monthlyDetail) {
        fetchMonthlySpending(selectedYear, selectedMonth)
      }
    } catch (err) {
      toast.error('Error al cargar las métricas')
      console.error(err)
    } finally {
      setLoading(false)
      setRefetching(false)
    }
  }

  const fetchMonthlySpending = async (year, month) => {
    setMonthlyLoading(true)
    try {
      const res = await api.get(`/metrics/monthly/?year=${year}&month=${month}`)
      setMonthlyDetail(res.data)
    } catch (err) {
      console.error('Error al cargar gasto mensual:', err)
    } finally {
      setMonthlyLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleMonthChange = (direction) => {
    let nextMonth = selectedMonth + direction
    let nextYear = selectedYear

    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    } else if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    }

    setSelectedYear(nextYear)
    setSelectedMonth(nextMonth)
    fetchMonthlySpending(nextYear, nextMonth)
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(val || 0)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-dark-400">Analizando tus finanzas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-400" /> 
            Estadísticas de Compra
          </h1>
          <p className="text-dark-400 text-sm">Monitorea tus gastos y presupuesto proyectado.</p>
        </div>
        <button 
          onClick={() => fetchData(true)}
          className={`btn-ghost p-2 rounded-full transition-all ${refetching ? 'animate-spin' : ''}`}
          title="Actualizar datos"
          disabled={refetching}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Mes Actual */}
        <div className="card relative overflow-hidden group hover:border-emerald-500/30 transition-all p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-dark-400 text-sm font-medium">Gasto Mes Actual</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(summary?.current_month_real_spending)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400/80">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>En base a listas completadas</span>
          </div>
          {/* Background decoration */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
        </div>

        {/* Semana Actual */}
        <div className="card relative overflow-hidden group hover:border-blue-500/30 transition-all p-6 text-white border-blue-500/10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-dark-400 text-sm font-medium">Gasto Semana Actual</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(summary?.current_week_real_spending)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-400/80">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Actualizado en tiempo real</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
        </div>

        {/* Proyección Semanal */}
        <div className="card relative overflow-hidden group hover:border-primary-500/30 transition-all p-6 border-primary-500/10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-dark-400 text-sm font-medium">Presupuesto Próx. Semana</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(summary?.next_week_estimated_budget)}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-primary-400/80">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Estimación por frecuencia de productos</span>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl group-hover:bg-primary-500/10 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Historial de Gasto por Mes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" /> 
              Consultar Gasto Historico
            </h2>
          </div>
          
          <div className="card p-6 min-h-[300px] flex flex-col justify-between">
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => handleMonthChange(-1)} className="btn-ghost p-2 rounded-full hover:bg-dark-800">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center min-w-[150px]">
                <p className="text-primary-400 font-bold text-xl">{MONTHS[selectedMonth - 1]}</p>
                <p className="text-dark-500 text-sm font-medium">{selectedYear}</p>
              </div>
              <button onClick={() => handleMonthChange(1)} className="btn-ghost p-2 rounded-full hover:bg-dark-800">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex flex-col items-center justify-center flex-1 py-4">
              {monthlyLoading ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              ) : monthlyDetail?.total > 0 ? (
                <div className="text-center animate-scale-in">
                  <p className="text-dark-500 text-sm mb-1 uppercase tracking-widest font-semibold">Total gastado</p>
                  <p className="text-4xl md:text-5xl font-black text-white">{formatCurrency(monthlyDetail.total)}</p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="h-2 w-32 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 opacity-50">
                  <AlertCircle className="w-12 h-12 text-dark-600 mx-auto" />
                  <p className="text-dark-400">Sin compras registradas en este mes</p>
                </div>
              )}
            </div>
            
            <p className="text-xs text-dark-500 text-center mt-6">
              El reporte incluye únicamente productos marcados como "comprados" en listas finalizadas.
            </p>
          </div>
        </div>

        {/* Top Productos más comprados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" /> 
              Productos Más Comprados
            </h2>
            <span className="text-xs text-dark-500 uppercase tracking-widest font-bold">Top 5</span>
          </div>

          <div className="card p-0 overflow-hidden divide-y divide-dark-800">
            {mostBought.length > 0 ? mostBought.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between px-6 py-4 hover:bg-dark-800/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center font-bold text-dark-400 group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-colors">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-dark-100 group-hover:text-white transition-colors">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-dark-500">Unidades adquiridas</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary-400">{item.total_quantity}</span>
                  <div className="w-16 h-1.5 bg-dark-800 rounded-full overflow-hidden hidden sm:block">
                    <div 
                      className="h-full bg-primary-500" 
                      style={{ width: `${(item.total_quantity / mostBought[0].total_quantity) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-24 text-center space-y-3">
                <Package className="w-12 h-12 text-dark-700 mx-auto" />
                <p className="text-dark-500 text-sm">¡Comienza a comprar para ver estadísticas!</p>
              </div>
            )}
          </div>

          <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Dato curioso</p>
              <p className="text-xs text-dark-400 leading-relaxed">
                Tu producto "<strong>{mostBought[0]?.product_name || '...'}</strong>" es el favorito. 
                Optimizar su compra podría representar un ahorro significativo a largo plazo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
