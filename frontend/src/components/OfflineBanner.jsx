import { useEffect, useRef, useState } from 'react'
import { WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { observeQueue, processQueue } from '../api/offlineQueue'

const RETRY_INTERVAL_MS = 30 * 1000 // 30s entre reintentos automáticos cuando hay pendientes

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const retryingRef = useRef(false)

  // `flush` se mantiene estable: usa ref para el guard de concurrencia y no depende
  // del state `retrying` (que solo se usa para mostrar el spinner del botón).
  const flushRef = useRef()
  flushRef.current = async () => {
    if (retryingRef.current) return
    retryingRef.current = true
    setRetrying(true)
    try {
      await processQueue(api, (msg) => toast.error(`1 cambio descartado: ${msg}`))
    } finally {
      retryingRef.current = false
      setRetrying(false)
    }
  }
  const flush = () => flushRef.current?.()

  useEffect(() => {
    const onOnline = () => { setOnline(true); flush() }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const unsub = observeQueue(setPending)

    // Drenar al montar si ya hay conexión
    if (navigator.onLine) flush()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsub()
    }
  }, [])

  // Retry automático mientras haya pendientes y estemos online
  useEffect(() => {
    if (!online || pending === 0) return
    const t = setInterval(() => { flush() }, RETRY_INTERVAL_MS)
    return () => clearInterval(t)
  }, [online, pending])

  if (online && pending === 0) return null

  const colorCls = online
    ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30'
    : 'bg-red-500/15 text-red-300 border-red-500/30'

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium border-b ${colorCls}`}>
      {online ? <CloudOff className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {!online && <span>Sin conexión</span>}
      {!online && pending > 0 && <span className="opacity-50">·</span>}
      {pending > 0 && (
        <span>
          {pending} cambio{pending > 1 ? 's' : ''} pendiente{pending > 1 ? 's' : ''}
        </span>
      )}
      {online && pending > 0 && (
        <button
          onClick={flush}
          disabled={retrying}
          className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/30 transition-colors disabled:opacity-50"
        >
          {retrying
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RefreshCw className="w-3 h-3" />}
          Reintentar
        </button>
      )}
    </div>
  )
}
