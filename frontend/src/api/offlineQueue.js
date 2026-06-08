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
 * Procesa toda la cola contra el backend. Se llama al volver `online`.
 * @param {import('axios').AxiosInstance} api - instancia axios autenticada
 * @param {(msg: string) => void} [onDiscard] - callback opcional cuando una mutación se descarta por 4xx
 */
export async function processQueue(api, onDiscard) {
  if (processing) return
  processing = true
  try {
    let queue = await getQueue()
    if (!queue.length) return

    const remaining = []
    for (const m of queue) {
      try {
        await api.request({
          method: m.method,
          url: m.url,
          data: m.body,
          // Flag para que el interceptor NO vuelva a encolar esta misma mutación
          _skipOfflineQueue: true,
        })
      } catch (err) {
        const status = err?.response?.status
        if (status && status >= 400 && status < 500) {
          // 4xx → conflicto persistente (lista completada, item eliminado, etc.) → descartar
          if (onDiscard) {
            const detail = err.response?.data?.detail || 'cambio descartado'
            onDiscard(`${m.method.toUpperCase()} ${m.url}: ${detail}`)
          }
          continue
        }
        // Otros errores (5xx o sin response) → mantener para próximo intento
        remaining.push(m)
      }
    }

    await set(QUEUE_KEY, remaining)
    notify(remaining.length)
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
