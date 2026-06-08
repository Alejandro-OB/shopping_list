import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { AuthContext } from './useAuth'

const USER_KEY = 'user'

// Lee el user persistido en localStorage (resistencia a cold start offline)
function readCachedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  // Inicializar desde cache para evitar flash de "Cargando sesión..." cuando ya hay user
  const [user, setUser]       = useState(() => readCachedUser())
  const [loading, setLoading] = useState(true)

  const persistUser = (data) => {
    if (data) localStorage.setItem(USER_KEY, JSON.stringify(data))
    else localStorage.removeItem(USER_KEY)
  }

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/')
      setUser(data)
      persistUser(data)
    } catch (err) {
      // Solo limpiar storage si fue un error de auth confirmado.
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        localStorage.clear()
        setUser(null)
      } else {
        // Sin response (red caída, cold start offline, 5xx): conservar la sesión cacheada.
        // Si hay user en localStorage, lo usamos como fallback — la app arranca igual,
        // las mutaciones se encolan y el refresh corre cuando vuelva la red.
        const cached = readCachedUser()
        if (cached) setUser(cached)
        else setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/login/', { email, password })

    localStorage.setItem('access_token', data.access_token)
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }
    await fetchMe()
    return data
  }, [fetchMe])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
  }, [])

  // Cargar usuario al iniciar. Si hay token, validar con la API; si no, marcar listo.
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe()
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}

