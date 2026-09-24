import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, Loader2, AlertCircle,
  RefreshCw, Search, Minus,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

const formatCurrency = (val) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(val || 0)

// Mismo template de columnas para el header (hidden sm:grid) y cada PriceRow.
// Eran siete columnas dentro de un overflow-x-auto: en el teléfono la tabla
// aparecía ya corrida y la primera columna —el nombre del producto— quedaba
// fuera de la pantalla, de modo que se veían precios sin saber de qué eran.
const PRICE_GRID_COLS = 'sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_90px_90px_100px_90px_110px]'

// Sparkline SVG inline — sin dependencias
function Sparkline({ points, width = 96, height = 32 }) {
  if (points.length < 2) {
    return (
      <span className="text-xs text-dark-500 italic">—</span>
    )
  }

  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  const xs = prices.map((_, i) => (i / (prices.length - 1)) * width)
  const ys = prices.map((p) => height - ((p - min) / range) * (height - 4) - 2)

  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')

  const isUp   = prices[prices.length - 1] > prices[0]
  const isFlat = prices[prices.length - 1] === prices[0]
  const stroke = isFlat ? '#64748b' : isUp ? '#f87171' : '#34d399'

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={stroke} />
    </svg>
  )
}


export default function PriceEvolution() {
  const [evolutions, setEvolutions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [search, setSearch]         = useState('')

  const fetchData = async (isRefetch = false) => {
    if (isRefetch) setRefetching(true)
    else setLoading(true)
    try {
      const res = await api.get('/metrics/price-evolution/')
      setEvolutions(res.data)
    } catch (err) {
      toast.error('Error al cargar la evolución de precios')
      console.error(err)
    } finally {
      setLoading(false)
      setRefetching(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filtered = evolutions.filter(
    (e) =>
      e.product_name.toLowerCase().includes(search.toLowerCase()) ||
      e.store_name.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
        <p className="text-dark-400">Cargando evolución de precios...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-dark-200 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            Evolución de Precios
          </h1>
          <p className="text-dark-400 text-sm">
            Precio real pagado por producto y tienda en cada compra semanal.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className={`btn-ghost p-2 rounded-full transition-all ${refetching ? 'animate-spin' : ''}`}
          title="Actualizar"
          disabled={refetching}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {evolutions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="card p-0 overflow-hidden">

          {/* Buscador dentro de la card */}
          <div className="px-5 py-4 border-b border-dark-800">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Filtrar por producto o tienda…"
                className="input pl-9 w-full text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-dark-600 mx-auto" />
              <p className="text-dark-400 text-sm">
                Sin resultados para <strong className="text-dark-200">"{search}"</strong>
              </p>
            </div>
          ) : (
            <div className="text-sm">
              <div className={`hidden sm:grid ${PRICE_GRID_COLS} sm:items-center px-4 py-3 border-b border-dark-800 text-xs text-dark-500 uppercase tracking-wider`}>
                <span className="font-semibold">Producto</span>
                <span className="font-semibold">Tienda</span>
                <span className="font-semibold text-right">Mín</span>
                <span className="font-semibold text-right">Máx</span>
                <span className="font-semibold text-right">Último</span>
                <span className="font-semibold text-right">Var.</span>
                <span className="font-semibold">Tendencia</span>
              </div>
              {[...filtered]
                .sort((a, b) => a.store_name.localeCompare(b.store_name) || a.product_name.localeCompare(b.product_name))
                .map((item) => (
                  <PriceRow key={item.product_store_id} item={item} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PriceRow({ item }) {
  const prices  = item.points.map((p) => p.price)
  const first   = prices[0]
  const last    = prices[prices.length - 1]
  const diff    = last - first
  const pct     = first > 0 ? ((diff / first) * 100).toFixed(1) : '0.0'
  const isUp    = diff > 0
  const isFlat  = diff === 0

  const TrendIcon  = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
  const badgeClass = isFlat
    ? 'badge-blue'
    : isUp
      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
      : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'

  const variation = (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
      <TrendIcon className="w-3 h-3" />
      {isFlat ? '—' : `${isUp ? '+' : ''}${pct}%`}
    </span>
  )

  return (
    <div className={`grid grid-cols-1 ${PRICE_GRID_COLS} sm:items-center gap-y-2 sm:gap-y-0 px-4 py-3 border-b border-dark-800 last:border-0 hover:bg-dark-800/40 transition-colors group`}>
      {/* Grupo 1: producto (+ tienda y cifras inline en mobile) */}
      <div className="min-w-0">
        <p className="font-medium text-dark-100 group-hover:text-dark-200 transition-colors truncate">
          {item.product_name}
        </p>
        <p className="sm:hidden text-xs text-dark-400 mt-0.5 truncate">{item.store_name}</p>
        {/* Las cifras van en una línea propia en mobile: en columnas dejaban el
            nombre del producto —el dato que identifica la fila— fuera de la
            pantalla, con los precios visibles y sin saber de qué eran. */}
        <div className="sm:hidden flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
          <span className="text-dark-400">
            Mín <span className="text-teal-500 font-medium">{formatCurrency(Math.min(...prices))}</span>
          </span>
          <span className="text-dark-400">
            Máx <span className="text-red-400 font-medium">{formatCurrency(Math.max(...prices))}</span>
          </span>
          <span className="text-dark-400">
            Último <span className="text-dark-200 font-semibold">{formatCurrency(last)}</span>
          </span>
          {variation}
        </div>
      </div>

      {/* Tienda — solo desde sm: */}
      <span className="hidden sm:block text-xs text-dark-400 truncate">{item.store_name}</span>

      {/* Mín — solo desde sm: */}
      <span className="hidden sm:block text-right text-teal-500 font-medium text-xs">
        {formatCurrency(Math.min(...prices))}
      </span>

      {/* Máx — solo desde sm: */}
      <span className="hidden sm:block text-right text-red-400 font-medium text-xs">
        {formatCurrency(Math.max(...prices))}
      </span>

      {/* Último precio — solo desde sm: */}
      <span className="hidden sm:block text-right font-semibold text-dark-200">
        {formatCurrency(last)}
      </span>

      {/* Variación % — solo desde sm: */}
      <span className="hidden sm:block text-right">{variation}</span>

      {/* Tendencia: en mobile ocupa su propia línea a lo ancho */}
      <div className="flex justify-start">
        <Sparkline points={item.points} />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card py-24 text-center space-y-3">
      <TrendingUp className="w-14 h-14 text-dark-700 mx-auto" />
      <p className="text-dark-300 font-semibold">Aún no hay datos de evolución de precios</p>
      <p className="text-dark-500 text-sm max-w-xs mx-auto leading-relaxed">
        Marca productos como comprados en tus listas semanales para ver
        cómo evolucionan sus precios con el tiempo.
      </p>
    </div>
  )
}
