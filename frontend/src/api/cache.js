const store = new Map()
const DEFAULT_TTL = 30 * 60 * 1000 // 30 minutos

export const apiCache = {
  get(key) {
    const entry = store.get(key)
    if (!entry) return null
    if (Date.now() - entry.ts > entry.ttl) {
      store.delete(key)
      return null
    }
    return entry.data
  },

  set(key, data, ttl = DEFAULT_TTL) {
    store.set(key, { data, ts: Date.now(), ttl })
  },

  invalidate(...keys) {
    keys.forEach(k => store.delete(k))
  },
}
