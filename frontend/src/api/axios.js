import axios from 'axios'

let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Auto-corrección para Mixed Content: Si estamos en HTTPS (producción) y la URL es HTTP, la forzamos a HTTPS
if (window.location.protocol === 'https:' && API_BASE_URL.startsWith('http://') && !API_BASE_URL.includes('localhost')) {
  API_BASE_URL = API_BASE_URL.replace('http://', 'https://')
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request Interceptor: adjuntar access token ──────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: renovar token en 401 ─────────────────────────────
let isRefreshing = false
let pendingRequests = []

const processQueue = (error, token = null) => {
  pendingRequests.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  pendingRequests = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // No intentar refrescar si el error ocurre en rutas de autenticación
    // o si el usuario ya está en la página de login
    const authPaths = ['/login', '/register', '/recover-password', '/reset-password']
    const isAuthPath = authPaths.some(path => originalRequest.url?.includes(path))
    const isAtLogin = window.location.pathname === '/login'

    if (isAuthPath || (error.response?.status === 401 && isAtLogin)) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refresh_token')

      if (!refreshToken) {
        isRefreshing = false
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/refresh/`, {
          refresh_token: refreshToken,
        })

        const { access_token, refresh_token: newRefreshToken } = response.data
        localStorage.setItem('access_token', access_token)
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken)
        }

        processQueue(null, access_token)
        originalRequest.headers.Authorization = `Bearer ${access_token}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
