import { get, set } from 'idb-keyval'

const QUEUE_KEY = 'compraya:mutationQueue:v1'

// Suscriptores que reciben el tamaño actual de la cola
const listeners = new Set()
let processing = false

const notify = (size) => listeners.forEach((fn) => {
  try { fn(size) } catch { /* ignore listener errors */ }
})

export async function getQueue() {
  return (await get(QUEUE_KEY)) || []
}

export async function getQueueSize() {
  return (await getQueue()).length
}

export async function enqueueMutation(mutation) {
  const queue = await getQueue()
  const item = {
    id: mutation.id || (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
    method: mutation.method,
    url: mutation.url,
    body: mutation.body,
    createdAt: Date.now(),
  }
  queue.push(item)
  await set(QUEUE_KEY, queue)
  notify(queue.length)
  return item
}

/**
 * Procesa toda la cola contra el backend.
 * @param {import('axios').AxiosInstance} api - instancia axios autenticada
 * @param {(msg: string) => void} [onDiscard] - callback opcional cuando una mutación se descarta por 4xx
 * @returns {Promise<{ processed: number, discarded: number, remaining: number }>}
 */
export async function processQueue(api, onDiscard) {
  if (processing) return { processed: 0, discarded: 0, remaining: -1 } // -1 = skip
  processing = true
  try {
    const snapshot = await getQueue()
    if (!snapshot.length) {
      notify(0)
      return { processed: 0, discarded: 0, remaining: 0 }
    }

    let processed = 0, discarded = 0
    const survived = []         // mutaciones del snapshot que NO consiguieron aplicarse
    const handledIds = new Set()  // IDs procesados (OK o descartados) del snapshot
    for (const m of snapshot) {
      try {
        await api.request({
          method: m.method,
          url: m.url,
          data: m.body,
          _skipOfflineQueue: true,
        })
        processed++
        handledIds.add(m.id)
      } catch (err) {
        const status = err?.response?.status
        if (status && status >= 400 && status < 500) {
          discarded++
          handledIds.add(m.id)
          if (onDiscard) {
            const detail = err.response?.data?.detail || 'cambio descartado'
            onDiscard(`${m.method.toUpperCase()} ${m.url}: ${detail}`)
          }
          continue
        }
        // 5xx, timeout, network error → mantener para próximo intento
        console.warn('[offlineQueue] retry pending:', m.method, m.url, err?.message || status)
        survived.push(m)
      }
    }

    // Race-safe: releer la cola actual y filtrar lo procesado; preserva mutaciones
    // que se encolaron DURANTE el drain.
    const currentQueue = await getQueue()
    const newOnes = currentQueue.filter(q => !handledIds.has(q.id) && !survived.some(s => s.id === q.id))
    const finalQueue = [...survived, ...newOnes]
    await set(QUEUE_KEY, finalQueue)
    notify(finalQueue.length)
    console.info(`[offlineQueue] drain: ${processed} ok, ${discarded} descartados, ${finalQueue.length} pendientes`)

    // Notificar a la app que el drain terminó, para que componentes refresquen
    // su estado si tenían cambios optimistas que fueron descartados.
    if (typeof window !== 'undefined' && (processed > 0 || discarded > 0)) {
      window.dispatchEvent(new CustomEvent('cy-queue-drained', {
        detail: { processed, discarded, remaining: finalQueue.length },
      }))
    }

    return { processed, discarded, remaining: finalQueue.length }
  } finally {
    processing = false
  }
}

export function observeQueue(callback) {
  listeners.add(callback)
  getQueueSize().then((size) => {
    try { callback(size) } catch { /* ignore */ }
  })
  return () => listeners.delete(callback)
}
