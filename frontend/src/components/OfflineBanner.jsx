import { useEffect, useState } from 'react'
import { WifiOff, CloudOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { observeQueue, processQueue } from '../api/offlineQueue'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const flush = () =>
      processQueue(api, (msg) => toast.error(`1 cambio descartado: ${msg}`))

    const onOnline = () => { setOnline(true); flush() }
    const onOffline = () => setOnline(false)

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const unsub = observeQueue(setPending)

    // Si ya estamos online al montar pero quedó algo en cola (refresh entre offline y online), drenar
    if (navigator.onLine) flush()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      unsub()
    }
  }, [])

  if (online && pending === 0) return null

  const colorCls = online
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-red-500/15 text-red-300 border-red-500/30'

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium border-b ${colorCls}`}>
      {online ? <CloudOff className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {!online && <span>Sin conexión</span>}
      {!online && pending > 0 && <span className="text-dark-500">·</span>}
      {pending > 0 && (
        <span>
          {pending} cambio{pending > 1 ? 's' : ''} pendiente{pending > 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
