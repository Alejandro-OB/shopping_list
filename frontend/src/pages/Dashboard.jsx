import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Package, Store, TrendingUp,
  Clock, Sparkles, Loader2,
  TrendingDown, Star, Calendar, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react'
import api from '../api/axios'
import { apiCache } from '../api/cache'
import { useAuth } from '../context/useAuth'
import toast from 'react-hot-toast'

const METRICS_TTL  = 2 * 60 * 1000  // 2 min — cambia al marcar ítems
const MONTHLY_TTL  = 5 * 60 * 1000  // 5 min — histórico, cambia menos

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function StatCard({ label, value, icon: Icon, color = 'purple', sub, onClick }) {
  const colorMap = {
    purple: 'bg-primary-100 text-primary-700',
    green:  'bg-emerald-100 text-emerald-700',
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
  }
  return (
    <div
      className={`card flex flex-col items-center text-center gap-2 p-3 sm:flex-row sm:items-start sm:text-left sm:gap-4 sm:p-5 hover:border-dark-700 transition-colors duration-200 ${onClick ? 'cursor-pointer hover:bg-dark-800/40' : ''}`}
      onClick={onClick}
    >
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-dark-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-dark-200 mt-0.5">
          {value ?? <span className="inline-block w-10 h-5 sm:w-12 sm:h-6 bg-dark-800 rounded animate-pulse" />}
        </p>
        {sub && <p className="text-xs text-dark-500 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  )
}

function RecentList({ list, onClick }) {
  const statusMap = {
    draft:     { label: 'Borrador',   cls: 'badge-yellow' },
    active:    { label: 'Activa',     cls: 'badge-purple' },
    completed: { label: 'Completada', cls: 'badge-green'  },
  }
  const s = statusMap[list.status] || { label: list.status, cls: 'badge-purple' }
  const date = new Date(list.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })

  return (
    <div
      className="flex items-center gap-3 py-3 border-b border-dark-800 last:border-0 cursor-pointer hover:bg-dark-800/40 rounded-lg px-2 -mx-2 transition-colors"
      onClick={onClick}
    >
      <ShoppingCart className="w-4 h-4 text-dark-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-200 truncate">{list.name}</p>
        <p className="text-xs text-dark-500">{date}</p>
      </div>
      <span className={s.cls}>{s.label}</span>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [lists, setLists]     = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mensual (historico)
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [monthlyDetail, setMonthlyDetail] = useState(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(val || 0)
  }

  const fetchMonthlySpending = async (year, month) => {
    const cacheKey = `/metrics/monthly/?year=${year}&month=${month}`
    const cached = apiCache.get(cacheKey)
    if (cached) { setMonthlyDetail(cached); return }

    setMonthlyLoading(true)
    try {
      const res = await api.get(`/metrics/monthly/?year=${year}&month=${month}`)
      apiCache.set(cacheKey, res.data, MONTHLY_TTL)
      setMonthlyDetail(res.data)
    } catch (err) {
      console.error('Error al cargar gasto mensual:', err)
    } finally {
      setMonthlyLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Métricas: caché de 2 min (cambia al marcar ítems como comprados)
        const cachedMetrics = apiCache.get('/metrics/summary/')
        // Listas recientes: reutiliza caché de ShoppingLists si existe
        const cachedLists = apiCache.get('/lists/')

        const requests = []
        if (!cachedMetrics) requests.push(api.get('/metrics/summary/').catch(() => ({ data: null })))
        if (!cachedLists)   requests.push(api.get('/lists/?limit=5').catch(() => ({ data: [] })))

        const results = await Promise.all(requests)
        let rIdx = 0

        let metricsData = cachedMetrics
        if (!cachedMetrics) {
          metricsData = results[rIdx++]?.data ?? null
          if (metricsData) apiCache.set('/metrics/summary/', metricsData, METRICS_TTL)
        }

        let listsData = cachedLists ? cachedLists.slice(0, 5) : null
        if (!cachedLists) {
          const raw = results[rIdx++]?.data ?? []
          listsData = Array.isArray(raw) ? raw.slice(0, 5) : []
          // No guardamos en /lists/ porque ese cache contiene todas las listas
        }

        setMetrics(metricsData)
        setLists(listsData ?? [])

        fetchMonthlySpending(selectedYear, selectedMonth)
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleGenerateLists = async () => {
    setGenLoading(true)
    try {
      const { data } = await api.post('/system/generate-lists/')
      toast.success(
        `Generación completada: ${data.data.lists_created} lista(s) creadas, ${data.data.items_added} ítem(s) añadidas`
      )
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al generar listas'
      toast.error(msg)
    } finally {
      setGenLoading(false)
    }
  }

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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  
  const mostBoughtData = metrics?.most_bought || []

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-dark-400 text-sm">{greeting},</p>
          <h1 className="text-2xl font-bold text-dark-200 mt-0.5">
            {user?.name?.split(' ')[0] ?? 'Usuario'} 👋
          </h1>
        </div>
        {user?.is_admin && (
          <button
            onClick={handleGenerateLists}
            disabled={genLoading}
            className="btn-primary flex-shrink-0"
          >
            {genLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
              : <><Sparkles className="w-4 h-4" />Generar Listas Ahora</>
            }
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Listas"
          value={metrics?.total_lists ?? '—'}
          icon={ShoppingCart}
          color="purple"
          sub="Listas en historial"
          onClick={() => navigate('/lists')}
        />
        <StatCard
          label="Productos Activos"
          value={metrics?.total_products ?? '—'}
          icon={Package}
          color="blue"
          sub="En tu catálogo"
          onClick={() => navigate('/products')}
        />
        <StatCard
          label="Tiendas Registradas"
          value={metrics?.total_stores ?? '—'}
          icon={Store}
          color="amber"
          sub="Disponibles"
          onClick={() => navigate('/stores')}
        />
        <StatCard
          label="Gasto del Mes"
          value={metrics?.current_month_real_spending != null ? formatCurrency(metrics.current_month_real_spending) : '—'}
          icon={TrendingUp}
          color="green"
          sub="Basado en compras reales"
        />
      </div>

      {/* Layout 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLUMNA IZQUIERDA (Historial & Listas Recientes) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Historial de Gasto por Mes */}
          <div className="card min-h-[290px] flex flex-col justify-between p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark-200 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> 
                Historial de Gastos
              </h2>
            </div>
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => handleMonthChange(-1)} className="btn-ghost p-2 rounded-full hover:bg-dark-800">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center min-w-[150px]">
                <p className="text-primary-600 font-bold text-xl">{MONTHS[selectedMonth - 1]}</p>
                <p className="text-dark-500 text-sm font-medium">{selectedYear}</p>
              </div>
              <button onClick={() => handleMonthChange(1)} className="btn-ghost p-2 rounded-full hover:bg-dark-800">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="relative flex flex-col items-center justify-center flex-1 py-2">
              {monthlyLoading ? (
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              ) : monthlyDetail?.total > 0 ? (
                <div className="text-center animate-scale-in">
                  <p className="text-dark-500 text-sm mb-1 uppercase tracking-widest font-semibold">Total gastado</p>
                  <p className="text-4xl lg:text-5xl font-black text-dark-200">{formatCurrency(monthlyDetail.total)}</p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="h-2 w-32 bg-dark-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
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
          </div>
          
          {/* Recent lists */}
          <div className="card">
            <h2 className="text-sm font-semibold text-dark-200 flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary-600" />
              Listas Recientes
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-dark-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <div className="py-8 text-center opacity-70">
                <ShoppingCart className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                <p className="text-dark-500 text-sm">Aún no hay listas generadas.</p>
              </div>
            ) : (
              lists.map((l) => <RecentList key={l.id} list={l} onClick={() => navigate(`/lists/${l.id}`)} />)
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA (Top Productos & Presupuesto) */}
        <div className="space-y-6">
          
          {/* Top Productos más comprados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark-200 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" /> 
                Más Comprados
              </h2>
              <span className="text-xs text-dark-500 uppercase tracking-widest font-bold">Top</span>
            </div>

            <div className="card p-0 overflow-hidden divide-y divide-dark-800">
              {loading ? (
                <div className="p-4 space-y-3">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className="h-8 bg-dark-800 rounded animate-pulse" />
                   ))}
                </div>
              ) : mostBoughtData.length > 0 ? mostBoughtData.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between px-5 py-4 hover:bg-dark-800/30 transition-all group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center font-bold text-dark-400 flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-dark-100 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-dark-500">
                        Veces comprado
                        {item.total_quantity > item.times_bought && (
                          <span className="text-dark-600"> · {item.total_quantity} u.</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-bold text-primary-600">{item.times_bought}</span>
                    <div className="w-10 h-1.5 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500"
                        style={{ width: `${(item.times_bought / mostBoughtData[0].times_bought) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-16 text-center space-y-3 opacity-70">
                  <Package className="w-10 h-10 text-dark-700 mx-auto" />
                  <p className="text-dark-500 text-sm">Sin suficientes datos</p>
                </div>
              )}
            </div>
            
            {/* Dato curioso */}
            {mostBoughtData.length > 0 && (
              <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-dark-200 uppercase tracking-wider mb-1">Dato curioso</p>
                  <p className="text-xs text-dark-400 leading-relaxed">
                    Tu producto "<strong>{mostBoughtData[0]?.product_name}</strong>" es recurrente. Optimizar compras mayoristas de este ítem te ahorrará dinero.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-500" />
              Presupuesto Próxima Semana
            </h2>
            <p className="text-xs text-dark-400">
              Costo estimado basado en el próximo ciclo de productos automáticos.
            </p>
            <div className="pt-2 border-t border-dark-800 mt-2 flex justify-between items-center text-sm">
              <span className="text-dark-300">Total proyectado</span>
              <span className="text-primary-600 font-bold text-xl">
                {metrics?.next_week_estimated_budget != null ? formatCurrency(metrics.next_week_estimated_budget) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
