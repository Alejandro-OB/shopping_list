import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/')
      setUser(data)
    } catch (err) {
      // Solo limpiar storage si hubo respuesta y fue un error de auth.
      // Errores de red (sin response) o 5xx pueden ser transitorios — no destruir la sesión.
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        localStorage.clear()
      }
      setUser(null)
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

  // Cargar usuario al iniciar.
  // No usar timeout artificial: si la API tarda, esperamos. El interceptor de axios
  // ya refresca el token con /refresh/ ante 401 y, si todo falla, el catch en
  // fetchMe limpia el storage y desbloquea el flujo hacia /login.
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

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
