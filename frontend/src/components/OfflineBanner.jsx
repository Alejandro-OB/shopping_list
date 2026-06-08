import { useEffect, useState, useCallback } from 'react'
import { WifiOff, CloudOff, RefreshCw, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { observeQueue, processQueue } from '../api/offlineQueue'

const RETRY_INTERVAL_MS = 30 * 1000 // 30s entre reintentos automáticos cuando hay pendientes

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [retrying, setRetrying] = useState(false)

  const flush = useCallback(async () => {
    if (retrying) return
    setRetrying(true)
    try {
      await processQueue(api, (msg) => toast.error(`1 cambio descartado: ${msg}`))
    } finally {
      setRetrying(false)
    }
  }, [retrying])

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
    // flush no se mete en deps a propósito — solo queremos un setup al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Retry automático mientras haya pendientes y estemos online
  useEffect(() => {
    if (!online || pending === 0) return
    const t = setInterval(() => { flush() }, RETRY_INTERVAL_MS)
    return () => clearInterval(t)
  }, [online, pending, flush])

  if (online && pending === 0) return null

  const colorCls = online
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
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
          className="ml-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
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
